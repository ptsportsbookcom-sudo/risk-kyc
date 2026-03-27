"use client";

import { Rule } from "@/app/components/rules-context";

export type ScenarioId =
  | "MULTI_ACCOUNT"
  | "HIGH_DEPOSIT"
  | "COUNTRY_MISMATCH"
  | "BONUS_ABUSE"
  | "HIGH_VELOCITY";

export type ScenarioSimulationInput = {
  id: ScenarioId;
  label: string;
  eventType: "Deposit" | "Bonus" | "Bet Placement";
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
    flags: string[];
  };
};

export const scenarioTemplates: Array<{ id: ScenarioId; label: string }> = [
  { id: "MULTI_ACCOUNT", label: "MULTI_ACCOUNT" },
  { id: "HIGH_DEPOSIT", label: "HIGH_DEPOSIT" },
  { id: "COUNTRY_MISMATCH", label: "COUNTRY_MISMATCH" },
  { id: "BONUS_ABUSE", label: "BONUS_ABUSE" },
  { id: "HIGH_VELOCITY", label: "HIGH_VELOCITY" },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createBasePlayerData() {
  const now = Date.now();
  return {
    depositAmount: 50,
    withdrawalAmount: 0,
    totalDeposits: 50,
    depositCount: 1,
    withdrawalCount: 0,
    lastDepositTimestamp: now,
    lastBetTimestamp: now,
    betCountLastMinute: 1,
    bonusesUsed: 0,
    country: "US",
    ipCountry: "US",
    accountCountry: "US",
    deviceCount: 1,
    kycLevel: "L0",
    betAmount: 10,
    odds: 1.5,
    flags: [],
  };
}

export function createAutoRulesFromScenarios(selectedScenarioIds: ScenarioId[]): Omit<Rule, "id">[] {
  return selectedScenarioIds.map((id) => {
    if (id === "MULTI_ACCOUNT") {
      return {
        name: "AUTO: Multi Account Device Check",
        source: "auto" as const,
        eventType: "ANY",
        conditions: [
          { category: "Player", field: "deviceCount", operator: ">", value: "3" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "deviceCount",
        operator: ">",
        value: "3",
        actions: { verifications: [], restrictions: [], flags: ["MULTI_ACCOUNT"] },
        priority: 40,
        enabled: true,
        stopProcessing: false,
        verificationRequired: [],
        restrictions: [],
        flags: ["MULTI_ACCOUNT"],
      };
    }

    if (id === "HIGH_DEPOSIT") {
      return {
        name: "AUTO: High Deposit KYC Escalation",
        source: "auto" as const,
        eventType: "Deposit",
        conditions: [
          { category: "Transaction", field: "depositAmount", operator: ">", value: "1000" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "depositAmount",
        operator: ">",
        value: "1000",
        actions: { verifications: ["Full KYC"], restrictions: [], flags: [] },
        priority: 20,
        enabled: true,
        stopProcessing: false,
        verificationRequired: ["Full KYC"],
        restrictions: [],
        flags: [],
      };
    }

    if (id === "COUNTRY_MISMATCH") {
      return {
        name: "AUTO: Country Mismatch Check",
        source: "auto" as const,
        eventType: "ANY",
        conditions: [
          { category: "Player", field: "ipCountry", operator: "!=", value: "$accountCountry" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "ipCountry",
        operator: "!=",
        value: "$accountCountry",
        actions: { verifications: [], restrictions: [], flags: ["COUNTRY_MISMATCH"] },
        priority: 30,
        enabled: true,
        stopProcessing: false,
        verificationRequired: [],
        restrictions: [],
        flags: ["COUNTRY_MISMATCH"],
      };
    }

    if (id === "BONUS_ABUSE") {
      return {
        name: "AUTO: Bonus Abuse Pattern",
        source: "auto" as const,
        eventType: "Bonus",
        conditions: [
          { category: "Bonus", field: "bonusesUsed", operator: ">", value: "1" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "bonusesUsed",
        operator: ">",
        value: "1",
        actions: { verifications: [], restrictions: [], flags: ["BONUS_ABUSE"] },
        priority: 35,
        enabled: true,
        stopProcessing: false,
        verificationRequired: [],
        restrictions: [],
        flags: ["BONUS_ABUSE"],
      };
    }

    return {
      name: "AUTO: High Bet Velocity",
      source: "auto" as const,
      eventType: "Bet Placement",
      conditions: [
        { category: "Betting", field: "betCountLastMinute", operator: ">", value: "10" },
      ],
      conditionLogic: "ALL",
      conditionGroups: [],
      groupLogic: "ALL",
      field: "betCountLastMinute",
      operator: ">",
      value: "10",
      actions: { verifications: [], restrictions: [], flags: ["BET_VELOCITY"] },
      priority: 36,
      enabled: true,
      stopProcessing: false,
      verificationRequired: [],
      restrictions: [],
      flags: ["BET_VELOCITY"],
    };
  });
}

export function createScenarioSimulationInputs(
  selectedScenarioIds: ScenarioId[]
): ScenarioSimulationInput[] {
  return selectedScenarioIds.map((id) => {
    const base = createBasePlayerData();
    if (id === "MULTI_ACCOUNT") {
      return {
        id,
        label: "MULTI_ACCOUNT",
        eventType: "Deposit",
        playerData: {
          ...base,
          deviceCount: randomInt(4, 6),
          depositAmount: randomInt(100, 400),
          totalDeposits: randomInt(100, 400),
        },
      };
    }
    if (id === "HIGH_DEPOSIT") {
      const deposit = randomInt(1200, 2000);
      return {
        id,
        label: "HIGH_DEPOSIT",
        eventType: "Deposit",
        playerData: {
          ...base,
          depositAmount: deposit,
          totalDeposits: deposit,
        },
      };
    }
    if (id === "COUNTRY_MISMATCH") {
      const accountCountry = "US";
      const ipCountry = "UK";
      return {
        id,
        label: "COUNTRY_MISMATCH",
        eventType: "Deposit",
        playerData: {
          ...base,
          accountCountry,
          ipCountry,
        },
      };
    }
    if (id === "BONUS_ABUSE") {
      return {
        id,
        label: "BONUS_ABUSE",
        eventType: "Bonus",
        playerData: {
          ...base,
          bonusesUsed: randomInt(3, 5),
        },
      };
    }
    return {
      id,
      label: "HIGH_VELOCITY",
      eventType: "Bet Placement",
      playerData: {
        ...base,
        betCountLastMinute: randomInt(20, 30),
      },
    };
  });
}

