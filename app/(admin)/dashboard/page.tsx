"use client";

import { useMemo } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";

export default function DashboardPage() {
  const { cases } = useKycCases();
  const metrics = useMemo(() => {
    const totalCases = cases.length;
    const totalUsers = new Set(cases.map((c) => c.userId)).size;
    const pendingCases = cases.filter((c) => c.status === "Pending").length;
    const approvedCases = cases.filter((c) => c.status === "Approved").length;
    const rejectedCases = cases.filter((c) => c.status === "Rejected").length;

    const riskBuckets = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    } as Record<"Low" | "Medium" | "High" | "Critical", number>;

    const highRiskUsersSet = new Set<string>();
    const criticalUsersSet = new Set<string>();

    const signalCounts = new Map<string, number>();
    const ruleCounts = new Map<string, number>();
    const restrictionCounts = new Map<string, number>();

    cases.forEach((c) => {
      const score =
        typeof c.riskScore === "number" && Number.isFinite(c.riskScore)
          ? c.riskScore
          : 0;

      if (score >= 80) riskBuckets.Critical += 1;
      else if (score >= 60) riskBuckets.High += 1;
      else if (score >= 40) riskBuckets.Medium += 1;
      else riskBuckets.Low += 1;

      if (score >= 60) highRiskUsersSet.add(c.userId);
      if (score >= 80) criticalUsersSet.add(c.userId);

      (c.fraudFlags ?? []).forEach((signal) => {
        signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1);
      });

      (c.triggeredRules ?? []).forEach((r) => {
        ruleCounts.set(r.name, (ruleCounts.get(r.name) ?? 0) + 1);
      });

      (c.restrictions ?? []).forEach((r) => {
        restrictionCounts.set(r, (restrictionCounts.get(r) ?? 0) + 1);
      });
    });

    const topFraudSignals = Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topTriggeredRules = Array.from(ruleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalCases,
      totalUsers,
      pendingCases,
      approvedCases,
      rejectedCases,
      highRiskUsers: highRiskUsersSet.size,
      criticalUsers: criticalUsersSet.size,
      riskBuckets,
      topFraudSignals,
      topTriggeredRules,
      restrictionCounts,
    };
  }, [cases]);

  const showEmptyState = cases.length === 0;
  const lastUpdated = new Date().toLocaleString();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">Risk & KYC Overview</p>
          <p className="text-xs text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {showEmptyState ? null : (
        <div className="grid gap-3 sm:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Total Users</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.totalUsers.toLocaleString()}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">
              High Risk Users (by case risk)
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.highRiskUsers.toLocaleString()}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">
              Critical Users (by case risk)
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.criticalUsers.toLocaleString()}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Pending Cases</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.pendingCases.toLocaleString()}
            </p>
          </article>
        </div>
      )}

      {showEmptyState ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Run simulation or create cases to see dashboard metrics
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Cases</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {metrics.totalCases.toLocaleString()}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {metrics.pendingCases.toLocaleString()}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Approved</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {metrics.approvedCases.toLocaleString()}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Rejected</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {metrics.rejectedCases.toLocaleString()}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6 space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Risk Distribution</p>
            <p className="mt-1 text-xs text-slate-500">
              By <span className="font-medium text-slate-600">Case Risk Score</span> on each case
              (engine at case creation): Low (0–39), Medium (40–59), High (60–79), Critical (80+).
              Player rolling risk is not used here.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Low", metrics.riskBuckets.Low],
                  ["Medium", metrics.riskBuckets.Medium],
                  ["High", metrics.riskBuckets.High],
                  ["Critical", metrics.riskBuckets.Critical],
                ] as Array<[string, number]>
              ).map(([label, count]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{count}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Top Fraud Signals</p>
            {metrics.topFraudSignals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {metrics.topFraudSignals.map(([signal, count]) => (
                  <li key={signal} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{signal}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="xl:col-span-6 space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Top Triggered Rules</p>
            {metrics.topTriggeredRules.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {metrics.topTriggeredRules.map(([ruleName, count]) => (
                  <li key={ruleName} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{ruleName}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Restrictions Breakdown</p>
            <ul className="mt-3 space-y-1">
              {(
                [
                  "Withdrawal Block",
                  "Deposit Block",
                  "Casino Block",
                  "Full Account Block",
                ] as string[]
              ).map((restriction) => (
                <li key={restriction} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{restriction}</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {metrics.restrictionCounts.get(restriction) ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
