"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { RestrictionType } from "@/app/components/rules-context";
import { VerificationType } from "@/app/components/kyc-cases-context";

export type KycLevel = "L0" | "L2" | "L3";
export type PlayerLimits = {
  maxDeposit: number | null;
  canWithdraw: boolean;
  canPlayCasino: boolean;
};

export type Player = {
  id: string;
  username: string;
  kycLevel: KycLevel;
  limits: PlayerLimits;
  restrictions: RestrictionType[];
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
};

type ApplyTriggerInput = {
  id: string;
  username: string;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
  flags?: string[];
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
  getPlayerById: (id: string) => Player | undefined;
};

const PLAYERS_STORAGE_KEY = "kyc_players";
const levelRank: Record<KycLevel, number> = {
  L0: 0,
  L2: 2,
  L3: 3,
};

export function getKycLevel(verificationRequired: VerificationType[]): KycLevel {
  if (verificationRequired.includes("Full KYC")) {
    return "L3";
  }
  if (
    verificationRequired.includes("ID") ||
    verificationRequired.includes("Selfie") ||
    verificationRequired.includes("Proof")
  ) {
    return "L2";
  }
  return "L0";
}

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
        ? parsedPlayers.map((player) => ({
            ...player,
            limits: getLimitsForLevel(player.kycLevel),
            restrictions: Array.isArray(player.restrictions) ? player.restrictions : [],
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
          }))
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
      limits: getLimitsForLevel("L0"),
      restrictions: [],
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
    };

    const newLevel = getKycLevel(input.verificationRequired);
    const nextLevel =
      levelRank[newLevel] > levelRank[current.kycLevel]
        ? newLevel
        : current.kycLevel;

    const mergedRestrictions = Array.from(
      new Set<RestrictionType>([...current.restrictions, ...input.restrictions])
    );
    const appliedRestrictions = mergedRestrictions.filter(
      (item) => !current.restrictions.includes(item)
    );
    const mergedFlags = Array.from(new Set([...current.flags, ...(input.flags ?? [])]));

    const updatedPlayer: Player = {
      ...current,
      username: input.username || current.username,
      kycLevel: nextLevel,
      limits: getLimitsForLevel(nextLevel),
      restrictions: mergedRestrictions,
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
      levelChanged: nextLevel !== current.kycLevel,
      newRestrictionsApplied: appliedRestrictions.length > 0,
      appliedRestrictions,
    };
  };

  const getPlayerById = (id: string) => players.find((player) => player.id === id);

  return (
    <PlayersContext.Provider value={{ players, applyTriggerToPlayer, getPlayerById }}>
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
