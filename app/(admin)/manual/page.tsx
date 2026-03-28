"use client";

import { FormEvent, useState } from "react";
import {
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { runRiskEngine } from "@/app/components/rules-engine";
import { usePlayers } from "@/app/components/players-context";
import { RestrictionType, useRules } from "@/app/components/rules-context";

const verificationOptions: VerificationType[] = [
  "ID",
  "Selfie",
  "Proof",
  "Full KYC",
];

const restrictionOptions: RestrictionType[] = [
  "Withdrawal Block",
  "Deposit Block",
  "Casino Block",
  "Full Account Block",
];

const flagOptions = [
  "High Bet Amount",
  "Live Bet Risk",
  "High Odds Risk",
  "Bet Velocity",
];

export default function ManualTriggerPage() {
  const { rules } = useRules();
  const { addAuditLog, addCase } = useKycCases();
  const { applyTriggerToPlayer } = usePlayers();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<"KYC" | "Restriction" | "Flag">("KYC");
  const [verificationRequired, setVerificationRequired] = useState<
    VerificationType[]
  >([]);
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [deviceCount, setDeviceCount] = useState("1");
  const [ipCountry, setIpCountry] = useState("US");
  const [accountCountry, setAccountCountry] = useState("US");
  const [betCountLastMinute, setBetCountLastMinute] = useState("0");
  const [bonusesUsed, setBonusesUsed] = useState("0");
  const [betAmount, setBetAmount] = useState("0");
  const [odds, setOdds] = useState("1");
  const [successMessage, setSuccessMessage] = useState("");

  const buildUnifiedInput = (timestamp?: number) => {
    const now = timestamp ?? 0;
    const normalizedDepositAmount = Number(depositAmount || 0);
    const normalizedWithdrawalAmount = Number(withdrawalAmount || 0);
    const normalizedDeviceCount = Number(deviceCount || 1);
    const normalizedBetCountLastMinute = Number(betCountLastMinute || 0);
    const normalizedBonusesUsed = Number(bonusesUsed || 0);
    const normalizedBetAmount = Number(betAmount || 0);
    const normalizedOdds = Number(odds || 1);

    return {
      Transaction: {
        depositAmount: normalizedDepositAmount,
        withdrawalAmount: normalizedWithdrawalAmount,
        totalDeposits: normalizedDepositAmount,
        depositCount: normalizedDepositAmount > 0 ? 1 : 0,
        withdrawalCount: normalizedWithdrawalAmount > 0 ? 1 : 0,
      },
      Player: {
        deviceCount: normalizedDeviceCount,
        ipCountry: ipCountry.trim() || "US",
        accountCountry: accountCountry.trim() || "US",
        country: accountCountry.trim() || "US",
        kycLevel: "L0",
      },
      Behavior: {
        bonusesUsed: normalizedBonusesUsed,
        betCountLastMinute: normalizedBetCountLastMinute,
        lastDepositTimestamp: now,
        lastBetTimestamp: now,
        betAmount: normalizedBetAmount,
        odds: normalizedOdds,
        flags: flags,
      },
    };
  };
  const manualInput = buildUnifiedInput();
  const manualResult = runRiskEngine({
    input: manualInput,
    rules,
  });

  const toggleVerification = (value: VerificationType) => {
    setVerificationRequired((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleRestriction = (value: RestrictionType) => {
    setRestrictions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleFlag = (value: string) => {
    setFlags((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason.trim()) {
      setSuccessMessage("Reason is required.");
      return;
    }

    const normalizedUserId = userId.trim() || `MANUAL-${crypto.randomUUID()}`;
    const normalizedUsername = username.trim() || "manual_user";
    const input = buildUnifiedInput(Date.now());
    const result = runRiskEngine({ input, rules });

    const computedRiskScore = Number.isFinite(result.riskScore)
      ? result.riskScore
      : Math.min(
          100,
          (result.triggeredRules?.length || 0) * 15 +
            (result.detectedFraudSignals?.length || 0) * 20
        );

    console.log("MANUAL DEBUG", {
      engineRiskScore: result.riskScore,
      computedRiskScore,
      triggeredRules: result.triggeredRules,
      fraudSignals: result.detectedFraudSignals,
    });

    const fraudFlags = result.detectedFraudSignals?.length
      ? result.detectedFraudSignals
      : [...flags];

    const finalFlags = result.flags?.length ? [...result.flags] : [...flags];

    const finalVerifications = result.aggregatedActions?.verifications?.length
      ? (result.aggregatedActions.verifications as VerificationType[])
      : verificationRequired;

    const finalRestrictions = result.aggregatedActions?.restrictions?.length
      ? (result.aggregatedActions.restrictions as RestrictionType[])
      : restrictions;

    applyTriggerToPlayer({
      id: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: finalVerifications,
      restrictions: finalRestrictions,
      flags: finalFlags,
      playerSnapshot: {
        deviceCount: input.Player.deviceCount,
        ipCountry: input.Player.ipCountry,
        accountCountry: input.Player.accountCountry,
        totalDeposits: input.Transaction.totalDeposits,
        depositCount: input.Transaction.depositCount,
        withdrawalCount: input.Transaction.withdrawalCount,
        lastDepositTimestamp: input.Behavior.lastDepositTimestamp,
        lastBetTimestamp: input.Behavior.lastBetTimestamp,
        betCountLastMinute: input.Behavior.betCountLastMinute,
        bonusesUsed: input.Behavior.bonusesUsed,
      },
    });

    const caseId = addCase({
      userId: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: finalVerifications,
      kycLevel: result.finalDecision.kycLevel,
      restrictions: finalRestrictions,
      flags: finalFlags,
      triggeredRules: [...(result.triggeredRules || [])],
      fraudFlags: [...fraudFlags],
      riskScore: computedRiskScore,
      finalDecision: {
        ...result.finalDecision,
        riskScore: computedRiskScore,
      },
      source: "manual",
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
      status: "Pending",
    });
    addAuditLog({
      caseId,
      userId: normalizedUserId,
      type: "manual_trigger",
      description: "Manual action applied",
      metadata: { reason: reason.trim() },
    });

    setSuccessMessage("Manual trigger resolved, audited, and one case created.");

    setUserId("");
    setUsername("");
    setReason("");
    setActionType("KYC");
    setVerificationRequired([]);
    setRestrictions([]);
    setFlags([]);
    setDepositAmount("");
    setWithdrawalAmount("");
    setDeviceCount("1");
    setIpCountry("US");
    setAccountCountry("US");
    setBetCountLastMinute("0");
    setBonusesUsed("0");
    setBetAmount("0");
    setOdds("1");
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Manual KYC Trigger</h3>
      <p className="mt-1 text-sm text-slate-600">
        Manually create a pending KYC case with required verification and
        restrictions.
      </p>

      <form className="mt-5 space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="userId" className="text-sm font-medium text-slate-700">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="e.g. USR-2040"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="username"
              className="text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. player_one"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="reason" className="text-sm font-medium text-slate-700">
            Reason *
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={3}
            placeholder="Why is this manual trigger needed?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Risk Input Data
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">depositAmount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">withdrawalAmount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawalAmount}
                onChange={(event) => setWithdrawalAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">deviceCount</label>
              <input
                type="number"
                min="1"
                step="1"
                value={deviceCount}
                onChange={(event) => setDeviceCount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">ipCountry</label>
              <input
                type="text"
                value={ipCountry}
                onChange={(event) => setIpCountry(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">accountCountry</label>
              <input
                type="text"
                value={accountCountry}
                onChange={(event) => setAccountCountry(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">betCountLastMinute</label>
              <input
                type="number"
                min="0"
                step="1"
                value={betCountLastMinute}
                onChange={(event) => setBetCountLastMinute(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">bonusesUsed</label>
              <input
                type="number"
                min="0"
                step="1"
                value={bonusesUsed}
                onChange={(event) => setBonusesUsed(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">betAmount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={betAmount}
                onChange={(event) => setBetAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">odds</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={odds}
                onChange={(event) => setOdds(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
          </div>
        </section>

        <div className="space-y-1">
          <label htmlFor="actionType" className="text-sm font-medium text-slate-700">
            Action Type
          </label>
          <select
            id="actionType"
            value={actionType}
            onChange={(event) =>
              setActionType(event.target.value as "KYC" | "Restriction" | "Flag")
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="KYC">KYC</option>
            <option value="Restriction">Restriction</option>
            <option value="Flag">Flag</option>
          </select>
        </div>

        <section className="space-y-2">
          {actionType === "KYC" ? (
            <>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Verification Required
              </h4>
              <div className="flex flex-wrap gap-2">
                {verificationOptions
                  .filter((item) => item !== "Proof")
                  .map((option) => (
                <label
                      key={option}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={verificationRequired.includes(option)}
                        onChange={() => toggleVerification(option)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      {option}
                    </label>
                  ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Preview Decision
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            <PreviewItem
              label="Final Verification"
              value={
                Array.isArray(
                  manualResult.finalDecision.verification as unknown as
                    | string[]
                    | string
                    | undefined
                )
                  ? (
                      manualResult.finalDecision.verification as string[]
                    ).join(", ")
                  : (manualResult.finalDecision.verification as unknown as
                      | string
                      | undefined) || "None"
              }
            />
            <PreviewItem
              label="Final Restriction"
              value={manualResult.finalDecision.restriction ?? "None"}
            />
            <PreviewItem
              label="Flags"
              value={
                manualResult.finalDecision.flags.length > 0
                  ? manualResult.finalDecision.flags.join(", ")
                  : "None"
              }
            />
            <PreviewItem
              label="Risk Score"
              value={String(
                Number.isFinite(manualResult.riskScore)
                  ? manualResult.riskScore
                  : Math.min(
                      100,
                      (manualResult.triggeredRules?.length || 0) * 15 +
                        (manualResult.detectedFraudSignals?.length || 0) * 20
                    )
              )}
            />
          </div>
        </section>

        <section className="space-y-2">
          {actionType === "Restriction" ? (
            <>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Restrictions
              </h4>
              <div className="flex flex-wrap gap-2">
                {restrictionOptions.map((option) => (
                  <label
                    key={option}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={restrictions.includes(option)}
                      onChange={() => toggleRestriction(option)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </>
          ) : null}
          {actionType === "Flag" ? (
            <>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Flags
              </h4>
              <div className="flex flex-wrap gap-2">
                {flagOptions.map((option) => (
                  <label
                    key={option}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={flags.includes(option)}
                      onChange={() => toggleFlag(option)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
          >
            Apply Trigger
          </button>

          {successMessage ? (
            <p className="text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </article>
  );
}
