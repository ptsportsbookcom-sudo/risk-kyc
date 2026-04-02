"use client";

import { Rule } from "@/app/components/rules-context";

export type ScenarioId =
  | "MULTI_ACCOUNT"
  | "HIGH_DEPOSIT"
  | "COUNTRY_MISMATCH"
  | "BONUS_ABUSE"
  | "HIGH_VELOCITY";

export type ScenarioSimulationInput = {
  id: string;
  label: string;
  type: ScenarioId;
  eventType: "Deposit" | "Bonus" | "Bet Placement" | "Registration";
  events: ScenarioEvent[];
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

export type ScenarioEvent =
  | { type: "login"; deviceId: number; ipCountry: string; accountCountry: string; timestamp: number }
  | { type: "deposit"; amount: number; timestamp: number }
  | { type: "claim_bonus"; bonusCode: string; timestamp: number }
  | { type: "bet"; amount: number; odds: number; isLive: boolean; timestamp: number };

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

function randomFrom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function createBasePlayerData(accountCountry = "US") {
  const now = Date.now();
  return {
    depositAmount: 0,
    withdrawalAmount: 0,
    totalDeposits: 0,
    depositCount: 0,
    withdrawalCount: 0,
    lastDepositTimestamp: now,
    lastBetTimestamp: now,
    betCountLastMinute: 0,
    bonusesUsed: 0,
    country: accountCountry,
    ipCountry: accountCountry,
    accountCountry,
    deviceCount: 1,
    kycLevel: "L0",
    betAmount: 0,
    odds: 1.5,
    flags: [],
  };
}

function buildPlayerStateFromEvents(events: ScenarioEvent[]) {
  const accountCountryFromEvent =
    events.find((event) => event.type === "login")?.accountCountry ?? "US";
  const state = createBasePlayerData(accountCountryFromEvent);
  const uniqueDevices = new Set<number>();
  let recentBetCount = 0;

  events.forEach((event) => {
    if (event.type === "login") {
      uniqueDevices.add(event.deviceId);
      state.deviceCount = uniqueDevices.size;
      state.ipCountry = event.ipCountry;
      state.accountCountry = event.accountCountry;
      state.country = event.accountCountry;
      return;
    }
    if (event.type === "deposit") {
      state.depositAmount = event.amount;
      state.totalDeposits += event.amount;
      state.depositCount += 1;
      state.lastDepositTimestamp = event.timestamp;
      return;
    }
    if (event.type === "claim_bonus") {
      state.bonusesUsed += 1;
      return;
    }

    recentBetCount += 1;
    state.betAmount = event.amount;
    state.odds = event.odds;
    state.lastBetTimestamp = event.timestamp;
  });

  state.betCountLastMinute = recentBetCount;
  return state;
}

function createScenarioEvents(type: ScenarioId): {
  eventType: "Deposit" | "Bonus" | "Bet Placement" | "Registration";
  events: ScenarioEvent[];
} {
  const now = Date.now();
  const accountCountry = randomFrom(["US", "DE", "FR", "GB"]);
  const sameIpCountry = accountCountry;
  const mismatchIpCountry = randomFrom(["US", "DE", "FR", "GB"].filter((c) => c !== accountCountry));

  if (type === "MULTI_ACCOUNT") {
    const eventCount = randomInt(4, 6);
    return {
      eventType: "Registration",
      events: Array.from({ length: eventCount }, (_, index) => ({
        type: "login" as const,
        deviceId: index + 1,
        ipCountry: sameIpCountry,
        accountCountry,
        timestamp: now + index * 10_000,
      })),
    };
  }

  if (type === "HIGH_DEPOSIT") {
    const depositEvents = randomInt(6, 8);
    const baseTime = now - 4 * 60 * 1000; // keep within getFraudSignals short window
    const intervalMs = 15 * 1000;
    return {
      eventType: "Deposit",
      events: Array.from({ length: depositEvents }, (_, index) => ({
        type: "deposit" as const,
        amount: randomInt(200, 1500),
        timestamp: baseTime + index * intervalMs,
      })),
    };
  }

  if (type === "COUNTRY_MISMATCH") {
    return {
      eventType: "Registration",
      events: [
        {
          type: "login",
          deviceId: randomInt(1, 3),
          ipCountry: mismatchIpCountry,
          accountCountry,
          timestamp: now,
        },
      ],
    };
  }

  if (type === "BONUS_ABUSE") {
    const bonusClaims = randomInt(3, 5);
    const bonusEvents: ScenarioEvent[] = Array.from({ length: bonusClaims }, (_, index) => ({
      type: "claim_bonus",
      bonusCode: `WELCOME-${index + 1}`,
      timestamp: now + index * 5_000,
    }));
    return {
      eventType: "Bonus",
      events: [
        ...bonusEvents,
        {
          type: "deposit",
          amount: randomInt(100, 900),
          timestamp: now + (bonusClaims + 1) * 5_000,
        },
      ],
    };
  }

  const betEvents = randomInt(22, 30);
  return {
    eventType: "Bet Placement",
    events: Array.from({ length: betEvents }, (_, index) => ({
      type: "bet",
      amount: randomInt(70, 120),
      odds: Number((Math.random() * 1.4 + 2.6).toFixed(2)), // keep high for HIGH_RISK_BET rule
      isLive: Math.random() > 0.5,
      timestamp: now - randomInt(0, 59_000) + index * 500,
    })),
  };
}

function buildScenarioFromType(type: ScenarioId, id: string, label: string): ScenarioSimulationInput {
  const generated = createScenarioEvents(type);
  const playerData = buildPlayerStateFromEvents(generated.events);

  return {
    id,
    type,
    label,
    eventType: generated.eventType,
    events: generated.events,
    playerData,
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
        actions: { verifications: ["Full KYC"], restrictions: [], flags: ["MULTI_ACCOUNT"] },
        priority: 40,
        enabled: true,
        stopProcessing: false,
        verificationRequired: ["Full KYC"],
        restrictions: [],
        flags: ["MULTI_ACCOUNT"],
      };
    }

    if (id === "HIGH_DEPOSIT") {
      return {
        name: "AUTO: High Deposit Velocity Escalation",
        source: "auto" as const,
        eventType: "Deposit",
        conditions: [
          { category: "Transaction", field: "depositCount", operator: ">", value: "5" },
          { category: "Transaction", field: "lastDepositTimestamp", operator: ">", value: "0" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "depositCount",
        operator: ">",
        value: "5",
        actions: { verifications: ["Full KYC"], restrictions: [], flags: ["HIGH_DEPOSIT_VELOCITY"] },
        priority: 20,
        enabled: true,
        stopProcessing: false,
        verificationRequired: ["Full KYC"],
        restrictions: [],
        flags: ["HIGH_DEPOSIT_VELOCITY"],
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
        actions: { verifications: ["ID"], restrictions: [], flags: ["COUNTRY_MISMATCH"] },
        priority: 30,
        enabled: true,
        stopProcessing: false,
        verificationRequired: ["ID"],
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
          { category: "Bonus", field: "bonusesUsed", operator: ">", value: "2" },
        ],
        conditionLogic: "ALL",
        conditionGroups: [],
        groupLogic: "ALL",
        field: "bonusesUsed",
        operator: ">",
        value: "2",
        actions: { verifications: [], restrictions: ["Withdrawal Block"], flags: ["BONUS_ABUSE"] },
        priority: 35,
        enabled: true,
        stopProcessing: false,
        verificationRequired: [],
        restrictions: ["Withdrawal Block"],
        flags: ["BONUS_ABUSE"],
      };
    }

    return {
      name: "AUTO: High Risk Bet Monitoring",
      source: "auto" as const,
      eventType: "Bet Placement",
      conditions: [
        { category: "Betting", field: "betAmount", operator: ">", value: "80" },
        { category: "Betting", field: "odds", operator: ">", value: "2.5" },
      ],
      conditionLogic: "ALL",
      conditionGroups: [],
      groupLogic: "ALL",
      field: "betAmount",
      operator: ">",
      value: "80",
      actions: { verifications: [], restrictions: [], flags: ["HIGH_RISK_BET"] },
      priority: 36,
      enabled: true,
      stopProcessing: false,
      verificationRequired: [],
      restrictions: [],
      flags: ["HIGH_RISK_BET"],
    };
  });
}

