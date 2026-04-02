"use client";

import { RestrictionType } from "@/app/components/rules-context";

export type ActionType = "deposit" | "withdrawal" | "casino" | "sports";

type EnforcementPlayer = {
  restriction: RestrictionType | null;
  /** When set and non-empty, overrides `restriction` for checks (source of truth). */
  restrictions?: RestrictionType[];
  isSelfExcluded?: boolean;
  selfExclusionUntil?: number | null;
};

export function checkSelfExclusionExpiry(player: EnforcementPlayer) {
  if (!player.isSelfExcluded) {
    return player;
  }
  if (player.selfExclusionUntil === null || player.selfExclusionUntil === undefined) {
    return player;
  }
  if (Date.now() <= player.selfExclusionUntil) {
    return player;
  }

  return {
    ...player,
    isSelfExcluded: false,
    selfExclusionUntil: null,
    restriction: player.restriction === "Full Account Block" ? null : player.restriction,
  };
}

function effectiveRestrictionList(player: EnforcementPlayer): RestrictionType[] {
  if (player.restrictions && player.restrictions.length > 0) {
    return player.restrictions;
  }
  return player.restriction ? [player.restriction] : [];
}

export function canUserPerformAction(
  player: EnforcementPlayer | null | undefined,
  action: ActionType
) {
  const checkedPlayer = player ? checkSelfExclusionExpiry(player) : null;
  if (checkedPlayer?.isSelfExcluded) return false;

  const list = checkedPlayer ? effectiveRestrictionList(checkedPlayer) : [];

  if (list.includes("Full Account Block")) return false;
  if (list.includes("Deposit Block") && action === "deposit") return false;
  if (list.includes("Withdrawal Block") && action === "withdrawal") return false;
  if (
    list.includes("Casino Block") &&
    (action === "casino" || action === "sports")
  ) {
    return false;
  }

  return true;
}

