"use client";

import { useMemo } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

export default function DashboardPage() {
  const { players } = usePlayers();
  const { cases } = useKycCases();

  const dashboardStats = useMemo(() => {
    const totalUsers = players.length;
    const kycPending = cases.filter((item) => item.status.toLowerCase() === "pending").length;
    const blockedUsers = players.filter(
      (player) => player.restriction !== null || player.isSelfExcluded
    ).length;
    const activeSessions = totalUsers;

    return [
      { label: "Total Users", value: totalUsers.toLocaleString() },
      { label: "KYC Pending", value: kycPending.toLocaleString() },
      { label: "Blocked Users", value: blockedUsers.toLocaleString() },
      { label: "Active Sessions", value: activeSessions.toLocaleString() },
    ];
  }, [players, cases]);

  const showEmptyState = players.length === 0 && cases.length === 0;

  return (
    <section className="space-y-6">
      <p className="text-sm text-slate-600">
        Overview of platform activity and KYC health metrics.
      </p>

      {showEmptyState ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Run simulation or create cases to see dashboard metrics
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {stat.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