export function createScenarioSimulationInputs(
  selectedScenarioIds: ScenarioId[]
): ScenarioSimulationInput[] {
  return selectedScenarioIds.map((id) => buildScenarioFromType(id, id, id));
}

export function createBulkScenarioSimulationInputs(input: {
  numberOfScenarios: number;
  selectedScenarioTypes: ScenarioId[];
}): ScenarioSimulationInput[] {
  const { numberOfScenarios, selectedScenarioTypes } = input;
  const validTypes =
    selectedScenarioTypes.length > 0
      ? selectedScenarioTypes
      : scenarioTemplates.map((item) => item.id);

  return Array.from({ length: Math.max(1, numberOfScenarios) }, (_, index) => {
    const type = randomFrom(validTypes);
    const scenarioId = `BULK-${index + 1}`;
    return buildScenarioFromType(type, scenarioId, type);
  });
}

export function formatScenarioEvent(event: ScenarioEvent): string {
  if (event.type === "login") {
    return `login (device ${event.deviceId}, ip ${event.ipCountry}, account ${event.accountCountry})`;
  }
  if (event.type === "deposit") {
    return `deposit (${event.amount})`;
  }
  if (event.type === "claim_bonus") {
    return `claim_bonus (${event.bonusCode})`;
  }
  return `bet (amount ${event.amount}, odds ${event.odds}, live ${event.isLive ? "yes" : "no"})`;
}

