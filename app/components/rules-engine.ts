"use client";

import { Rule } from "@/app/components/rules-context";
import { getFraudSignals } from "@/app/components/fraud-signals";
import { getKycLevel } from "@/app/components/kyc-levels";

export type RulesEngineInput = {
  eventType: string;
  playerData: {
    depositAmount: number;
    withdrawalAmount: number;
    totalDeposits: number;
    depositCount: number;
    withdrawalCount: number;
    lastDepositTimestamp: number;
    lastBetTimestamp: number;
    betCountLastMinute: number;
    bonusesUsed: number;
    country: string;
    ipCountry: string;
    accountCountry: string;
    deviceCount: number;
    kycLevel: string;
    betAmount: number;
    odds: number;
    flags?: string[];
  };
  rules: Rule[];
};

export type RulesEngineResult = {
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  verificationRequired: string[];
  restrictions: string[];
  flags: string[];
  aggregatedActions: {
    verifications: string[];
    restrictions: string[];
    flags: string[];
  };
  finalDecision: {
    verification: string | null;
    kycLevel: "L0" | "L1" | "L2" | "L3";
    restriction: string | null;
    flags: string[];
    triggeredRules: Array<{ id: string; name: string; priority: number }>;
    aggregatedActions: {
      verifications: string[];
      restrictions: string[];
      flags: string[];
    };
  };
  detectedFraudSignals: string[];
};

export type AggregatedActionsInput = {
  verifications: string[];
  restrictions: string[];
  flags: string[];
};

export type EvaluateRulesResult = {
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  ruleActions: {
    verifications: string[];
    restrictions: string[];
    flags: string[];
  };
};

const verificationPriority: Record<string, number> = {
  ID: 1,
  Selfie: 2,
  Proof: 3,
  "Full KYC": 4,
};

const restrictionPriority: Record<string, number> = {
  "Deposit Block": 1,
  "Withdrawal Block": 2,
  "Casino Block": 3,
  "Full Account Block": 4,
};

function pickHighestPriority(items: string[], priorityMap: Record<string, number>) {
  if (items.length === 0) return null;
  return [...items].sort(
    (left, right) => (priorityMap[right] ?? 0) - (priorityMap[left] ?? 0)
  )[0];
}

export function resolveAggregatedActions(aggregatedActions: AggregatedActionsInput) {
  const normalizedVerifications = Array.from(new Set(aggregatedActions.verifications));
  const computedKycLevel = getKycLevel(normalizedVerifications);
  const verificationByLevel: Record<"L0" | "L1" | "L2" | "L3", string | null> = {
    L0: null,
    L1: "ID",
    L2: "Selfie",
    L3: "Full KYC",
  };

  return {
    verification:
      verificationByLevel[computedKycLevel] ??
      pickHighestPriority(normalizedVerifications, verificationPriority),
    kycLevel: computedKycLevel,
    restriction: pickHighestPriority(
      aggregatedActions.restrictions,
      restrictionPriority
    ),
    flags: Array.from(new Set(aggregatedActions.flags)),
    aggregatedActions: {
      verifications: Array.from(new Set(aggregatedActions.verifications)),
      restrictions: Array.from(new Set(aggregatedActions.restrictions)),
      flags: Array.from(new Set(aggregatedActions.flags)),
    },
  };
}

function evaluateOperator(left: number | string, operator: string, rightRaw: string) {
  if (typeof left === "string") {
    if (operator === "==") return left === rightRaw;
    if (operator === "!=") return left !== rightRaw;
    return false;
  }

  const right = Number(rightRaw);
  if (Number.isNaN(right)) return false;

  if (operator === "==") return left === right;
  if (operator === "!=") return left !== right;
  if (operator === ">") return left > right;
  if (operator === ">=") return left >= right;
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  return false;
}

function evaluateCondition(
  condition: { field: string; operator: string; value: string },
  playerData: RulesEngineInput["playerData"]
) {
  const valueByField: Record<string, number | string> = {
    depositAmount: playerData.depositAmount,
    withdrawalAmount: playerData.withdrawalAmount,
    totalDeposits: playerData.totalDeposits,
    depositCount: playerData.depositCount,
    withdrawalCount: playerData.withdrawalCount,
    lastDepositTimestamp: playerData.lastDepositTimestamp,
    lastBetTimestamp: playerData.lastBetTimestamp,
    betCountLastMinute: playerData.betCountLastMinute,
    bonusesUsed: playerData.bonusesUsed,
    country: playerData.country,
    ipCountry: playerData.ipCountry,
    accountCountry: playerData.accountCountry,
    deviceCount: playerData.deviceCount,
    kycLevel: playerData.kycLevel,
    betAmount: playerData.betAmount,
    odds: playerData.odds,
  };

  if (condition.field === "flags") {
    const flags = Array.isArray(playerData.flags) ? playerData.flags : [];
    if (condition.operator === "==") return flags.includes(condition.value);
    if (condition.operator === "!=") return !flags.includes(condition.value);
    return false;
  }

  const left = valueByField[condition.field];
  if (left === undefined) return false;
  return evaluateOperator(left, condition.operator, condition.value);
}

function doesRuleMatch(rule: Rule, playerData: RulesEngineInput["playerData"]) {
  const normalizedConditions =
    rule.conditions && rule.conditions.length > 0
      ? rule.conditions
      : [{ field: rule.field, operator: rule.operator, value: rule.value }];

  if (normalizedConditions.length === 0) return false;
  const logic = rule.conditionLogic ?? "ALL";
  return logic === "ANY"
    ? normalizedConditions.some((condition) => evaluateCondition(condition, playerData))
    : normalizedConditions.every((condition) => evaluateCondition(condition, playerData));
}

