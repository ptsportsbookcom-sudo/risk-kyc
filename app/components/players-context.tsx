"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { RestrictionType } from "@/app/components/rules-context";
import { VerificationType } from "@/app/components/kyc-cases-context";
import { KycLevel, maxKycLevel } from "@/app/components/kyc-levels";

export type PlayerLimits = {
  maxDeposit: number | null;
  canWithdraw: boolean;
  canPlayCasino: boolean;
};

const KYC_LEVEL_LITERALS: readonly KycLevel[] = ["L0", "L1", "L2", "L3"];

function parseKycLevel(raw: unknown): KycLevel | null {
  if (typeof raw !== "string") return null;
  return (KYC_LEVEL_LITERALS as readonly string[]).includes(raw)
    ? (raw as KycLevel)
    : null;
}

export type Player = {
  id: string;
  username: string;
  kycLevel: KycLevel;
  /** Last engine `finalDecision.kycLevel` — informational only; limits use `kycLevel`. */
  recommendedKycLevel?: KycLevel | null;
  limits: PlayerLimits;
  restriction: RestrictionType | null;
  restrictions: RestrictionType[];
  isSelfExcluded: boolean;
  selfExclusionReason: string;
  selfExclusionUntil: number | null;
  flags: string[];
  deviceCount: number;
  ipCountry: string;
  accountCountry: string;
  totalDeposits: number;
  depositCount: number;
  withdrawalCount: number;
  lastDepositTimestamp: number;
  lastBetTimestamp: number;
  betCountLastMinute: number;
  bonusesUsed: number;
  /** Player Risk Score — accumulated / rolling score updated when triggers apply (not the same as case `riskScore`). */
  riskScore: number;
  riskHistory: number[];
  lastRiskUpdate: number;
};

/**
 * Severity order (lowest → highest): Withdrawal Block, Deposit Block, Casino Block, Full Account Block.
 * Primary restriction = single highest-severity entry for quick access.
 */
export const RESTRICTION_SEVERITY: Record<RestrictionType, number> = {
  "Withdrawal Block": 1,
  "Deposit Block": 2,
  "Casino Block": 3,
  "Full Account Block": 4,
};

export function getPrimaryRestriction(
  restrictions: RestrictionType[]
): RestrictionType | null {
  if (!restrictions.length) return null;
  let best = restrictions[0];
  let bestRank = RESTRICTION_SEVERITY[best] ?? 0;
  for (const r of restrictions) {
    const rank = RESTRICTION_SEVERITY[r] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = r;
    }
  }
  return best;
}

export type PlayerEnforcementSnapshot = Pick<
  Player,
  "restrictions" | "isSelfExcluded" | "selfExclusionUntil"
>;

function isSelfExclusionActive(player: PlayerEnforcementSnapshot): boolean {
  if (!player.isSelfExcluded) return false;
  if (player.selfExclusionUntil === null || player.selfExclusionUntil === undefined) {
    return true;
  }
  return Date.now() <= player.selfExclusionUntil;
}

export function canDeposit(player: PlayerEnforcementSnapshot | null | undefined): boolean {
  if (!player) return true;
  if (isSelfExclusionActive(player)) return false;
  const r = player.restrictions ?? [];
  if (r.includes("Deposit Block")) return false;
  if (r.includes("Full Account Block")) return false;
  return true;
}

export function canWithdraw(player: PlayerEnforcementSnapshot | null | undefined): boolean {
  if (!player) return true;
  if (isSelfExclusionActive(player)) return false;
  const r = player.restrictions ?? [];
  if (r.includes("Withdrawal Block")) return false;
  if (r.includes("Full Account Block")) return false;
  return true;
}

export function canPlayCasino(player: PlayerEnforcementSnapshot | null | undefined): boolean {
  if (!player) return true;
  if (isSelfExclusionActive(player)) return false;
  const r = player.restrictions ?? [];
  if (r.includes("Casino Block")) return false;
  if (r.includes("Full Account Block")) return false;
  return true;
}

export type SelfExclusionDuration = "24h" | "7d" | "30d" | "permanent";

