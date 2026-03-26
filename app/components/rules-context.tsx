"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";

export type RestrictionType =
  | "Withdrawal Block"
  | "Deposit Block"
  | "Casino Block"
  | "Full Account Block";

export type EventType =
  | "Registration"
  | "Deposit"
  | "Withdrawal"
  | "Bonus"
  | "Bet Placement";
export type RuleField =
  | "country"
  | "state"
  | "depositAmount"
  | "withdrawalAmount"
  | "bonusesUsed"
  | "betAmount"
  | "odds"
  | "isLive";
export type RuleOperator = ">" | ">=" | "<" | "<=" | "==" | "!=";
export type RuleLogic = "ALL" | "ANY";

export type RuleConditionCategory =
  | "Transaction"
  | "Player"
  | "Bonus"
  | "Betting"
  | "Risk";

export type RuleCondition = {
  // Optional for backward compatibility with previously-saved rules.
  // New UI always sets it.
  category?: RuleConditionCategory;
  field: RuleField;
  operator: RuleOperator;
  value: string;
};

export type RuleConditionGroup = {
  // Within each group we use AND semantics (kept for backward compatibility).
  conditions: RuleCondition[];
};
export type ConditionType =
  | "Country/State"
  | "Single deposit"
  | "Number of deposits"
  | "Lifetime deposit"
  | "Single withdrawal"
  | "Number of withdrawals"
  | "Lifetime withdrawal"
  | "Number of bonuses used"
  | "Bet amount >"
  | "Odds >";

export type Rule = {
  id: string;
  eventType: EventType;
  // Simple mode: flat list of conditions combined by conditionLogic.
  conditions?: RuleCondition[];
  conditionLogic?: RuleLogic;
  // Advanced mode: multiple condition groups combined by groupLogic.
  // Within each group we use AND semantics.
  conditionGroups?: RuleConditionGroup[];
  groupLogic?: RuleLogic;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  // Backward compatibility for legacy rules kept in memory/local storage.
  conditionType?: ConditionType;
  conditionValue?: string;
  isLiveOnly?: boolean;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
  flags: string[];
};

type CreateRuleInput = Omit<Rule, "id">;

type RulesContextValue = {
  rules: Rule[];
  addRule: (input: CreateRuleInput) => void;
};

const RulesContext = createContext<RulesContextValue | undefined>(undefined);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<Rule[]>([]);

  const addRule = (input: CreateRuleInput) => {
    setRules((currentRules) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...input,
      },
      ...currentRules,
    ]);
  };

  const value = useMemo(() => ({ rules, addRule }), [rules]);

  return <RulesContext.Provider value={value}>{children}</RulesContext.Provider>;
}

export function useRules() {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error("useRules must be used within RulesProvider");
  }
  return context;
}
