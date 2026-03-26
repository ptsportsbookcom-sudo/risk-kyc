"use client";

import { RestrictionType } from "@/app/components/rules-context";

export type ActionType = "deposit" | "withdrawal" | "casino" | "sports";

export function canUserPerformAction(
  player: { restriction: RestrictionType | null } | null | undefined,
  action: ActionType
) {
  const restriction = player?.restriction ?? null;

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