type ApplyTriggerInput = {
  id: string;
  username: string;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
  flags?: string[];
  incomingRiskScore?: number;
  /** Engine output only; does not directly set player `kycLevel`. */
  recommendedKyc?: KycLevel | null;
  playerSnapshot?: Partial<
    Pick<
      Player,
      | "deviceCount"
      | "ipCountry"
      | "accountCountry"
      | "totalDeposits"
      | "depositCount"
      | "withdrawalCount"
      | "lastDepositTimestamp"
      | "lastBetTimestamp"
      | "betCountLastMinute"
      | "bonusesUsed"
    >
  >;
};

type ApplyTriggerResult = {
  player: Player;
  levelChanged: boolean;
  newRestrictionsApplied: boolean;
  appliedRestrictions: RestrictionType[];
};

type PlayersContextValue = {
  players: Player[];
  applyTriggerToPlayer: (input: ApplyTriggerInput) => ApplyTriggerResult;
  applySelfExclusion: (input: {
    id: string;
    username: string;
    duration: SelfExclusionDuration;
    reason: string;
  }) => Player;
  clearExpiredSelfExclusion: (id: string) => Player | undefined;
  clearRestrictions: (playerId: string) => void;
  getPlayerById: (id: string) => Player | undefined;
  resetPlayers: () => void;
  canDeposit: typeof canDeposit;
  canWithdraw: typeof canWithdraw;
  canPlayCasino: typeof canPlayCasino;
};

function normalizeRestrictionList(raw: unknown): RestrictionType[] {
  const list = Array.isArray(raw) ? raw : [];
  const allowed = new Set<string>(Object.keys(RESTRICTION_SEVERITY));
  return Array.from(
    new Set(
      list.filter(
        (r): r is RestrictionType => typeof r === "string" && allowed.has(r)
      )
    )
  );
}

const PLAYERS_STORAGE_KEY = "kyc_players";

export function getLimitsForLevel(kycLevel: KycLevel): PlayerLimits {
  if (kycLevel === "L3") {
    return {
      maxDeposit: null,
      canWithdraw: true,
      canPlayCasino: true,
    };
  }

  if (kycLevel === "L2") {
    return {
      maxDeposit: 1000,
      canWithdraw: true,
      canPlayCasino: true,
    };
  }

  if (kycLevel === "L1") {
    return {
      maxDeposit: 500,
      canWithdraw: false,
      canPlayCasino: true,
    };
  }

  return {
    maxDeposit: 100,
    canWithdraw: false,
    canPlayCasino: true,
  };
}

const PlayersContext = createContext<PlayersContextValue | undefined>(undefined);

