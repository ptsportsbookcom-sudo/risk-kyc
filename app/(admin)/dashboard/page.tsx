"use client";

import { useEffect, useMemo, useState } from "react";

type StoredCase = {
  userId: string;
  status: string;
  restrictions?: string[];
};

export default function DashboardPage() {
  const readStorage = () => {
    const fallback = { cases: [] as StoredCase[], activeSessions: 0 };
    if (typeof window === "undefined") return fallback;
    try {
      const rawCases =
        window.localStorage.getItem("kycCases") ?? window.localStorage.getItem("kyc_cases");
      const parsedCases = rawCases ? (JSON.parse(rawCases) as StoredCase[]) : [];
      const rawSimResults = window.localStorage.getItem("simulationResults");
      const parsedSimResults = rawSimResults ? (JSON.parse(rawSimResults) as unknown[]) : [];
      return {
        cases: Array.isArray(parsedCases) ? parsedCases : [],
        activeSessions: Array.isArray(parsedSimResults) ? parsedSimResults.length : 0,
      };
    } catch {
      return fallback;
    }
  };
  const initial = typeof window === "undefined" ? { cases: [], activeSessions: 0 } : readStorage();
  const [cases, setCases] = useState<StoredCase[]>(initial.cases);
  const [activeSessionsFromSim, setActiveSessionsFromSim] = useState(initial.activeSessions);

  useEffect(() => {
    const onUpdated = () => {
      const next = readStorage();
      setCases(next.cases);
      setActiveSessionsFromSim(next.activeSessions);
    };
    window.addEventListener("kyc-data-updated", onUpdated);
    window.addEventListener("storage", onUpdated);
    return () => {
      window.removeEventListener("kyc-data-updated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const metrics = useMemo(() => {
    const totalUsers = new Set(cases.map((item) => item.userId)).size;
    const pendingCases = cases.filter((item) => item.status.toLowerCase() === "pending");
    const blockedUsers = cases.filter((item) =>
      (item.restrictions ?? []).includes("Full Account Block")
    ).length;
    const activeSessions = activeSessionsFromSim > 0 ? activeSessionsFromSim : totalUsers;

    return {
      totalUsers,
      pendingCasesCount: pendingCases.length,
      blockedUsers,
      activeSessions,
    };
  }, [cases, activeSessionsFromSim]);

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

  const showEmptyState = cases.length === 0;

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
