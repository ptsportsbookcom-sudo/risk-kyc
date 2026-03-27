"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";

function toSourceLabel(source: "manual" | "simulation" | "self-exclusion" | undefined) {
  if (source === "manual") return "manual";
  if (source === "self-exclusion") return "self_exclusion";
  return "rule";
}

export default function CaseManagementDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { cases } = useKycCases();
  const { getPlayerById } = usePlayers();

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
  const decisionFlags = selectedCase.flags ?? [];
  const triggeredRules = selectedCase.triggeredRules ?? [];
  const fraudFlags = selectedCase.fraudFlags ?? selectedCase.flags ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">Case Management</h3>
          <Link
            href="/review"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Review
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoItem label="User ID" value={selectedCase.userId} />
          <InfoItem label="Status" value={selectedCase.status} />
          <InfoItem label="KYC Level" value={selectedCase.kycLevel} />
          <InfoItem label="Restriction" value={resolvedRestriction} />
          <InfoItem
            label="Flags"
            value={decisionFlags.length > 0 ? decisionFlags.join(", ") : "None"}
          />
          <InfoItem label="Source" value={toSourceLabel(selectedCase.source)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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

