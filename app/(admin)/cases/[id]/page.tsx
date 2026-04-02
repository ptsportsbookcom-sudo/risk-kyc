"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

function toSourceLabel(source: "manual" | "simulation" | "self-exclusion" | undefined) {
  if (source === "manual") return "manual";
  if (source === "self-exclusion") return "self_exclusion";
  return "rule";
}

function statusClass(status: string) {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

export default function CaseManagementDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { addCaseNote, auditLogs, cases, updateCaseStatus } = useKycCases();
  const { getPlayerById } = usePlayers();
  const [noteText, setNoteText] = useState("");

  const selectedCase = cases.find((item) => item.id === caseId);

  if (!selectedCase) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Case not found</h3>
        <p className="mt-1 text-sm text-slate-600">
          This case does not exist in local state.
        </p>
        <Link
          href="/review"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Review
        </Link>
      </section>
    );
  }

  const player = getPlayerById(selectedCase.userId);
  const resolvedRestriction = player?.restriction ?? selectedCase.restrictions?.[0] ?? "None";
  const activeRestrictionsText = player?.restrictions?.length
    ? player.restrictions.join(", ")
    : "None";
  const decisionFlags = selectedCase.flags ?? [];
  const triggeredRules = selectedCase.triggeredRules ?? [];
  const fraudFlags = selectedCase.fraudFlags ?? selectedCase.flags ?? [];
  const timelineItems = auditLogs
    .filter((item) => item.caseId === selectedCase.id)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const isResolved =
    selectedCase.status === "Approved" || selectedCase.status === "Rejected";

  const handleSaveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    addCaseNote(selectedCase.id, noteText);
    setNoteText("");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Case Management</h3>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                  selectedCase.status
                )}`}
              >
                Status: {selectedCase.status}
              </span>
            </div>
          </div>
          <Link
            href="/review"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
          >
            Back to Review
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoItem label="User ID" value={selectedCase.userId} />
          <InfoItem label="Status" value={selectedCase.status} />
          <InfoItem
            label="Current KYC (case / player record)"
            value={
              player?.kycLevel ?? selectedCase.kycLevel
            }
          />
          <InfoItem
            label="Recommended KYC (engine)"
            value={
              selectedCase.recommendedKycLevel ??
              selectedCase.finalDecision?.kycLevel ??
              "—"
            }
          />
          <InfoItem label="Restriction (primary)" value={resolvedRestriction} />
          <InfoItem label="Active restrictions" value={activeRestrictionsText} />
          <InfoItem
            label="Flags"
            value={decisionFlags.length > 0 ? decisionFlags.join(", ") : "None"}
          />
          <InfoItem label="Source" value={toSourceLabel(selectedCase.source)} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isResolved}
            onClick={() => updateCaseStatus(selectedCase.id, "Approved")}
            className="min-h-11 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={isResolved}
            onClick={() => updateCaseStatus(selectedCase.id, "Rejected")}
            className="min-h-11 w-full rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Reject
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Decision
        </h4>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoItem
            label="Verification Required"
            value={
              selectedCase.verificationRequired.length > 0
                ? selectedCase.verificationRequired.join(", ")
                : "None"
            }
          />
          <InfoItem label="Restriction Applied" value={resolvedRestriction} />
          <InfoItem
            label="Flags"
            value={decisionFlags.length > 0 ? decisionFlags.join(", ") : "None"}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Why this case exists
        </h4>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Triggered Rules
            </p>
            {triggeredRules.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {triggeredRules.map((rule) => (
                  <li key={rule.id}>
                    {rule.name} (priority {rule.priority})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">None</p>
            )}
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fraud Flags
            </p>
            <p className="mt-2 text-sm text-slate-800">
              {fraudFlags.length > 0 ? fraudFlags.join(", ") : "None"}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Notes
        </h4>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleSaveNote}>
          <input
            type="text"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add a case note..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
          />
          <button
            type="submit"
            className="min-h-11 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto"
          >
            Save
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {selectedCase.notes.length > 0 ? (
            selectedCase.notes.map((note, index) => (
              <article
                key={`${note.createdAt}-${index}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm text-slate-800">{note.text}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">No notes yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Timeline
        </h4>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {timelineItems.length > 0 ? (
            timelineItems.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-xs font-semibold text-slate-500">
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-sm text-slate-900">{item.description}</p>
                {item.metadata ? (
                  <p className="mt-1 text-xs text-slate-600">
                    {Object.entries(item.metadata)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(" | ")}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">No timeline events yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </article>
  );
}

