"use client";

import { useMemo } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";

const trackedRestrictions = [
  "Withdrawal Block",
  "Deposit Block",
  "Casino Block",
  "Full Account Block",
] as const;

export default function ReportsPage() {
  const { cases } = useKycCases();

  const metrics = useMemo(() => {
    const totalCases = cases.length;
    const pendingCases = cases.filter((item) => item.status === "Pending").length;
    const approvedCases = cases.filter((item) => item.status === "Approved").length;
    const rejectedCases = cases.filter((item) => item.status === "Rejected").length;

    const restrictionCounts = trackedRestrictions.map((restriction) => ({
      label: restriction,
      count: cases.filter((item) => item.restrictions.includes(restriction)).length,
    }));

    return {
      totalCases,
      pendingCases,
      approvedCases,
      rejectedCases,
      restrictionCounts,
    };
  }, [cases]);

  const recentCases = useMemo(() => cases.slice(0, 8), [cases]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
        <p className="mt-1 text-sm text-slate-600">
          Real-time case metrics powered by the shared KYC case state.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Cases" value={metrics.totalCases} />
          <MetricCard label="Pending" value={metrics.pendingCases} />
          <MetricCard label="Approved" value={metrics.approvedCases} />
          <MetricCard label="Rejected" value={metrics.rejectedCases} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">
          Total Restrictions
        </h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.restrictionCounts.map((item) => (
            <article
              key={item.label}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-medium text-slate-600">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {item.count}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Recent Cases</h4>

        {recentCases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No cases available yet. Run a simulation to generate case data.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentCases.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {item.userId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.createdDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
