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
  const [successMessage, setSuccessMessage] = useState("");

  const manualInput = {
    Transaction: {
      depositAmount: 0,
      withdrawalAmount: 0,
      totalDeposits: 0,
      depositCount: 0,
      withdrawalCount: 0,
    },
    Player: {
      deviceCount: 1,
      ipCountry: "US",
      accountCountry: "US",
      country: "US",
      kycLevel: "L0",
    },
    Behavior: {
      bonusesUsed: 0,
      betCountLastMinute: 0,
      lastDepositTimestamp: 0,
      lastBetTimestamp: 0,
      betAmount: 0,
      odds: 1,
      flags: actionType === "Flag" ? flags : [],
    },
  };
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
    const result = runRiskEngine({
      input: manualInput,
      rules,
    });
    const finalVerifications = result.aggregatedActions.verifications as VerificationType[];
    const finalRestrictions = result.aggregatedActions.restrictions as RestrictionType[];

    applyTriggerToPlayer({
      id: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: finalVerifications,
      restrictions: finalRestrictions,
      flags: result.flags,
      playerSnapshot: {
        deviceCount: manualInput.Player.deviceCount,
        ipCountry: manualInput.Player.ipCountry,
        accountCountry: manualInput.Player.accountCountry,
        totalDeposits: manualInput.Transaction.totalDeposits,
        depositCount: manualInput.Transaction.depositCount,
        withdrawalCount: manualInput.Transaction.withdrawalCount,
        lastDepositTimestamp: manualInput.Behavior.lastDepositTimestamp,
        lastBetTimestamp: manualInput.Behavior.lastBetTimestamp,
        betCountLastMinute: manualInput.Behavior.betCountLastMinute,
        bonusesUsed: manualInput.Behavior.bonusesUsed,
      },
    });

    const caseId = addCase({
      userId: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: finalVerifications,
      kycLevel: result.finalDecision.kycLevel,
      restrictions: finalRestrictions,
      flags: result.flags,
      triggeredRules: result.triggeredRules,
      fraudFlags: result.detectedFraudSignals,
      riskScore: result.riskScore,
      finalDecision: result.finalDecision,
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
              value={manualResult.finalDecision.verification ?? "None"}
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
