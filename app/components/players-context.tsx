"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { RestrictionType } from "@/app/components/rules-context";
import { VerificationType } from "@/app/components/kyc-cases-context";

export type KycLevel = "L0" | "L1" | "L2" | "L3";

export type Player = {
  id: string;
  username: string;
  kycLevel: KycLevel;
  restrictions: RestrictionType[];
  flags: string[];
};

type ApplyTriggerInput = {
  id: string;
  username: string;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
  flags?: string[];
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
  L1: 1,
  L2: 2,
  L3: 3,
};

export function getRequiredLevel(verificationRequired: VerificationType[]): KycLevel {
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
  return "L1";
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
      setPlayers(Array.isArray(parsedPlayers) ? parsedPlayers : []);
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
      restrictions: [],
      flags: [],
    };

    const requiredLevel = getRequiredLevel(input.verificationRequired);
    const nextLevel =
      levelRank[requiredLevel] > levelRank[current.kycLevel]
        ? requiredLevel
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
      restrictions: mergedRestrictions,
      flags: mergedFlags,
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
