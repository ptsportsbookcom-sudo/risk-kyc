"use client";

import {
  canDeposit as playerCanDeposit,
  canPlayCasino as playerCanPlayCasino,
  canWithdraw as playerCanWithdraw,
  type PlayerEnforcementSnapshot,
} from "@/app/components/players-context";
import { RestrictionType } from "@/app/components/rules-context";

export type ActionType = "deposit" | "withdrawal" | "casino" | "sports";

/**
 * Enforcement uses only `restrictions` + self-exclusion fields.
 * `restriction` (singular) is optional and display-only; omit it for new call sites.
 */
export type EnforcementCheckInput = PlayerEnforcementSnapshot & {
  restriction?: RestrictionType | null;
};

function warnIfSingularRestrictionWithoutArray(input: EnforcementCheckInput | null | undefined) {
  if (process.env.NODE_ENV !== "development" || !input) return;
  if (
    input.restriction != null &&
    input.restriction !== undefined &&
    (!input.restrictions || input.restrictions.length === 0)
  ) {
    console.warn(
      "[enforcement] Singular `restriction` passed without `restrictions`. Enforcement uses only `player.restrictions`; update the call site."
    );
  }
}

export function checkSelfExclusionExpiry(
  player: EnforcementCheckInput
): PlayerEnforcementSnapshot {
  const restrictions = player.restrictions ?? [];

  if (!player.isSelfExcluded) {
    return {
      restrictions,
      isSelfExcluded: false,
      selfExclusionUntil: player.selfExclusionUntil ?? null,
    };
  }
  if (player.selfExclusionUntil === null || player.selfExclusionUntil === undefined) {
    return {
      restrictions,
      isSelfExcluded: true,
      selfExclusionUntil: null,
    };
  }
  if (Date.now() <= player.selfExclusionUntil) {
    return {
      restrictions,
      isSelfExcluded: true,
      selfExclusionUntil: player.selfExclusionUntil,
    };
  }

  return {
    restrictions,
    isSelfExcluded: false,
    selfExclusionUntil: null,
  };
}

export function canUserPerformAction(
  player: EnforcementCheckInput | null | undefined,
  action: ActionType
) {
  warnIfSingularRestrictionWithoutArray(player ?? undefined);

  const snap = player ? checkSelfExclusionExpiry(player) : null;
  if (!snap) return true;
  if (snap.isSelfExcluded) return false;

  if (action === "deposit") return playerCanDeposit(snap);
  if (action === "withdrawal") return playerCanWithdraw(snap);
  return playerCanPlayCasino(snap);
}
