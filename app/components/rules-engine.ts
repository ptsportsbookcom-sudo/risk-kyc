"use client";

import { Rule } from "@/app/components/rules-context";
import { getFraudSignals } from "@/app/components/fraud-signals";

export type RulesEngineInput = {
  input: {
    Transaction: {
      depositAmount: number;
      withdrawalAmount: number;
      totalDeposits: number;
      depositCount: number;
      withdrawalCount: number;
    };
    Player: {
      deviceCount: number;
      ipCountry: string;
      accountCountry: string;
      country: string;
      kycLevel: string;
    };
    Behavior: {
      bonusesUsed: number;
      betCountLastMinute: number;
      lastDepositTimestamp: number;
      lastBetTimestamp: number;
      betAmount: number;
      odds: number;
      flags?: string[];
    };
  };
  rules: Rule[];
};

export type RulesEngineResult = {
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  verificationRequired: string[];
  restrictions: string[];
  flags: string[];
  riskScore: number;
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
    riskScore: number;
    triggeredRules: Array<{ id: string; name: string; priority: number }>;
    aggregatedActions: {
      verifications: string[];
      restrictions: string[];
      flags: string[];
    };
  };
  detectedFraudSignals: string[];
};

export type EvaluateRulesResult = {
  triggeredRules: Array<{
    id: string;
    name: string;
    priority: number;
    verificationRequired: string[];
    restrictions: string[];
    flags: string[];
  }>;
  ruleActions: {
    verifications: string[];
    restrictions: string[];
    flags: string[];
  };
};

export type UnifiedRiskInput = RulesEngineInput["input"];

const FRAUD_SIGNAL_ACTIONS: Record<string, { verification?: string; restriction?: string }> = {
  MULTI_ACCOUNT: { verification: "Selfie", restriction: "Withdrawal Block" },
  COUNTRY_MISMATCH: { verification: "ID" },
  BONUS_ABUSE: { restriction: "Deposit Block" },
  BET_VELOCITY: { verification: "ID" },
  HIGH_DEPOSIT_VELOCITY: { verification: "Selfie" },
};

function calculateRiskScore(input: {
  triggeredRules: Array<{ id: string; name: string; priority: number }>;
  fraudSignals: string[];
}) {
  const ruleScore = input.triggeredRules.length * 15;
  const fraudScore = input.fraudSignals.length * 20;
  return Math.min(100, ruleScore + fraudScore);
}

function evaluateOperator(
  left: number | string,
  operator: string,
  rightRaw: string,
  valueByField?: Record<string, number | string>
) {
  const resolvedRightValue =
    rightRaw.startsWith("$") && valueByField
      ? valueByField[rightRaw.slice(1)] ?? rightRaw
      : rightRaw;

  if (typeof left === "string") {
    const right = String(resolvedRightValue);
    if (operator === "==") return left === right;
    if (operator === "!=") return left !== right;
    return false;
  }

  const right = Number(resolvedRightValue);
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
  playerData: ReturnType<typeof flattenUnifiedInput>
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
  return evaluateOperator(left, condition.operator, condition.value, valueByField);
}

