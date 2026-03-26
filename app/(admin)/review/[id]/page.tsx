"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DocumentType,
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

function documentStatusClass(status: ReviewStatus) {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function getRequiredDocumentTypes(verificationRequired: VerificationType[]) {
  if (verificationRequired.includes("Full KYC")) {
    return ["ID", "Selfie", "Proof"] as DocumentType[];
  }

  return verificationRequired.filter(
    (item): item is DocumentType => item === "ID" || item === "Selfie" || item === "Proof"
  );
}

export default function CaseDetailsPage() {
  const { cases, updateCaseStatus, uploadDocument, updateDocumentStatus } =
    useKycCases();
  const { getPlayerById } = usePlayers();
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const selectedCase = cases.find((kycCase) => kycCase.id === caseId);

  if (!selectedCase) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Case Not Found</h3>
        <p className="mt-2 text-sm text-slate-600">
          This case does not exist or was cleared from local state.
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

  const requiredDocuments = getRequiredDocumentTypes(selectedCase.verificationRequired);
  const player = getPlayerById(selectedCase.userId);
  const currentRestrictions = player?.restrictions ?? selectedCase.restrictions;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Case Details</h3>
            <p className="mt-1 text-sm text-slate-600">
              Detailed review and action controls for this KYC case.
            </p>
          </div>
          <Link
            href="/review"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Review
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          1. Player Information
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <InfoItem label="User ID" value={selectedCase.userId} />
          <InfoItem label="Username" value={selectedCase.username} />
          <InfoItem
            label="KYC Level"
            value={player?.kycLevel ?? "N/A"}
          />
          <InfoItem label="Created date" value={selectedCase.createdDate} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          2. Verification Required
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedCase.verificationRequired.length > 0 ? (
            selectedCase.verificationRequired.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">None</span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          3. Restrictions
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentRestrictions.length > 0 ? (
            currentRestrictions.map((restriction) => (
              <span
                key={restriction}
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${restrictionClass(
                  restriction
                )}`}
              >
                {restriction}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">None</span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          4. Documents
        </h4>
        {requiredDocuments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No document verification required.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {requiredDocuments.map((documentType) => {
              const document = selectedCase.documents.find(
                (item) => item.type === documentType
              );

              return (
                <article
                  key={documentType}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {documentType}
                  </p>

                  {document ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${documentStatusClass(
                          document.status
                        )}`}
                      >
                        {document.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateDocumentStatus(selectedCase.id, documentType, "Approved")
                        }
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDocumentStatus(selectedCase.id, documentType, "Rejected")
                        }
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => uploadDocument(selectedCase.id, documentType)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Upload
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          5. Status
        </h4>
        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
              selectedCase.status
            )}`}
          >
            {selectedCase.status}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          6. Actions
        </h4>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => updateCaseStatus(selectedCase.id, "Approved")}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => updateCaseStatus(selectedCase.id, "Rejected")}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Reject
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </article>
  );
}
