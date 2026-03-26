"use client";

import { Rule } from "@/app/components/rules-context";

export type RulesEngineInput = {
  eventType: string;
  playerData: {
    depositAmount: number;
    withdrawalAmount: number;
    bonusesUsed: number;
    country: string;
    kycLevel: string;
    betAmount: number;
    odds: number;
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
    restriction: string | null;
    flags: string[];
    triggeredRules: Array<{ id: string; name: string; priority: number }>;
    aggregatedActions: {
      verifications: string[];
      restrictions: string[];
      flags: string[];
    };
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
    bonusesUsed: playerData.bonusesUsed,
    country: playerData.country,
    kycLevel: playerData.kycLevel,
    betAmount: playerData.betAmount,
    odds: playerData.odds,
  };

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
      restriction: null,
      flags: [],
      triggeredRules: [],
      aggregatedActions: {
        verifications: [],
        restrictions: [],
        flags: [],
      },
    },
  };
}

export function runRulesEngine({
  eventType,
  playerData,
  rules,
}: RulesEngineInput): RulesEngineResult {
  if (!Array.isArray(rules) || rules.length === 0) {
    return getEmptyResult();
  }

  const eligibleRules = rules
    .filter((rule) => rule.enabled !== false)
    .filter((rule) => rule.eventType === "ANY" || rule.eventType === eventType)
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));

  if (eligibleRules.length === 0) {
    return getEmptyResult();
  }

  const verificationSet = new Set<string>();
  const restrictionSet = new Set<string>();
  const flagSet = new Set<string>();
  const triggeredRules: RulesEngineResult["triggeredRules"] = [];

  for (const rule of eligibleRules) {
    if (!doesRuleMatch(rule, playerData)) continue;

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

  const aggregatedActions = {
    verifications: Array.from(verificationSet),
    restrictions: Array.from(restrictionSet),
    flags: Array.from(flagSet),
  };

  const finalDecision = {
    verification: pickHighestPriority(
      aggregatedActions.verifications,
      verificationPriority
    ),
    restriction: pickHighestPriority(
      aggregatedActions.restrictions,
      restrictionPriority
    ),
    flags: aggregatedActions.flags,
    triggeredRules,
    aggregatedActions,
  };

  return {
    triggeredRules,
    verificationRequired: aggregatedActions.verifications,
    restrictions: aggregatedActions.restrictions,
    flags: aggregatedActions.flags,
    aggregatedActions,
    finalDecision,
  };
}