function getEmptyResult(): RulesEngineResult {
  return {
    triggeredRules: [],
    verificationRequired: [],
    restrictions: [],
    flags: [],
    aggregatedActions: {
      verifications: [],
      restrictions: [],
      flags: [],
    },
    finalDecision: {
      verification: null,
      kycLevel: "L0",
      restriction: null,
      flags: [],
      triggeredRules: [],
      aggregatedActions: {
        verifications: [],
        restrictions: [],
        flags: [],
      },
    },
    detectedFraudSignals: [],
  };
}

export function evaluateRules(
  input: Pick<RulesEngineInput, "eventType" | "playerData">,
  rules: Rule[]
): EvaluateRulesResult {
  const eligibleRules = rules
    .filter((rule) => rule.enabled !== false)
    .filter((rule) => rule.eventType === "ANY" || rule.eventType === input.eventType)
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));

  const verificationSet = new Set<string>();
  const restrictionSet = new Set<string>();
  const flagSet = new Set<string>();
  const triggeredRules: EvaluateRulesResult["triggeredRules"] = [];

  for (const rule of eligibleRules) {
    if (!doesRuleMatch(rule, input.playerData)) continue;

    triggeredRules.push({
      id: rule.id,
      name: rule.name || "Untitled Rule",
      priority: rule.priority ?? 100,
    });

    const actions = rule.actions ?? {
      verifications: rule.verificationRequired ?? [],
      restrictions: rule.restrictions ?? [],
      flags: rule.flags ?? [],
    };
    actions.verifications.forEach((item) => verificationSet.add(item));
    actions.restrictions.forEach((item) => restrictionSet.add(item));
    actions.flags.forEach((item) => flagSet.add(item));

    if (rule.stopProcessing) break;
  }

  return {
    triggeredRules,
    ruleActions: {
      verifications: Array.from(verificationSet),
      restrictions: Array.from(restrictionSet),
      flags: Array.from(flagSet),
    },
  };
}

export function resolveDecision(input: {
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  ruleActions: {
    verifications: string[];
    restrictions: string[];
    flags: string[];
  };
  fraudSignals: string[];
}) {
  const aggregatedActions = {
    verifications: input.ruleActions.verifications,
    restrictions: input.ruleActions.restrictions,
    flags: Array.from(new Set([...input.ruleActions.flags, ...input.fraudSignals])),
  };
  const resolved = resolveAggregatedActions(aggregatedActions);

  return {
    aggregatedActions,
    finalDecision: {
      verification: resolved.verification,
      kycLevel: resolved.kycLevel,
      restriction: resolved.restriction,
      flags: resolved.flags,
      triggeredRules: input.triggeredRules,
      aggregatedActions: resolved.aggregatedActions,
    },
  };
}

export function runRulesEngine({
  eventType,
  playerData,
  rules,
}: RulesEngineInput): RulesEngineResult {
  const detectedFraudSignals = getFraudSignals({
    deviceCount: playerData.deviceCount,
    ipCountry: playerData.ipCountry,
    accountCountry: playerData.accountCountry,
    totalDeposits: playerData.totalDeposits,
    depositCount: playerData.depositCount,
    withdrawalCount: playerData.withdrawalCount,
    lastDepositTimestamp: playerData.lastDepositTimestamp,
    lastBetTimestamp: playerData.lastBetTimestamp,
    betCountLastMinute: playerData.betCountLastMinute,
    bonusesUsed: playerData.bonusesUsed,
  }).flags;

  const playerDataWithSignals = {
    ...playerData,
    flags: Array.from(new Set([...(playerData.flags ?? []), ...detectedFraudSignals])),
  };

  if (!Array.isArray(rules) || rules.length === 0) {
    const empty = getEmptyResult();
    const resolved = resolveAggregatedActions({
      verifications: [],
      restrictions: [],
      flags: detectedFraudSignals,
    });
    return {
      ...empty,
      flags: resolved.flags,
      aggregatedActions: resolved.aggregatedActions,
      finalDecision: {
        ...empty.finalDecision,
        flags: resolved.flags,
        aggregatedActions: resolved.aggregatedActions,
      },
      detectedFraudSignals,
    };
  }

  const evaluated = evaluateRules(
    { eventType, playerData: playerDataWithSignals },
    rules
  );

  if (evaluated.triggeredRules.length === 0) {
    const empty = getEmptyResult();
    const resolved = resolveDecision({
      triggeredRules: [],
      ruleActions: {
        verifications: [],
        restrictions: [],
        flags: [],
      },
      fraudSignals: detectedFraudSignals,
    });
    return {
      ...empty,
      flags: resolved.finalDecision.flags,
      aggregatedActions: resolved.aggregatedActions,
      finalDecision: resolved.finalDecision,
      detectedFraudSignals,
    };
  }
  const resolved = resolveDecision({
    triggeredRules: evaluated.triggeredRules,
    ruleActions: evaluated.ruleActions,
    fraudSignals: detectedFraudSignals,
  });

  return {
    triggeredRules: evaluated.triggeredRules,
    verificationRequired: resolved.aggregatedActions.verifications,
    restrictions: resolved.aggregatedActions.restrictions,
    flags: resolved.aggregatedActions.flags,
    aggregatedActions: resolved.aggregatedActions,
    finalDecision: resolved.finalDecision,
    detectedFraudSignals,
  };
}

