"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReviewStatus,
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

function statusClass(status: ReviewStatus) {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function restrictionClass(restriction: string) {
  if (restriction === "Full Account Block") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  if (restriction === "Withdrawal Block" || restriction === "Casino Block") {
    return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  }

  return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
}

export default function ReviewPage() {
  const router = useRouter();
  const { cases, updateCaseStatus } = useKycCases();
  const { getPlayerById } = usePlayers();
  const [statusFilter, setStatusFilter] = useState<"All" | ReviewStatus>("All");
  const [verificationFilter, setVerificationFilter] = useState<
    "All" | VerificationType
  >("All");
  const [usernameQuery, setUsernameQuery] = useState("");

  const filteredRows = useMemo(() => {
    return cases.filter((row) => {
      const matchesStatus =
        statusFilter === "All" ? true : row.status === statusFilter;
      const matchesVerification =
        verificationFilter === "All"
          ? true
          : row.verificationRequired.includes(verificationFilter);
      const matchesUsername = row.username
        .toLowerCase()
        .includes(usernameQuery.toLowerCase().trim());

      return matchesStatus && matchesVerification && matchesUsername;
    });
  }, [cases, statusFilter, verificationFilter, usernameQuery]);

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">KYC Review</h3>
        <p className="mt-1 text-sm text-slate-600">
          Review and process identity verification requests.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor="statusFilter"
            className="text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "All" | ReviewStatus)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="verificationTypeFilter"
            className="text-sm font-medium text-slate-700"
          >
            Verification Type
          </label>
          <select
            id="verificationTypeFilter"
            value={verificationFilter}
            onChange={(event) =>
              setVerificationFilter(event.target.value as "All" | VerificationType)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="All">All types</option>
            <option value="ID">ID</option>
            <option value="Selfie">Selfie</option>
            <option value="Proof">Proof</option>
            <option value="Full KYC">Full KYC</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="usernameSearch"
            className="text-sm font-medium text-slate-700"
          >
            Search Username
          </label>
          <input
            id="usernameSearch"
            type="search"
            value={usernameQuery}
            onChange={(event) => setUsernameQuery(event.target.value)}
            placeholder="e.g. alex"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
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
                  Verification Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  KYC Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Created Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Restrictions
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => {
                const player = getPlayerById(row.userId);
                const resolvedRestriction = player?.restriction ?? row.restrictions?.[0] ?? null;
                return (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-50/70"
                  onClick={() => router.push(`/review/${row.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {row.userId}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>{row.username}</span>
                      {row.source === "manual" ? (
                        <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          Manual
                        </span>
                      ) : row.source === "self-exclusion" ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                          Source: Self-Exclusion
                        </span>
                      ) : null}
                    </div>
                    {row.reason ? (
                      <p className="mt-1 text-xs text-slate-500">Reason: {row.reason}</p>
                    ) : null}
                    {row.source === "self-exclusion" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Duration: {row.selfExclusionDuration ?? "Permanent"}
                        {" | "}
                        Until:{" "}
                        {row.selfExclusionUntil
                          ? new Date(row.selfExclusionUntil).toLocaleString()
                          : "Permanent"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.verificationRequired.length > 0
                      ? row.verificationRequired[0]
                      : "None"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.kycLevel}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.createdDate}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {resolvedRestriction ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${restrictionClass(
                          resolvedRestriction
                        )}`}
                      >
                        Restriction: {resolvedRestriction}
                      </span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateCaseStatus(row.id, "Approved");
                        }}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        aria-label={`Approve ${row.username}`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateCaseStatus(row.id, "Rejected");
                        }}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                        aria-label={`Reject ${row.username}`}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {cases.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No KYC cases yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Run a simulation to create the first pending case.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No cases match the selected filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