export function PlayersProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedPlayers = window.localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (!savedPlayers) {
        setPlayers([]);
        setIsHydrated(true);
        return;
      }

      const parsedPlayers = JSON.parse(savedPlayers) as Player[];
      const normalizedPlayers = Array.isArray(parsedPlayers)
        ? parsedPlayers.map((player) => {
            const restrictions = normalizeRestrictionList(player.restrictions);
            const restriction = getPrimaryRestriction(restrictions);
            return {
            ...player,
            limits: getLimitsForLevel(player.kycLevel),
            recommendedKycLevel: parseKycLevel(player.recommendedKycLevel) ?? null,
            restriction,
            restrictions,
            isSelfExcluded: Boolean(player.isSelfExcluded ?? false),
            selfExclusionReason: player.selfExclusionReason ?? "",
            selfExclusionUntil:
              typeof player.selfExclusionUntil === "number"
                ? player.selfExclusionUntil
                : null,
            flags: Array.isArray(player.flags) ? player.flags : [],
            deviceCount: Number(player.deviceCount ?? 1),
            ipCountry: player.ipCountry ?? "",
            accountCountry: player.accountCountry ?? "",
            totalDeposits: Number(player.totalDeposits ?? 0),
            depositCount: Number(player.depositCount ?? 0),
            withdrawalCount: Number(player.withdrawalCount ?? 0),
            lastDepositTimestamp: Number(player.lastDepositTimestamp ?? 0),
            lastBetTimestamp: Number(player.lastBetTimestamp ?? 0),
            betCountLastMinute: Number(player.betCountLastMinute ?? 0),
            bonusesUsed: Number(player.bonusesUsed ?? 0),
            riskScore: Number(player.riskScore ?? 0),
            riskHistory: Array.isArray(player.riskHistory)
              ? player.riskHistory.map((x) => Number(x)).filter((x) => Number.isFinite(x))
              : [],
            lastRiskUpdate:
              typeof player.lastRiskUpdate === "number" ? player.lastRiskUpdate : 0,
          };
          })
        : [];
      setPlayers(normalizedPlayers);
    } catch {
      setPlayers([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  }, [players, isHydrated]);

  const applyTriggerToPlayer = (input: ApplyTriggerInput): ApplyTriggerResult => {
    const existing = players.find((player) => player.id === input.id);
    const current: Player = existing ?? {
      id: input.id,
      username: input.username,
      kycLevel: "L0",
      recommendedKycLevel: null,
      limits: getLimitsForLevel("L0"),
      restriction: null,
      restrictions: [],
      isSelfExcluded: false,
      selfExclusionReason: "",
      selfExclusionUntil: null,
      flags: [],
      deviceCount: 1,
      ipCountry: "",
      accountCountry: "",
      totalDeposits: 0,
      depositCount: 0,
      withdrawalCount: 0,
      lastDepositTimestamp: 0,
      lastBetTimestamp: 0,
      betCountLastMinute: 0,
      bonusesUsed: 0,
      riskScore: 0,
      riskHistory: [],
      lastRiskUpdate: 0,
    };

    const currentKyc = current.kycLevel || "L0";
    const incomingRiskScore = input.incomingRiskScore ?? 0;

    let lifecycleKyc: KycLevel = "L0";
    if ((input.playerSnapshot?.depositCount ?? 0) > 0) {
      lifecycleKyc = maxKycLevel([lifecycleKyc, "L1"]);
    }
    if ((input.playerSnapshot?.withdrawalCount ?? 0) > 0) {
      lifecycleKyc = maxKycLevel([lifecycleKyc, "L2"]);
    }

    const riskBasedKyc: KycLevel = incomingRiskScore >= 60 ? "L3" : "L0";

    const nextKyc = maxKycLevel([currentKyc, lifecycleKyc, riskBasedKyc]);

    // Player rolling risk: blend incoming engine score with prior player state (Case Risk is stored separately on cases).
    const previousRisk = current.riskScore || 0;
    const newRisk = input.incomingRiskScore || 0;
    const finalRisk = Math.min(
      100,
      Math.round(newRisk * 0.7 + previousRisk * 0.3)
    );

    const mergedRestrictions = Array.from(
      new Set<RestrictionType>([
        ...current.restrictions,
        ...input.restrictions,
        ...(current.isSelfExcluded ? (["Full Account Block"] as const) : []),
      ])
    );
    const appliedRestrictions = mergedRestrictions.filter(
      (item) => !current.restrictions.includes(item)
    );
    const mergedFlags = Array.from(new Set([...current.flags, ...(input.flags ?? [])]));

    const updatedPlayer: Player = {
      ...current,
      username: input.username || current.username,
      kycLevel: nextKyc ?? currentKyc,
      recommendedKycLevel:
        input.recommendedKyc !== undefined ? input.recommendedKyc : current.recommendedKycLevel ?? null,
      limits: getLimitsForLevel(nextKyc ?? currentKyc),
      restriction: current.isSelfExcluded
        ? "Full Account Block"
        : getPrimaryRestriction(mergedRestrictions),
      restrictions: mergedRestrictions,
      isSelfExcluded: current.isSelfExcluded,
      selfExclusionReason: current.selfExclusionReason,
      selfExclusionUntil: current.selfExclusionUntil,
      flags: mergedFlags,
      deviceCount: input.playerSnapshot?.deviceCount ?? current.deviceCount,
      ipCountry: input.playerSnapshot?.ipCountry ?? current.ipCountry,
      accountCountry: input.playerSnapshot?.accountCountry ?? current.accountCountry,
      totalDeposits: input.playerSnapshot?.totalDeposits ?? current.totalDeposits,
      depositCount: input.playerSnapshot?.depositCount ?? current.depositCount,
      withdrawalCount: input.playerSnapshot?.withdrawalCount ?? current.withdrawalCount,
      lastDepositTimestamp:
        input.playerSnapshot?.lastDepositTimestamp ?? current.lastDepositTimestamp,
      lastBetTimestamp:
        input.playerSnapshot?.lastBetTimestamp ?? current.lastBetTimestamp,
      betCountLastMinute:
        input.playerSnapshot?.betCountLastMinute ?? current.betCountLastMinute,
      bonusesUsed: input.playerSnapshot?.bonusesUsed ?? current.bonusesUsed,
      riskScore: finalRisk,
      riskHistory: [...(current.riskHistory || []), newRisk],
      lastRiskUpdate: Date.now(),
    };

    setPlayers((currentPlayers) => {
      const idx = currentPlayers.findIndex((player) => player.id === input.id);
      if (idx === -1) {
        return [updatedPlayer, ...currentPlayers];
      }

      return currentPlayers.map((player) =>
        player.id === input.id ? updatedPlayer : player
      );
    });

    return {
      player: updatedPlayer,
      levelChanged: nextKyc !== current.kycLevel,
      newRestrictionsApplied: appliedRestrictions.length > 0,
      appliedRestrictions,
    };
  };

  const applySelfExclusion = (input: {
    id: string;
    username: string;
    duration: SelfExclusionDuration;
    reason: string;
  }) => {
    const now = Date.now();
    const durationMsByValue: Record<Exclude<SelfExclusionDuration, "permanent">, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const existing = players.find((player) => player.id === input.id);
    const current: Player = existing ?? {
      id: input.id,
      username: input.username,
      kycLevel: "L0",
      recommendedKycLevel: null,
      limits: getLimitsForLevel("L0"),
      restriction: null,
      restrictions: [],
      isSelfExcluded: false,
      selfExclusionReason: "",
      selfExclusionUntil: null,
      flags: [],
      deviceCount: 1,
      ipCountry: "",
      accountCountry: "",
      totalDeposits: 0,
      depositCount: 0,
      withdrawalCount: 0,
      lastDepositTimestamp: 0,
      lastBetTimestamp: 0,
      betCountLastMinute: 0,
      bonusesUsed: 0,
      riskScore: 0,
      riskHistory: [],
      lastRiskUpdate: 0,
    };
    const selfExclusionUntil =
      input.duration === "permanent" ? null : now + durationMsByValue[input.duration];

    const mergedSeRestrictions = Array.from(
      new Set<RestrictionType>([...current.restrictions, "Full Account Block"])
    );
    const updatedPlayer: Player = {
      ...current,
      username: input.username || current.username,
      restriction: getPrimaryRestriction(mergedSeRestrictions),
      restrictions: mergedSeRestrictions,
      isSelfExcluded: true,
      selfExclusionReason: input.reason,
      selfExclusionUntil,
    };

    setPlayers((currentPlayers) => {
      const idx = currentPlayers.findIndex((player) => player.id === input.id);
      if (idx === -1) {
        return [updatedPlayer, ...currentPlayers];
      }
      return currentPlayers.map((player) =>
        player.id === input.id ? updatedPlayer : player
      );
    });

    return updatedPlayer;
  };

  const clearExpiredSelfExclusion = (id: string) => {
    const current = players.find((player) => player.id === id);
    if (!current) return undefined;
    if (!current.isSelfExcluded || current.selfExclusionUntil === null) return current;
    if (Date.now() <= current.selfExclusionUntil) return current;

    const updatedPlayer: Player = {
      ...current,
      isSelfExcluded: false,
      selfExclusionReason: "",
      selfExclusionUntil: null,
      restriction: getPrimaryRestriction(current.restrictions),
    };

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === id ? updatedPlayer : player))
    );

    return updatedPlayer;
  };

  const clearRestrictions = (playerId: string) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId
          ? { ...player, restrictions: [], restriction: null }
          : player
      )
    );
  };

  const getPlayerById = (id: string) => players.find((player) => player.id === id);
  const resetPlayers = () => {
    setPlayers([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PLAYERS_STORAGE_KEY);
    }
  };

  return (
    <PlayersContext.Provider
      value={{
        players,
        applyTriggerToPlayer,
        applySelfExclusion,
        clearExpiredSelfExclusion,
        clearRestrictions,
        getPlayerById,
        resetPlayers,
        canDeposit,
        canWithdraw,
        canPlayCasino,
      }}
    >
      {children}
    </PlayersContext.Provider>
  );
}

export function usePlayers() {
  const context = useContext(PlayersContext);
  if (!context) {
    throw new Error("usePlayers must be used within PlayersProvider");
  }
  return context;
}
