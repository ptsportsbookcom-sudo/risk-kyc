"use client";

import { FormEvent, useState } from "react";
import {
  createBulkScenarioSimulationInputs,
  formatScenarioEvent,
  ScenarioEvent,
  ScenarioId,
  scenarioTemplates,
} from "@/app/components/automation-scenarios";
import {
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { canUserPerformAction } from "@/app/components/enforcement";
import { runRiskEngine } from "@/app/components/rules-engine";
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

type BulkScenario = {
  id: string;
  type: ScenarioId;
  label: string;
  eventType: EventType;
  events: ScenarioEvent[];
  depositAmount: number;
  deviceCount: number;
  ipCountry: string;
  accountCountry: string;
  bonusesUsed: number;
  betCountLastMinute: number;
};

type BulkSimulationResult = {
  scenario: BulkScenario;
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  finalDecision: {
    verification: string | null;
    kycLevel: "L0" | "L1" | "L2" | "L3";
    restriction: string | null;
    flags: string[];
  };
  fraudFlags: string[];
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
  const { rules, resetRules } = useRules();
  const { addAuditLog, addCase, resetCasesData } = useKycCases();
  const {
    applyTriggerToPlayer,
    applySelfExclusion,
    clearExpiredSelfExclusion,
    getPlayerById,
    resetPlayers,
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
  const [bulkResults, setBulkResults] = useState<BulkSimulationResult[]>([]);
  const [bulkCaseMessage, setBulkCaseMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [numberOfScenarios, setNumberOfScenarios] = useState(10);
  const [selectedScenarioTypes, setSelectedScenarioTypes] = useState<ScenarioId[]>(
    scenarioTemplates.map((item) => item.id)
  );

  const toggleBulkScenarioType = (type: ScenarioId) => {
    setSelectedScenarioTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  };

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

    const engineResult = runRiskEngine({
      input: {
        Transaction: {
          depositAmount: simulation.depositAmount,
          withdrawalAmount: simulation.withdrawalAmount,
          totalDeposits: simulation.totalDeposits,
          depositCount: simulation.depositCount,
          withdrawalCount: simulation.withdrawalCount,
        },
        Player: {
          deviceCount: simulation.deviceCount,
          ipCountry: simulation.ipCountry,
          accountCountry: simulation.accountCountry,
          country: simulation.country,
          kycLevel: simulation.kycLevel,
        },
        Behavior: {
          bonusesUsed: simulation.bonusesUsed,
          betCountLastMinute: simulation.betCountLastMinute,
          lastDepositTimestamp: simulation.lastDepositTimestamp,
          lastBetTimestamp: simulation.lastBetTimestamp,
          betAmount: simulation.betAmount,
          odds: simulation.odds,
          flags: existingPlayer?.flags ?? [],
        },
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

  const runBulkSimulation = () => {
    const scenarioInputs = createBulkScenarioSimulationInputs({
      numberOfScenarios,
      selectedScenarioTypes,
    });
    const scenarios: BulkScenario[] = scenarioInputs.map((item, index) => ({
      id: `BULK-${index + 1}`,
      type: item.type,
      label: item.label,
      eventType: item.eventType as EventType,
      events: item.events,
      depositAmount: item.playerData.depositAmount,
      deviceCount: item.playerData.deviceCount,
      ipCountry: item.playerData.ipCountry,
      accountCountry: item.playerData.accountCountry,
      bonusesUsed: item.playerData.bonusesUsed,
      betCountLastMinute: item.playerData.betCountLastMinute,
    }));

    const results = scenarios.map((scenario, index) => {
      const baseScenario = scenarioInputs[index];
      const engineResult = runRiskEngine({
        input: {
          Transaction: {
            depositAmount: baseScenario.playerData.depositAmount,
            withdrawalAmount: baseScenario.playerData.withdrawalAmount,
            totalDeposits: baseScenario.playerData.totalDeposits,
            depositCount: baseScenario.playerData.depositCount,
            withdrawalCount: baseScenario.playerData.withdrawalCount,
          },
          Player: {
            deviceCount: baseScenario.playerData.deviceCount,
            ipCountry: baseScenario.playerData.ipCountry,
            accountCountry: baseScenario.playerData.accountCountry,
            country: baseScenario.playerData.country,
            kycLevel: baseScenario.playerData.kycLevel,
          },
          Behavior: {
            bonusesUsed: baseScenario.playerData.bonusesUsed,
            betCountLastMinute: baseScenario.playerData.betCountLastMinute,
            lastDepositTimestamp: baseScenario.playerData.lastDepositTimestamp,
            lastBetTimestamp: baseScenario.playerData.lastBetTimestamp,
            betAmount: baseScenario.playerData.betAmount,
            odds: baseScenario.playerData.odds,
            flags: baseScenario.playerData.flags,
          },
        },
        rules,
      });

      console.log("[BulkSimulation] input", baseScenario);
      console.log("[BulkSimulation] matched rules", engineResult.triggeredRules);

      return {
        scenario,
        triggeredRules: engineResult.triggeredRules,
        finalDecision: {
          verification: engineResult.finalDecision.verification,
          kycLevel: engineResult.finalDecision.kycLevel,
          restriction: engineResult.finalDecision.restriction,
          flags: engineResult.finalDecision.flags,
        },
        fraudFlags: engineResult.detectedFraudSignals,
      };
    });

    setBulkResults(results);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("simulationResults", JSON.stringify(results));
      window.dispatchEvent(new Event("kyc-data-updated"));
    }
    setBulkCaseMessage("");
  };

  const createCasesFromBulkResults = () => {
    const eligible = bulkResults.filter(
      (resultItem) =>
        resultItem.triggeredRules.length > 0 || resultItem.finalDecision.flags.length > 0
    );
    if (eligible.length === 0) {
      setBulkCaseMessage("No bulk results with triggered rules or flags.");
      return;
    }

    let createdCount = 0;
    eligible.forEach((resultItem, index) => {
      const generatedUserId = `SIM-${Date.now()}-${index + 1}`;
      const caseId = addCase({
        userId: generatedUserId,
        username: `bulk_player_${resultItem.scenario.id.toLowerCase()}`,
        verificationRequired: resultItem.finalDecision.verification
          ? [resultItem.finalDecision.verification as VerificationType]
          : [],
        kycLevel: resultItem.finalDecision.kycLevel,
        restrictions: resultItem.finalDecision.restriction
          ? [resultItem.finalDecision.restriction as RestrictionType]
          : [],
        flags: resultItem.finalDecision.flags,
        triggeredRules: resultItem.triggeredRules,
        fraudFlags: resultItem.fraudFlags,
        finalDecision: resultItem.finalDecision,
        source: "simulation",
        status: "Pending",
      });

      resultItem.triggeredRules.forEach((rule) => {
        addAuditLog({
          caseId,
          userId: generatedUserId,
          type: "rule_triggered",
          description: `Rule triggered: ${rule.name}`,
          metadata: { ruleId: rule.id, priority: rule.priority, source: "bulk_simulation" },
        });
      });
      createdCount += 1;
    });

    setBulkCaseMessage(`✔ ${createdCount} cases created from simulation`);
    if (typeof window !== "undefined") {
      const savedCases = window.localStorage.getItem("kyc_cases");
      if (savedCases) {
        window.localStorage.setItem("kycCases", savedCases);
      }
      window.dispatchEvent(new Event("kyc-data-updated"));
    }
  };

  const resetSimulationsOnly = () => {
    setResult(initialResult);
    setBulkResults([]);
    setBulkCaseMessage("");
    setActionCheckResult("");
    setActivePlayerId("");
    setResetMessage("Simulations reset successfully");
  };

  const resetAllData = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all data? This cannot be undone."
    );
    if (!confirmed) return;

    resetRules();
    resetCasesData();
    resetPlayers();
    setResult(initialResult);
    setBulkResults([]);
    setBulkCaseMessage("");
    setActionCheckResult("");
    setActivePlayerId("");
    setResetMessage("System reset successfully");
  };

  const resetSystemStorage = () => {
    const confirmed = window.confirm(
      "Reset System will clear browser local storage and refresh UI. Continue?"
    );
    if (!confirmed) return;
    window.localStorage.clear();
    resetRules();
    resetCasesData();
    resetPlayers();
    setResult(initialResult);
    setBulkResults([]);
    setBulkCaseMessage("");
    setActionCheckResult("");
    setActivePlayerId("");
    setResetMessage("System storage reset successfully");
    window.dispatchEvent(new Event("kyc-data-updated"));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Risk Simulator</h3>
        <p className="mt-1 text-sm text-slate-600">
          Simulate user events and evaluate KYC and restriction outcomes.
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Bulk Simulation Controls</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Number of scenarios</label>
              <input
                type="number"
                min="1"
                max="100"
                value={numberOfScenarios}
                onChange={(event) => setNumberOfScenarios(Number(event.target.value || 1))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Scenario types</p>
              <div className="flex flex-wrap gap-2">
                {scenarioTemplates.map((template) => (
                  <label
                    key={template.id}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScenarioTypes.includes(template.id)}
                      onChange={() => toggleBulkScenarioType(template.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    {template.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={runBulkSimulation}
            className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
          >
            Run Bulk Simulation
          </button>
          <button
            type="button"
            onClick={resetSimulationsOnly}
            className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
          >
            Reset Simulations Only
          </button>
          <button
            type="button"
            onClick={resetAllData}
            className="min-h-11 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 sm:w-auto"
          >
            Reset All Data
          </button>
          <button
            type="button"
            onClick={resetSystemStorage}
            className="min-h-11 w-full rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 sm:w-auto"
          >
            Reset System
          </button>
        </div>
        {resetMessage ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">{resetMessage}</p>
        ) : null}

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
              className="min-h-11 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
            >
              Run Simulation
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-base font-semibold text-slate-900">Bulk Simulation Results</h4>
        <div className="mt-3">
          <button
            type="button"
            onClick={createCasesFromBulkResults}
            className="min-h-11 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto"
          >
            Create Cases from Bulk Results
          </button>
          {bulkCaseMessage ? (
            <p className="mt-2 text-sm text-slate-700">{bulkCaseMessage}</p>
          ) : null}
        </div>
        {bulkResults.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No bulk simulation run yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {bulkResults.map((item) => (
              <article
                key={item.scenario.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  Scenario {item.scenario.id} ({item.scenario.type}): eventType=
                  {item.scenario.eventType}, deposit=
                  {item.scenario.depositAmount}, deviceCount={item.scenario.deviceCount},
                  ipCountry={item.scenario.ipCountry}, accountCountry=
                  {item.scenario.accountCountry}, bonusesUsed={item.scenario.bonusesUsed},
                  betCountLastMinute={item.scenario.betCountLastMinute}
                </p>
                <div className="mt-2 text-sm text-slate-700">
                  <p className="font-medium text-slate-800">Events:</p>
                  {item.scenario.events.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {item.scenario.events.map((event, eventIndex) => (
                        <li key={`${item.scenario.id}-${eventIndex}`}>{formatScenarioEvent(event)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1">No events</p>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  Triggered Rules:{" "}
                  {item.triggeredRules.length > 0
                    ? item.triggeredRules.map((rule) => rule.name).join(", ")
                    : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Final Verification: {item.finalDecision.verification ?? "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Final Restriction: {item.finalDecision.restriction ?? "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Flags:{" "}
                  {item.finalDecision.flags.length > 0
                    ? item.finalDecision.flags.join(", ")
                    : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Fraud Flags: {item.fraudFlags.length > 0 ? item.fraudFlags.join(", ") : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Final KYC Level: {item.finalDecision.kycLevel}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
              className="min-h-11 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 sm:w-auto"
          >
            Apply Self-Exclusion
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => tryAction("deposit")}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 sm:w-auto"
            >
              Try Deposit
            </button>
            <button
              type="button"
              onClick={() => tryAction("withdrawal")}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 sm:w-auto"
            >
              Try Withdrawal
            </button>
            <button
              type="button"
              onClick={() => tryAction("casino")}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 sm:w-auto"
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
