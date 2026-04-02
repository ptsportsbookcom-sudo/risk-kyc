"use client";

import { runRiskEngine, UnifiedRiskInput } from "@/app/components/rules-engine";
import { Rule } from "@/app/components/rules-context";

export type RiskEventType = "DEPOSIT" | "WITHDRAWAL" | "BET" | "LOGIN" | "BONUS";

export function handleRiskEvent(eventType: RiskEventType, input: UnifiedRiskInput, rules: Rule[]) {
  const result = runRiskEngine({ input, rules });

  console.log("EVENT TRIGGER", {
    eventType,
    risk: result.riskScore,
  });

  return {
    riskScore: result.riskScore,
    triggeredRules: result.triggeredRules,
    fraudFlags: result.detectedFraudSignals,
    decision: result.finalDecision,
    aggregatedActions: result.aggregatedActions,
  };
}

