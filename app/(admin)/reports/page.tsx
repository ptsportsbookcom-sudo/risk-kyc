"use client";

import { useEffect, useMemo, useState } from "react";

const fraudSignals = [
  "MULTI_ACCOUNT",
  "COUNTRY_MISMATCH",
  "HIGH_DEPOSIT_VELOCITY",
  "BET_VELOCITY",
  "BONUS_ABUSE",
] as const;

export default function ReportsPage() {
  const readCasesFromStorage = () => {
    const fallback: Array<{
      userId: string;
      status: string;
      kycLevel: "L0" | "L1" | "L2" | "L3";
      verificationRequired?: string[];
      flags?: string[];
      fraudFlags?: string[];
    }> = [];
    if (typeof window === "undefined") return fallback;
    try {
      const rawCases =
        window.localStorage.getItem("kycCases") ?? window.localStorage.getItem("kyc_cases");
      const parsedCases = rawCases ? JSON.parse(rawCases) : [];
      return Array.isArray(parsedCases) ? parsedCases : fallback;
    } catch {
      return fallback;
    }
  };
  const [cases, setCases] = useState(readCasesFromStorage);

  useEffect(() => {
    const onUpdated = () => setCases(readCasesFromStorage());
    window.addEventListener("kyc-data-updated", onUpdated);
    window.addEventListener("storage", onUpdated);
    return () => {
      window.removeEventListener("kyc-data-updated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const metrics = useMemo(() => {
    const totalUsers = new Set(cases.map((item) => item.userId)).size;
    const usersL0 = cases.filter((item) => item.kycLevel === "L0").length;
    const usersL1 = cases.filter((item) => item.kycLevel === "L1").length;
    const usersL2 = cases.filter((item) => item.kycLevel === "L2").length;
    const usersL3 = cases.filter((item) => item.kycLevel === "L3").length;
    const kycRequiredCount = cases.filter(
      (item) => (item.verificationRequired ?? []).length > 0
    ).length;

    const totalCases = cases.length;
    const pendingCases = cases.filter((item) => item.status === "Pending").length;
    const approvedCases = cases.filter((item) => item.status === "Approved").length;
    const rejectedCases = cases.filter((item) => item.status === "Rejected").length;

    const fraudSignalCounts = fraudSignals.map((signal) => ({
      label: signal,
      count: cases.reduce((acc, item) => {
        const caseFlags = [...(item.flags ?? []), ...(item.fraudFlags ?? [])];
        return acc + caseFlags.filter((flag) => flag === signal).length;
      }, 0),
    }));

    return {
      totalUsers,
      usersL0,
      usersL1,
      usersL2,
      usersL3,
      kycRequiredCount,
      totalCases,
      pendingCases,
      approvedCases,
      rejectedCases,
      fraudSignalCounts,
    };
  }, [cases]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">KYC Metrics</h3>
        <p className="mt-1 text-sm text-slate-600">
          KYC distribution and verification workload from current state.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Total Users" value={metrics.totalUsers} />
          <MetricCard label="KYC Required Count" value={metrics.kycRequiredCount} />
        </div>
        <h4 className="mt-5 text-base font-semibold text-slate-900">KYC Overview</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="L0" value={metrics.usersL0} />
          <MetricCard label="L1" value={metrics.usersL1} />
          <MetricCard label="L2" value={metrics.usersL2} />
          <MetricCard label="L3" value={metrics.usersL3} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Case Metrics</h3>
        <p className="mt-1 text-sm text-slate-600">Current case workload and resolution status.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Cases" value={metrics.totalCases} />
          <MetricCard label="Pending" value={metrics.pendingCases} />
          <MetricCard label="Approved" value={metrics.approvedCases} />
          <MetricCard label="Rejected" value={metrics.rejectedCases} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Fraud Metrics</h3>
        <p className="mt-1 text-sm text-slate-600">
          Frequency of key fraud indicators across all cases.
        </p>
        <h4 className="mt-5 text-base font-semibold text-slate-900">Fraud Signals</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.fraudSignalCounts.map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.count} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}
