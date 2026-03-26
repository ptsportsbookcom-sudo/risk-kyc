"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

type PlayerAction = "Deposit" | "Withdraw" | "Play Casino";

export default function PlayerActionsPage() {
  const router = useRouter();
  const { cases } = useKycCases();
  const { getPlayerById } = usePlayers();
  const [message, setMessage] = useState("");

  const pendingCase = cases.find((item) => item.status === "Pending");
  const player = pendingCase ? getPlayerById(pendingCase.userId) : undefined;
  const restrictions = player?.restrictions ?? pendingCase?.restrictions ?? [];

  const tryAction = (action: PlayerAction) => {
    if (action === "Withdraw" && restrictions.includes("Withdrawal Block")) {
      router.push(
        "/player?reason=Complete%20verification%20to%20withdraw"
      );
      return;
    }

    if (action === "Deposit" && restrictions.includes("Deposit Block")) {
      router.push("/player?reason=Complete%20verification%20to%20deposit");
      return;
    }

    if (action === "Play Casino" && restrictions.includes("Casino Block")) {
      router.push("/player?reason=Complete%20verification%20to%20play%20casino");
      return;
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
