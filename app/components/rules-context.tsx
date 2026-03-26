"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";

export type RestrictionType =
  | "Withdrawal Block"
  | "Deposit Block"
  | "Casino Block"
  | "Full Account Block";

export type EventType =
  | "ANY"
  | "Registration"
  | "Deposit"
  | "Withdrawal"
  | "Bonus"
  | "Bet Placement";
export type RuleField =
  | "country"
  | "kycLevel"
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
  | "Betting";

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
  name: string;
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
  actions: {
    verifications: VerificationType[];
    restrictions: RestrictionType[];
    flags: string[];
  };
  priority: number;
  enabled: boolean;
  stopProcessing: boolean;
  // Backward compatibility mirrors
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
    const resolvedActions = input.actions ?? {
      verifications: input.verificationRequired ?? [],
      restrictions: input.restrictions ?? [],
      flags: input.flags ?? [],
    };

    setRules((currentRules) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...input,
        name: input.name?.trim() || "Untitled Rule",
        priority: input.priority ?? 100,
        enabled: input.enabled ?? true,
        stopProcessing: input.stopProcessing ?? false,
        actions: resolvedActions,
        verificationRequired: resolvedActions.verifications,
        restrictions: resolvedActions.restrictions,
        flags: resolvedActions.flags,
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
