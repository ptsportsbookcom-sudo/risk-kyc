"use client";

import { useEffect, useMemo } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

export default function DashboardPage() {
  const { players } = usePlayers();
  const { cases } = useKycCases();

  const metrics = useMemo(() => {
    const totalUsers = players.length;
    const validUserIds = new Set(players.map((player) => player.id));
    const linkedCases = cases.filter((item) => validUserIds.has(item.userId));
    const pendingCases = linkedCases.filter(
      (item) => item.status.toLowerCase() === "pending"
    );
    const blockedUsers = players.filter(
      (player) => player.restriction !== null || player.isSelfExcluded
    ).length;
    const activeSessions = totalUsers;

    return {
      totalUsers,
      pendingCasesCount: pendingCases.length,
      blockedUsers,
      activeSessions,
    };
  }, [players, cases]);

  useEffect(() => {
    console.log("players:", metrics.totalUsers);
    console.log("cases:", cases.length);
    console.log("pending:", metrics.pendingCasesCount);
  }, [metrics.totalUsers, metrics.pendingCasesCount, cases.length]);

  const dashboardStats = [
    { label: "Total Users", value: metrics.totalUsers.toLocaleString() },
    { label: "KYC Pending", value: metrics.pendingCasesCount.toLocaleString() },
    { label: "Blocked Users", value: metrics.blockedUsers.toLocaleString() },
    { label: "Active Sessions", value: metrics.activeSessions.toLocaleString() },
  ];

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
