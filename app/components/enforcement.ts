"use client";

import { RestrictionType } from "@/app/components/rules-context";

export type ActionType = "deposit" | "withdrawal" | "casino" | "sports";

type EnforcementPlayer = {
  restriction: RestrictionType | null;
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

export function canUserPerformAction(
  player: EnforcementPlayer | null | undefined,
  action: ActionType
) {
  const checkedPlayer = player ? checkSelfExclusionExpiry(player) : null;
  if (checkedPlayer?.isSelfExcluded) return false;

  const restriction = checkedPlayer?.restriction ?? null;

  if (restriction === "Full Account Block") return false;
  if (restriction === "Deposit Block" && action === "deposit") return false;
  if (restriction === "Withdrawal Block" && action === "withdrawal") return false;
  if (
    restriction === "Casino Block" &&
    (action === "casino" || action === "sports")
  ) {
    return false;
  }

  return true;
}

