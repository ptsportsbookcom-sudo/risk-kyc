"use client";

import { FormEvent, useState } from "react";
import {
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { canUserPerformAction } from "@/app/components/enforcement";
import { runRulesEngine } from "@/app/components/rules-engine";
import {
  SelfExclusionDuration,
  usePlayers,
} from "@/app/components/players-context";
import { EventType, RestrictionType, useRules } from "@/app/components/rules-context";

type SimulationResult = {
  triggeredAction: string;
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  createdCaseStatus: string;
  aggregatedVerifications: string;
  aggregatedRestrictions: string;
  aggregatedFlags: string;
  finalVerification: string;
  finalKycLevel: string;
  finalRestriction: string;
  finalFlags: string;
  detectedFraudSignals: string;
  activeRestriction: string;
  selfExclusionStatus: string;
  selfExclusionReason: string;
  selfExclusionUntil: string;
};

const initialResult: SimulationResult = {
  triggeredAction: "No action triggered yet",
  triggeredRules: [],
  createdCaseStatus: "No case created",
  aggregatedVerifications: "None",
  aggregatedRestrictions: "None",
  aggregatedFlags: "None",
  finalVerification: "None",
  finalKycLevel: "L0",
  finalRestriction: "None",
  finalFlags: "None",
  detectedFraudSignals: "None",
  activeRestriction: "None",
  selfExclusionStatus: "Not active",
  selfExclusionReason: "None",
  selfExclusionUntil: "N/A",
};

export default function SimulatorPage() {
  const { rules } = useRules();
  const { addAuditLog, addCase } = useKycCases();
  const {
    applyTriggerToPlayer,
    applySelfExclusion,
    clearExpiredSelfExclusion,
    getPlayerById,
  } = usePlayers();
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("California");
  const [deviceCount, setDeviceCount] = useState("");
  const [ipCountry, setIpCountry] = useState("United States");
  const [accountCountry, setAccountCountry] = useState("United States");
  const [depositCount, setDepositCount] = useState("");
  const [withdrawalCount, setWithdrawalCount] = useState("");
  const [betCountLastMinute, setBetCountLastMinute] = useState("");
  const [bonusesUsed, setBonusesUsed] = useState("");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [odds, setOdds] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [selfExclusionDuration, setSelfExclusionDuration] =
    useState<SelfExclusionDuration>("24h");
  const [selfExclusionReason, setSelfExclusionReason] = useState("");
  const [result, setResult] = useState<SimulationResult>(initialResult);
  const [actionCheckResult, setActionCheckResult] = useState("");
  const [activePlayerId, setActivePlayerId] = useState("");

  const runSimulation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUserId = userId.trim() || `SIM-${Date.now()}`;
    const normalizedUsername = username.trim() || "simulated_user";
    setActivePlayerId(normalizedUserId);
    const existingPlayer = getPlayerById(normalizedUserId);

    const simulation = {
      eventType,
      depositAmount: Number(amount || 0),
      withdrawalAmount: Number(amount || 0),
      count: Number(count || 0),
      country,
      kycLevel: existingPlayer?.kycLevel ?? "L0",
      betAmount: Number(betAmount || 0),
      odds: Number(odds || 0),
      isLive,
      deviceCount: Number(deviceCount || existingPlayer?.deviceCount || 1),
      ipCountry,
      accountCountry,
      totalDeposits: Number(amount || 0),
      depositCount: Number(depositCount || 0),
      withdrawalCount: Number(withdrawalCount || 0),
      lastDepositTimestamp: Date.now(),
      lastBetTimestamp: Date.now(),
      betCountLastMinute: Number(betCountLastMinute || 0),
      bonusesUsed: Number(bonusesUsed || 0),
    };

    const engineResult = runRulesEngine({
      eventType,
      playerData: {
        depositAmount: simulation.depositAmount,
        withdrawalAmount: simulation.withdrawalAmount,
        totalDeposits: simulation.totalDeposits,
        depositCount: simulation.depositCount,
        withdrawalCount: simulation.withdrawalCount,
        lastDepositTimestamp: simulation.lastDepositTimestamp,
        lastBetTimestamp: simulation.lastBetTimestamp,
        betCountLastMinute: simulation.betCountLastMinute,
        bonusesUsed: simulation.bonusesUsed,
        country: simulation.country,
        ipCountry: simulation.ipCountry,
        accountCountry: simulation.accountCountry,
        deviceCount: simulation.deviceCount,
        kycLevel: simulation.kycLevel,
        betAmount: simulation.betAmount,
        odds: simulation.odds,
        flags: existingPlayer?.flags ?? [],
      },
      rules,
    });

    if (engineResult.triggeredRules.length === 0) {
      setResult({
        triggeredAction: "No rule triggered",
        triggeredRules: [],
        createdCaseStatus: "No case created",
        aggregatedVerifications: "None",
        aggregatedRestrictions: "None",
        aggregatedFlags:
          engineResult.aggregatedActions.flags.length > 0
            ? engineResult.aggregatedActions.flags.join(", ")
            : "None",
        finalVerification: "None",
        finalKycLevel: "L0",
        finalRestriction: "None",
        finalFlags:
          engineResult.finalDecision.flags.length > 0
            ? engineResult.finalDecision.flags.join(", ")
            : "None",
        detectedFraudSignals:
          engineResult.detectedFraudSignals.length > 0
            ? engineResult.detectedFraudSignals.join(", ")
            : "None",
        activeRestriction: engineResult.finalDecision.restriction ?? "None",
        selfExclusionStatus: "Not active",
        selfExclusionReason: "None",
        selfExclusionUntil: "N/A",
      });
      setActionCheckResult("");
      return;
    }

    const resolvedVerification = engineResult.finalDecision.verification;
    const resolvedKycLevel = engineResult.finalDecision.kycLevel;
    const resolvedRestriction = engineResult.finalDecision.restriction;
    const finalVerifications: VerificationType[] = resolvedVerification
      ? [resolvedVerification as VerificationType]
      : [];
    const finalRestrictions: RestrictionType[] = resolvedRestriction
      ? [resolvedRestriction as RestrictionType]
      : [];

    const triggerResult = applyTriggerToPlayer({
      id: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: finalVerifications,
      restrictions: finalRestrictions,
      flags: engineResult.finalDecision.flags,
      playerSnapshot: {
        deviceCount: simulation.deviceCount,
        ipCountry: simulation.ipCountry,
        accountCountry: simulation.accountCountry,
        totalDeposits: simulation.totalDeposits,
        depositCount: simulation.depositCount,
        withdrawalCount: simulation.withdrawalCount,
        lastDepositTimestamp: simulation.lastDepositTimestamp,
        lastBetTimestamp: simulation.lastBetTimestamp,
        betCountLastMinute: simulation.betCountLastMinute,
        bonusesUsed: simulation.bonusesUsed,
      },
    });

    let createdCases = 0;
    if (
      finalVerifications.length > 0 ||
      finalRestrictions.length > 0 ||
      engineResult.finalDecision.flags.length > 0
    ) {
      const caseId = addCase({
        userId: normalizedUserId,
        username: normalizedUsername,
        verificationRequired: finalVerifications,
        kycLevel: resolvedKycLevel,
        restrictions: triggerResult.appliedRestrictions,
        flags: engineResult.finalDecision.flags,
        triggeredRules: engineResult.triggeredRules,
        fraudFlags: engineResult.detectedFraudSignals,
        source: "simulation",
      });
      engineResult.triggeredRules.forEach((rule) => {
        addAuditLog({
          caseId,
          userId: normalizedUserId,
          type: "rule_triggered",
          description: `Rule triggered: ${rule.name}`,
          metadata: { ruleId: rule.id, priority: rule.priority },
        });
      });
      createdCases = 1;
    }

    setResult({
      triggeredAction: `${engineResult.triggeredRules.length} rule(s) triggered`,
      triggeredRules: engineResult.triggeredRules,
      createdCaseStatus:
        createdCases > 0
          ? "1 case created (Pending)"
          : "No case created",
      aggregatedVerifications:
        engineResult.aggregatedActions.verifications.length > 0
          ? engineResult.aggregatedActions.verifications.join(", ")
          : "None",
      aggregatedRestrictions:
        engineResult.aggregatedActions.restrictions.length > 0
          ? engineResult.aggregatedActions.restrictions.join(", ")
          : "None",
      aggregatedFlags:
        engineResult.aggregatedActions.flags.length > 0
          ? engineResult.aggregatedActions.flags.join(", ")
          : "None",
      finalVerification: engineResult.finalDecision.verification ?? "None",
      finalKycLevel: engineResult.finalDecision.kycLevel,
      finalRestriction: engineResult.finalDecision.restriction ?? "None",
      finalFlags:
        engineResult.finalDecision.flags.length > 0
          ? engineResult.finalDecision.flags.join(", ")
          : "None",
      detectedFraudSignals:
        engineResult.detectedFraudSignals.length > 0
          ? engineResult.detectedFraudSignals.join(", ")
          : "None",
      activeRestriction: engineResult.finalDecision.restriction ?? "None",
      selfExclusionStatus: "Not active",
      selfExclusionReason: "None",
      selfExclusionUntil: "N/A",
    });
    setActionCheckResult("");
  };

  const tryAction = (action: "deposit" | "withdrawal" | "casino") => {
    const latestPlayer = activePlayerId ? clearExpiredSelfExclusion(activePlayerId) : undefined;
    const restriction =
      activePlayerId && latestPlayer
        ? latestPlayer.restriction
        : result.activeRestriction !== "None"
          ? (result.activeRestriction as RestrictionType)
          : null;
    const allowed = canUserPerformAction(
      {
        restriction,
        isSelfExcluded: latestPlayer?.isSelfExcluded ?? false,
        selfExclusionUntil: latestPlayer?.selfExclusionUntil ?? null,
      },
      action
    );
    setActionCheckResult(
      allowed
        ? "Allowed"
        : `Blocked due to ${restriction ?? "restriction"}`
    );
    if (activePlayerId && latestPlayer) {
      setResult((currentResult) => ({
        ...currentResult,
        activeRestriction: latestPlayer.restriction ?? "None",
        selfExclusionStatus: latestPlayer.isSelfExcluded ? "Active" : "Expired",
        selfExclusionReason: latestPlayer.selfExclusionReason || "None",
        selfExclusionUntil:
          latestPlayer.selfExclusionUntil === null
            ? latestPlayer.isSelfExcluded
              ? "Permanent"
              : "N/A"
            : new Date(latestPlayer.selfExclusionUntil).toLocaleString(),
      }));
    }
  };

  const applySelfExclusionAction = () => {
    const normalizedUserId = userId.trim() || `SIM-${Date.now()}`;
    const normalizedUsername = username.trim() || "simulated_user";
    const reason = selfExclusionReason.trim() || "User-requested self-exclusion";
    const updatedPlayer = applySelfExclusion({
      id: normalizedUserId,
      username: normalizedUsername,
      duration: selfExclusionDuration,
      reason,
    });
    setActivePlayerId(normalizedUserId);
    const untilLabel =
      updatedPlayer.selfExclusionUntil === null
        ? "Permanent"
        : new Date(updatedPlayer.selfExclusionUntil).toLocaleString();

    const caseId = addCase({
      userId: normalizedUserId,
      username: normalizedUsername,
      verificationRequired: [],
      kycLevel: updatedPlayer.kycLevel,
      restrictions: ["Full Account Block"],
      source: "self-exclusion",
      reason,
      selfExclusionDuration: selfExclusionDuration,
      selfExclusionUntil:
        updatedPlayer.selfExclusionUntil === null
          ? null
          : new Date(updatedPlayer.selfExclusionUntil).toISOString(),
      triggeredRules: [],
      fraudFlags: [],
    });
    addAuditLog({
      caseId,
      userId: normalizedUserId,
      type: "self_exclusion",
      description: "User self-excluded",
      metadata: {
        duration: selfExclusionDuration,
        reason,
      },
    });

    setResult((currentResult) => ({
      ...currentResult,
      activeRestriction: "Full Account Block",
      selfExclusionStatus: "Active",
      selfExclusionReason: reason,
      selfExclusionUntil: untilLabel,
      createdCaseStatus: "1 case created (Pending)",
    }));
    setActionCheckResult("Blocked due to Full Account Block");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Risk Simulator</h3>
        <p className="mt-1 text-sm text-slate-600">
          Simulate user events and evaluate KYC and restriction outcomes.
        </p>

        <form className="mt-5 space-y-4" onSubmit={runSimulation}>
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
                placeholder="e.g. USR-1203"
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
                placeholder="e.g. alex_turner"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="eventType"
                className="text-sm font-medium text-slate-700"
              >
                Event Type
              </label>
              <select
                id="eventType"
                value={eventType}
                onChange={(event) => setEventType(event.target.value as EventType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              >
                <option value="Registration">Registration</option>
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Bonus">Bonus Activation</option>
                <option value="Bet Placement">Bet Placement</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="amount" className="text-sm font-medium text-slate-700">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          {eventType === "Registration" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            </div>
          ) : (
            <div className="max-w-sm space-y-1">
              <label className="text-sm font-medium text-slate-700">Count</label>
              <input
                type="number"
                min="0"
                step="1"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
          )}

          {eventType === "Bet Placement" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  betAmount
                </label>
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
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2 pt-8 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isLive}
                    onChange={(event) => setIsLive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  isLive
                </label>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">deviceCount</label>
              <input
                type="number"
                min="0"
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
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">depositCount</label>
              <input
                type="number"
                min="0"
                step="1"
                value={depositCount}
                onChange={(event) => setDepositCount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">withdrawalCount</label>
              <input
                type="number"
                min="0"
                step="1"
                value={withdrawalCount}
                onChange={(event) => setWithdrawalCount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                betCountLastMinute
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={betCountLastMinute}
                onChange={(event) => setBetCountLastMinute(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
          </div>

          <div className="max-w-sm space-y-1">
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

          <div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Run Simulation
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Self-Exclusion</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Duration</label>
            <select
              value={selfExclusionDuration}
              onChange={(event) =>
                setSelfExclusionDuration(event.target.value as SelfExclusionDuration)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <input
              type="text"
              value={selfExclusionReason}
              onChange={(event) => setSelfExclusionReason(event.target.value)}
              placeholder="e.g. Personal safety break"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={applySelfExclusionAction}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Apply Self-Exclusion
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Simulation Results</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ResultItem label="Triggered action" value={result.triggeredAction} />
          <ResultItem label="Created case status" value={result.createdCaseStatus} />
          <ResultItem label="Active Restriction" value={result.activeRestriction} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Self-Exclusion Status
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <ResultItem label="Status" value={result.selfExclusionStatus} />
            <ResultItem label="Reason" value={result.selfExclusionReason} />
            <ResultItem label="Until" value={result.selfExclusionUntil} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Enforcement Test
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => tryAction("deposit")}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Try Deposit
            </button>
            <button
              type="button"
              onClick={() => tryAction("withdrawal")}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Try Withdrawal
            </button>
            <button
              type="button"
              onClick={() => tryAction("casino")}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Try Casino
            </button>
          </div>
          {actionCheckResult ? (
            <p className="mt-2 text-sm font-medium text-slate-700">{actionCheckResult}</p>
          ) : null}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Triggered Rules
          </p>
          {result.triggeredRules.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No rules triggered.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {result.triggeredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                >
                  {rule.name} (Priority {rule.priority})
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detected Fraud Signals
          </p>
          <div className="mt-2">
            <ResultItem label="Signals" value={result.detectedFraudSignals} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aggregated Actions
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <ResultItem
              label="Verifications"
              value={result.aggregatedVerifications}
            />
            <ResultItem
              label="Restrictions"
              value={result.aggregatedRestrictions}
            />
            <ResultItem label="Flags" value={result.aggregatedFlags} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Final Decision
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <ResultItem label="Verification" value={result.finalVerification} />
            <ResultItem label="Final KYC Level" value={result.finalKycLevel} />
            <ResultItem label="Restriction" value={result.finalRestriction} />
            <ResultItem label="Flags" value={result.finalFlags} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </article>
  );
}
