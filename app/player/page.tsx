"use client";

import Link from "next/link";
import {
  DocumentType,
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";

function getRequiredDocumentTypes(verificationRequired: VerificationType[]) {
  if (verificationRequired.includes("Full KYC")) {
    return ["ID", "Selfie", "Proof"] as DocumentType[];
  }

  return verificationRequired.filter(
    (item): item is DocumentType => item === "ID" || item === "Selfie" || item === "Proof"
  );
}

function documentStatusClass(status: "Pending" | "Approved" | "Rejected") {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

export default function PlayerKycPage() {
  const { cases, uploadDocument } = useKycCases();
  const pendingCase = cases.find((item) => item.status === "Pending");
  const reason =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("reason")
      : null;

  if (!pendingCase) {
    return (
      <main className="mx-auto w-full max-w-2xl p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Verification Required
          </h1>
          {reason ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
              {reason}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-slate-700">Your account is verified.</p>
          <Link
            href="/player/actions"
            className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Open Action Panel
          </Link>
        </section>
      </main>
    );
  }

  const requiredDocuments = getRequiredDocumentTypes(
    pendingCase.verificationRequired
  );

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Verification Required
        </h1>
        {reason ? (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
            {reason}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-slate-600">
          You need to complete verification to continue
        </p>

        <div className="mt-5 space-y-3">
          {requiredDocuments.map((documentType) => {
            const document = pendingCase.documents.find(
              (item) => item.type === documentType
            );

            return (
              <article
                key={documentType}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-800">{documentType}</p>

                <div className="flex items-center gap-2">
                  {document ? (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${documentStatusClass(
                        document.status
                      )}`}
                    >
                      {document.status}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => uploadDocument(pendingCase.id, documentType)}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Upload
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <Link
          href="/player/actions"
          className="mt-5 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Open Action Panel
        </Link>
      </section>
    </main>
  );
}