function doesRuleMatch(rule: Rule, playerData: ReturnType<typeof flattenUnifiedInput>) {
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

function flattenUnifiedInput(input: UnifiedRiskInput) {
  return {
    depositAmount: input.Transaction.depositAmount,
    withdrawalAmount: input.Transaction.withdrawalAmount,
    totalDeposits: input.Transaction.totalDeposits,
    depositCount: input.Transaction.depositCount,
    withdrawalCount: input.Transaction.withdrawalCount,
    lastDepositTimestamp: input.Behavior.lastDepositTimestamp,
    lastBetTimestamp: input.Behavior.lastBetTimestamp,
    betCountLastMinute: input.Behavior.betCountLastMinute,
    bonusesUsed: input.Behavior.bonusesUsed,
    country: input.Player.country,
    ipCountry: input.Player.ipCountry,
    accountCountry: input.Player.accountCountry,
    deviceCount: input.Player.deviceCount,
    kycLevel: input.Player.kycLevel,
    betAmount: input.Behavior.betAmount,
    odds: input.Behavior.odds,
    flags: input.Behavior.flags ?? [],
  };
}

function getEmptyResult(): RulesEngineResult {
  return {
    triggeredRules: [],
    verificationRequired: [],
    restrictions: [],
    flags: [],
    riskScore: 0,
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
      riskScore: 0,
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
  input: UnifiedRiskInput,
  rules: Rule[]
): EvaluateRulesResult {
  const normalizedInput = flattenUnifiedInput(input);
  const eligibleRules = rules
    .filter((rule) => rule.enabled !== false)
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));

  const verificationSet = new Set<string>();
  const restrictionSet = new Set<string>();
  const flagSet = new Set<string>();
  const triggeredRules: EvaluateRulesResult["triggeredRules"] = [];

  for (const rule of eligibleRules) {
    if (!doesRuleMatch(rule, normalizedInput)) continue;

    const actions = rule.actions ?? {
      verifications: rule.verificationRequired ?? [],
      restrictions: rule.restrictions ?? [],
      flags: rule.flags ?? [],
    };
    triggeredRules.push({
      id: rule.id,
      name: rule.name || "Untitled Rule",
      priority: rule.priority ?? 100,
      verificationRequired: actions.verifications,
      restrictions: actions.restrictions,
      flags: actions.flags,
    });
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
  triggeredRules: Array<{
    id: string;
    name: string;
    priority: number;
    verificationRequired: string[];
    restrictions: string[];
    flags: string[];
  }>;
  fraudFlags: string[];
  riskScore: number;
}) {
  const verificationLevels: string[] = [];
  const restrictions: string[] = [];
  const flags: string[] = [];

  input.triggeredRules.forEach((rule) => {
    verificationLevels.push(...(rule.verificationRequired ?? []));
    restrictions.push(...(rule.restrictions ?? []));
    flags.push(...(rule.flags ?? []));
  });
  input.fraudFlags.forEach((flag) => {
    const action = FRAUD_SIGNAL_ACTIONS[flag];
    if (!action) return;

    if (action.verification) {
      verificationLevels.push(action.verification);
    }

    if (action.restriction) {
      restrictions.push(action.restriction);
    }

    flags.push(flag);
  });

  const priorityOrder: Record<string, number> = {
    ID: 1,
    Selfie: 2,
    "Full KYC": 3,
  };
  const highestVerification =
    [...new Set(verificationLevels)].sort(
      (left, right) => (priorityOrder[right] ?? 0) - (priorityOrder[left] ?? 0)
    )[0] ?? null;
  const uniqueRestrictions = Array.from(new Set(restrictions));
  let finalVerification =
    highestVerification ??
    (input.triggeredRules.length > 0 || input.fraudFlags.length > 0 ? "ID" : null);
  let finalRestriction = uniqueRestrictions[0] ?? null;

  if (input.riskScore >= 80) {
    finalVerification = "Full KYC";
    finalRestriction = "Full Account Block";
  } else if (input.riskScore >= 60) {
    finalVerification = "Selfie";
    finalRestriction = finalRestriction ?? "Withdrawal Block";
  } else if (input.riskScore >= 40) {
    finalVerification = "ID";
  }

  const finalKycLevel: "L0" | "L1" | "L2" | "L3" =
    finalVerification === "Full KYC"
      ? "L3"
      : finalVerification === "Selfie"
        ? "L2"
        : finalVerification === "ID"
          ? "L1"
          : "L0";

  const uniqueFlags = Array.from(new Set(flags));
  const mergedVerifications = Array.from(
    new Set([
      ...verificationLevels,
      ...(finalVerification ? [finalVerification] : []),
    ])
  );
  const aggregatedActions = {
    verifications: mergedVerifications,
    restrictions: Array.from(
      new Set(finalRestriction ? [finalRestriction, ...uniqueRestrictions] : uniqueRestrictions)
    ),
    flags: uniqueFlags,
  };

  return {
    aggregatedActions,
    finalDecision: {
      verification: finalVerification,
      kycLevel: finalKycLevel,
      restriction: finalRestriction,
      flags: uniqueFlags,
      riskScore: input.riskScore,
      triggeredRules: input.triggeredRules,
      aggregatedActions,
    },
  };
}

export function runRiskEngine(input: { input: UnifiedRiskInput; rules: Rule[] }) {
  const normalizedInput = flattenUnifiedInput(input.input);
  const detectedFraudSignals = getFraudSignals({
    deviceCount: normalizedInput.deviceCount,
    ipCountry: normalizedInput.ipCountry,
    accountCountry: normalizedInput.accountCountry,
    totalDeposits: normalizedInput.totalDeposits,
    depositCount: normalizedInput.depositCount,
    withdrawalCount: normalizedInput.withdrawalCount,
    lastDepositTimestamp: normalizedInput.lastDepositTimestamp,
    lastBetTimestamp: normalizedInput.lastBetTimestamp,
    betCountLastMinute: normalizedInput.betCountLastMinute,
    bonusesUsed: normalizedInput.bonusesUsed,
  }).flags;

  const evaluated = evaluateRules(input.input, input.rules);
  const mergedDetectedFraudSignals = Array.from(
    new Set([...(detectedFraudSignals || []), ...(evaluated.ruleActions.flags || [])])
  );
  const riskScore = calculateRiskScore({
    triggeredRules: evaluated.triggeredRules,
    fraudSignals: mergedDetectedFraudSignals,
  });
  const resolved = resolveDecision({
    triggeredRules: evaluated.triggeredRules,
    fraudFlags: mergedDetectedFraudSignals,
    riskScore,
  });

  const result = {
    triggeredRules: evaluated.triggeredRules,
    flags: resolved.finalDecision.flags,
    riskScore: resolved.finalDecision.riskScore,
    finalVerification: resolved.finalDecision.verification,
    finalRestriction: resolved.finalDecision.restriction,
    finalKycLevel: resolved.finalDecision.kycLevel,
    aggregatedActions: resolved.aggregatedActions,
    finalDecision: resolved.finalDecision,
    detectedFraudSignals: mergedDetectedFraudSignals,
  };

  console.log("INPUT:", input.input);
  console.log("TRIGGERED RULES:", result.triggeredRules);
  console.log("FINAL DECISION:", result);

  return result;
}

export function runRulesEngine({ input, rules }: RulesEngineInput): RulesEngineResult {
  const empty = getEmptyResult();
  const result = runRiskEngine({ input, rules });
  return {
    ...empty,
    triggeredRules: result.triggeredRules,
    verificationRequired: result.aggregatedActions.verifications,
    restrictions: result.aggregatedActions.restrictions,
    flags: result.flags,
    riskScore: result.finalDecision.riskScore,
    aggregatedActions: result.aggregatedActions,
    finalDecision: result.finalDecision,
    detectedFraudSignals: result.detectedFraudSignals,
  };
}

