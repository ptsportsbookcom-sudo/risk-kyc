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
  | "Bet";
export type ConditionType =
  | "Country/State"
  | "Single deposit"
  | "Number of deposits"
  | "Lifetime deposit"
  | "Single withdrawal"
  | "Number of withdrawals"
  | "Lifetime withdrawal"
  | "Number of bonuses used"
  | "Bet count";

export type Rule = {
  id: string;
  eventType: EventType;
  conditionType: ConditionType;
  conditionValue: string;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
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
