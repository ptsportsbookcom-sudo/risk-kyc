"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KycCase,
  ReviewStatus,
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

type KycCaseWithRisk = KycCase & { riskScore?: number };

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

function getRiskColorClass(score: number) {
  if (score >= 80) return "text-red-600";
  if (score >= 60) return "text-orange-600";
  if (score >= 40) return "text-yellow-600";
  return "text-green-600";
}

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getRiskBadgeClass(level: RiskLevel) {
  if (level === "Critical")
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (level === "High") return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  if (level === "Medium")
    return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
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
  const [riskLevelFilter, setRiskLevelFilter] = useState<"All" | RiskLevel>(
    "All"
  );
  const [fraudSignalFilter, setFraudSignalFilter] = useState<string>("All");

  const [caseUiActions, setCaseUiActions] = useState<
    Record<string, { escalated: boolean; falsePositive: boolean }>
  >({});

  const allFraudSignals = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      (c.fraudFlags ?? []).forEach((f) => set.add(f));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const filteredRows = useMemo(() => {
    return cases.filter((row) => {
      const matchesStatus =
        statusFilter === "All" ? true : row.status === statusFilter;
      const verificationRequired = row.verificationRequired as unknown;
      const matchesVerification =
        verificationFilter === "All"
          ? true
          : Array.isArray(verificationRequired)
            ? verificationRequired.includes(verificationFilter)
            : verificationRequired === verificationFilter;

      const query = usernameQuery.toLowerCase().trim();
      const matchesSearch =
        query.length === 0
          ? true
          : row.username.toLowerCase().includes(query) ||
            row.userId.toLowerCase().includes(query);

      const score = typeof row.riskScore === "number" ? row.riskScore : 0;
      const rowRiskLevel = getRiskLevel(score);
      const matchesRiskLevel =
        riskLevelFilter === "All" ? true : rowRiskLevel === riskLevelFilter;

      const matchesFraudSignal =
        fraudSignalFilter === "All"
          ? true
          : (row.fraudFlags ?? []).includes(fraudSignalFilter);

      return (
        matchesStatus &&
        matchesVerification &&
        matchesSearch &&
        matchesRiskLevel &&
        matchesFraudSignal
      );
    });
  }, [
    cases,
    statusFilter,
    verificationFilter,
    usernameQuery,
    riskLevelFilter,
    fraudSignalFilter,
  ]);

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">KYC Review</h3>
        <p className="mt-1 text-sm text-slate-600">
          Review and process identity verification requests.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Risk Score is calculated based on triggered rules and fraud signals. Higher score
          indicates higher fraud risk.
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
            Search User ID / Username
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

        <div className="space-y-1">
          <label
            htmlFor="riskLevelFilter"
            className="text-sm font-medium text-slate-700"
          >
            Risk Level
          </label>
          <select
            id="riskLevelFilter"
            value={riskLevelFilter}
            onChange={(event) =>
              setRiskLevelFilter(event.target.value as "All" | RiskLevel)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="All">All levels</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="fraudSignalFilter"
            className="text-sm font-medium text-slate-700"
          >
            Fraud Signal
          </label>
          <select
            id="fraudSignalFilter"
            value={fraudSignalFilter}
            onChange={(event) => setFraudSignalFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="All">All signals</option>
            {allFraudSignals.map((signal) => (
              <option key={signal} value={signal}>
                {signal}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="hidden overflow-x-auto sm:block">
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
                  KYC (current / rec.)
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Risk
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
                const c = row as KycCaseWithRisk;
                const ruleCount = c.triggeredRules?.length || 0;
                const signalCount = c.fraudFlags?.length || 0;
                const ruleScore = ruleCount * 15;
                const signalScore = signalCount * 20;
                const displayRiskScore =
                  typeof c.riskScore === "number" ? c.riskScore : 0;
                const riskColorClass = getRiskColorClass(displayRiskScore);
                const riskLevel = getRiskLevel(displayRiskScore);
                const ui = caseUiActions[row.id] ?? {
                  escalated: false,
                  falsePositive: false,
                };
                return (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-50/70"
                  onClick={() => router.push(`/cases/${row.id}`)}
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
                    {Array.isArray(row.verificationRequired)
                      ? row.verificationRequired.join(", ") || "None"
                      : row.verificationRequired ?? "None"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>
                      Current:{" "}
                      <span className="font-medium">
                        {player?.kycLevel ?? row.kycLevel}
                      </span>
                    </div>
                    {row.recommendedKycLevel ||
                    row.finalDecision?.kycLevel ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        Recommended:{" "}
                        {row.recommendedKycLevel ?? row.finalDecision?.kycLevel}
                      </div>
                    ) : null}
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
                  <td
                    className="px-4 py-3 text-sm text-slate-700 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className={`flex items-center gap-2 font-semibold ${riskColorClass}`}>
                      Risk Score: {displayRiskScore}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskBadgeClass(
                          riskLevel
                        )}`}
                      >
                        {riskLevel}
                      </span>
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Risk Score Explanation
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                      <li>
                        Rules: {ruleCount} → {ruleScore}
                      </li>
                      <li>
                        Fraud Signals: {signalCount} → {signalScore}
                      </li>
                    </ul>
                    <p className="mt-2 text-[11px] leading-snug text-slate-500">
                      Risk Score = Rules × 15 + Fraud Signals × 20 (max 100)
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Fraud Signals:
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {c.fraudFlags?.length
                        ? c.fraudFlags.join(", ")
                        : "None"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Triggered Rules:
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {c.triggeredRules?.length
                        ? c.triggeredRules.map((r) => r.name).join(", ")
                        : "None"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Decision
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateCaseStatus(row.id, "Approved");
                        }}
                        className="min-h-11 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
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
                        className="min-h-11 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                        aria-label={`Reject ${row.username}`}
                      >
                        Reject
                      </button>
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCaseUiActions((current) => ({
                            ...current,
                            [row.id]: { ...ui, escalated: true, falsePositive: ui.falsePositive },
                          }));
                        }}
                        disabled={ui.escalated || ui.falsePositive}
                        className="min-h-11 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Escalate ${row.username}`}
                      >
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCaseUiActions((current) => ({
                            ...current,
                            [row.id]: { ...ui, falsePositive: true, escalated: ui.escalated },
                          }));
                        }}
                        disabled={ui.falsePositive || ui.escalated}
                        className="min-h-11 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Mark false positive ${row.username}`}
                      >
                        Mark as False Positive
                      </button>
                    </div>

                    {(ui.escalated || ui.falsePositive) ? (
                      <div className="mt-2 flex justify-end">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                            ui.escalated
                              ? "bg-amber-50 text-amber-800 ring-amber-200"
                              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          }`}
                        >
                          {ui.escalated ? "Escalated" : "False Positive"}
                        </span>
                      </div>
                    ) : null}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 sm:hidden">
          {filteredRows.map((row) => {
            const player = getPlayerById(row.userId);
            const resolvedRestriction = player?.restriction ?? row.restrictions?.[0] ?? "None";
            const flags = row.flags && row.flags.length > 0 ? row.flags.join(", ") : "None";
            const c = row as KycCaseWithRisk;
            const ruleCount = c.triggeredRules?.length || 0;
            const signalCount = c.fraudFlags?.length || 0;
            const ruleScore = ruleCount * 15;
            const signalScore = signalCount * 20;
            const displayRiskScore =
              typeof c.riskScore === "number" ? c.riskScore : 0;
            const riskColorClass = getRiskColorClass(displayRiskScore);
            const riskLevel = getRiskLevel(displayRiskScore);
            const ui = caseUiActions[row.id] ?? {
              escalated: false,
              falsePositive: false,
            };
            return (
              <article
                key={row.id}
                className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                onClick={() => router.push(`/cases/${row.id}`)}
              >
                <p className="text-sm font-semibold text-slate-900">{row.userId}</p>
                <p className="text-sm text-slate-700">Status: {row.status}</p>
                <p className="text-sm text-slate-700">
                  Current KYC: {player?.kycLevel ?? row.kycLevel}
                </p>
                {row.recommendedKycLevel || row.finalDecision?.kycLevel ? (
                  <p className="text-xs text-slate-500">
                    Recommended (engine):{" "}
                    {row.recommendedKycLevel ?? row.finalDecision?.kycLevel}
                  </p>
                ) : null}
                <div
                  className="space-y-1 border-t border-slate-200 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={`flex items-center gap-2 text-sm font-semibold ${riskColorClass}`}>
                    Risk Score: {displayRiskScore}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskBadgeClass(
                        riskLevel
                      )}`}
                    >
                      {riskLevel}
                    </span>
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk Score Explanation
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                    <li>
                      Rules: {ruleCount} → {ruleScore}
                    </li>
                    <li>
                      Fraud Signals: {signalCount} → {signalScore}
                    </li>
                  </ul>
                  <p className="text-[11px] leading-snug text-slate-500">
                    Risk Score = Rules × 15 + Fraud Signals × 20 (max 100)
                  </p>
                  <p className="text-xs font-semibold text-slate-600">Fraud Signals:</p>
                  <p className="text-xs text-slate-600">
                    {c.fraudFlags?.length ? c.fraudFlags.join(", ") : "None"}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">Triggered Rules:</p>
                  <p className="text-xs text-slate-600">
                    {c.triggeredRules?.length
                      ? c.triggeredRules.map((r) => r.name).join(", ")
                      : "None"}
                  </p>
                </div>
                <p className="text-sm text-slate-700">Flags: {flags}</p>
                <p className="text-sm text-slate-700">Restriction: {resolvedRestriction}</p>

                <div
                  className="space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Decision
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaseUiActions((current) => ({
                          ...current,
                          [row.id]: {
                            ...ui,
                            escalated: true,
                            falsePositive: ui.falsePositive,
                          },
                        }));
                      }}
                      disabled={ui.escalated || ui.falsePositive}
                      className="min-h-9 rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Escalate ${row.username}`}
                    >
                      Escalate
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaseUiActions((current) => ({
                          ...current,
                          [row.id]: {
                            ...ui,
                            falsePositive: true,
                            escalated: ui.escalated,
                          },
                        }));
                      }}
                      disabled={ui.falsePositive || ui.escalated}
                      className="min-h-9 rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Mark false positive ${row.username}`}
                    >
                      False Positive
                    </button>
                  </div>
                  {(ui.escalated || ui.falsePositive) ? (
                    <div className="flex justify-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          ui.escalated
                            ? "bg-amber-50 text-amber-800 ring-amber-200"
                            : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        }`}
                      >
                        {ui.escalated ? "Escalated" : "False Positive"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {cases.length === 0 || filteredRows.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No cases found</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
