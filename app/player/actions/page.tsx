"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canUserPerformAction } from "@/app/components/enforcement";
import { useKycCases, VerificationType } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";
import { handleRiskEvent, RiskEventType } from "@/app/components/risk-events";
import { RestrictionType } from "@/app/components/rules-context";
import { useRules } from "@/app/components/rules-context";

type PlayerAction = "Deposit" | "Withdraw" | "Play Casino";
const restrictionValues: RestrictionType[] = [
  "Deposit Block",
  "Withdrawal Block",
  "Casino Block",
  "Full Account Block",
];

function toRestrictionType(value: string | null | undefined): RestrictionType | null {
  if (!value) return null;
  return restrictionValues.includes(value as RestrictionType)
    ? (value as RestrictionType)
    : null;
}

export default function PlayerActionsPage() {
  const router = useRouter();
  const { cases } = useKycCases();
  const { rules } = useRules();
  const { clearExpiredSelfExclusion, getPlayerById, applyTriggerToPlayer } = usePlayers();
  const [message, setMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("50");

  const pendingCase = cases.find((item) => item.status === "Pending");
  const player = pendingCase ? getPlayerById(pendingCase.userId) : undefined;
  const restriction: RestrictionType | null =
    player?.restriction ?? toRestrictionType(pendingCase?.restrictions?.[0]);

  const tryAction = (action: PlayerAction) => {
    setMessage("");
    const refreshedPlayer =
      pendingCase?.userId ? clearExpiredSelfExclusion(pendingCase.userId) : player;
    const enforcementPlayer = {
      restriction: refreshedPlayer?.restriction ?? restriction,
      isSelfExcluded: refreshedPlayer?.isSelfExcluded ?? false,
      selfExclusionUntil: refreshedPlayer?.selfExclusionUntil ?? null,
    };

    if (!canUserPerformAction(enforcementPlayer, "withdrawal") && action === "Withdraw") {
      setMessage("Action blocked: Complete verification to withdraw.");
      router.push(
        "/player?reason=Complete%20verification%20to%20withdraw"
      );
      return;
    }

    if (!canUserPerformAction(enforcementPlayer, "deposit") && action === "Deposit") {
      setMessage("Action blocked: Complete verification to deposit.");
      router.push("/player?reason=Complete%20verification%20to%20deposit");
      return;
    }

    if (!canUserPerformAction(enforcementPlayer, "casino") && action === "Play Casino") {
      setMessage("Action blocked: Complete verification to play casino.");
      router.push("/player?reason=Complete%20verification%20to%20play%20casino");
      return;
    }

    const limits = player?.limits;
    const parsedDepositAmount = Number(depositAmount || 0);

    if (
      action === "Deposit" &&
      limits &&
      limits.maxDeposit !== null &&
      parsedDepositAmount > limits.maxDeposit
    ) {
      setMessage("Complete verification to increase your limit.");
      router.push("/player?reason=Complete%20verification%20to%20increase%20your%20limit");
      return;
    }

    if (action === "Withdraw" && limits && !limits.canWithdraw) {
      setMessage("Withdraw is blocked until you complete verification.");
      router.push("/player?reason=Complete%20verification%20to%20withdraw");
      return;
    }

    if (action === "Play Casino" && limits && !limits.canPlayCasino) {
      setMessage("Casino play is blocked until you complete verification.");
      router.push("/player?reason=Complete%20verification%20to%20play%20casino");
      return;
    }

    if (pendingCase && refreshedPlayer) {
      const now = Date.now();
      const parsedDepositAmount = Number(depositAmount || 0);
      const baseInput = {
        Transaction: {
          depositAmount: 0,
          withdrawalAmount: 0,
          totalDeposits: refreshedPlayer.totalDeposits ?? 0,
          depositCount: refreshedPlayer.depositCount ?? 0,
          withdrawalCount: refreshedPlayer.withdrawalCount ?? 0,
        },
        Player: {
          deviceCount: refreshedPlayer.deviceCount ?? 1,
          ipCountry: refreshedPlayer.ipCountry ?? "US",
          accountCountry: refreshedPlayer.accountCountry ?? "US",
          country: refreshedPlayer.accountCountry ?? "US",
          kycLevel: refreshedPlayer.kycLevel ?? "L0",
        },
        Behavior: {
          bonusesUsed: refreshedPlayer.bonusesUsed ?? 0,
          betCountLastMinute: refreshedPlayer.betCountLastMinute ?? 0,
          lastDepositTimestamp: refreshedPlayer.lastDepositTimestamp ?? 0,
          lastBetTimestamp: refreshedPlayer.lastBetTimestamp ?? 0,
          betAmount: 0,
          odds: 1,
          flags: refreshedPlayer.flags ?? [],
        },
      };

      let eventType: RiskEventType = "LOGIN";
      let input = baseInput;

      if (action === "Deposit") {
        eventType = "DEPOSIT";
        input = {
          ...baseInput,
          Transaction: {
            ...baseInput.Transaction,
            depositAmount: parsedDepositAmount,
            totalDeposits: (baseInput.Transaction.totalDeposits ?? 0) + parsedDepositAmount,
            depositCount: (baseInput.Transaction.depositCount ?? 0) + 1,
          },
          Behavior: {
            ...baseInput.Behavior,
            lastDepositTimestamp: now,
          },
        };
      } else if (action === "Withdraw") {
        eventType = "WITHDRAWAL";
        input = {
          ...baseInput,
          Transaction: {
            ...baseInput.Transaction,
            withdrawalAmount: Math.max(0, parsedDepositAmount),
            withdrawalCount: (baseInput.Transaction.withdrawalCount ?? 0) + 1,
          },
        };
      } else if (action === "Play Casino") {
        eventType = "BET";
        input = {
          ...baseInput,
          Behavior: {
            ...baseInput.Behavior,
            betAmount: 25,
            odds: 2.1,
            lastBetTimestamp: now,
            betCountLastMinute: (baseInput.Behavior.betCountLastMinute ?? 0) + 1,
          },
        };
      }

      const risk = handleRiskEvent(eventType, input, rules);
      applyTriggerToPlayer({
        id: pendingCase.userId,
        username: pendingCase.username,
        verificationRequired: (risk.decision.verification ?? []) as VerificationType[],
        restrictions: (risk.aggregatedActions.restrictions ?? []) as RestrictionType[],
        flags: risk.decision.flags ?? [],
        incomingRiskScore: risk.riskScore,
        playerSnapshot: {
          deviceCount: input.Player.deviceCount,
          ipCountry: input.Player.ipCountry,
          accountCountry: input.Player.accountCountry,
          totalDeposits: input.Transaction.totalDeposits,
          depositCount: input.Transaction.depositCount,
          withdrawalCount: input.Transaction.withdrawalCount,
          lastDepositTimestamp: input.Behavior.lastDepositTimestamp,
          lastBetTimestamp: input.Behavior.lastBetTimestamp,
          betCountLastMinute: input.Behavior.betCountLastMinute,
          bonusesUsed: input.Behavior.bonusesUsed,
        },
      });
    }

    setMessage("Action successful");
  };

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Player Action Panel
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Simulate player actions and enforce KYC restriction checks.
        </p>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Player level:{" "}
            <span className="font-semibold text-slate-900">
              {player?.kycLevel ?? "L0"}
            </span>
          </p>
          <p>
            Max deposit:{" "}
            <span className="font-semibold text-slate-900">
              {player?.limits.maxDeposit === null
                ? "Unlimited"
                : player?.limits.maxDeposit ?? 100}
            </span>
          </p>
          <p>
            Withdraw:{" "}
            <span className="font-semibold text-slate-900">
              {player?.limits.canWithdraw ? "Allowed" : "Blocked"}
            </span>
          </p>
          <p>
            Casino:{" "}
            <span className="font-semibold text-slate-900">
              {player?.limits.canPlayCasino === false ? "Blocked" : "Allowed"}
            </span>
          </p>
        </div>

        <div className="mt-4 max-w-xs space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Deposit Amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => tryAction("Deposit")}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => tryAction("Withdraw")}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => tryAction("Play Casino")}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Play Casino
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            {message}
          </p>
        ) : null}

        <Link
          href="/player"
          className="mt-5 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to KYC Page
        </Link>
      </section>
    </main>
  );
}
