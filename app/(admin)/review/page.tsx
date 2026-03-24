"use client";

import { useMemo, useState } from "react";

type VerificationType = "ID" | "Selfie" | "Proof";
type ReviewStatus = "Pending" | "Approved" | "Rejected";

type KycRow = {
  userId: string;
  username: string;
  verificationType: VerificationType;
  status: ReviewStatus;
  uploadedDate: string;
};

const mockRows: KycRow[] = [
  {
    userId: "USR-1001",
    username: "alex_turner",
    verificationType: "ID",
    status: "Pending",
    uploadedDate: "2026-03-24",
  },
  {
    userId: "USR-1002",
    username: "maya_chen",
    verificationType: "Selfie",
    status: "Approved",
    uploadedDate: "2026-03-23",
  },
  {
    userId: "USR-1003",
    username: "john_k",
    verificationType: "Proof",
    status: "Rejected",
    uploadedDate: "2026-03-23",
  },
  {
    userId: "USR-1004",
    username: "sofia_lane",
    verificationType: "ID",
    status: "Pending",
    uploadedDate: "2026-03-22",
  },
  {
    userId: "USR-1005",
    username: "omar_n",
    verificationType: "Selfie",
    status: "Pending",
    uploadedDate: "2026-03-22",
  },
  {
    userId: "USR-1006",
    username: "liam_rivera",
    verificationType: "Proof",
    status: "Approved",
    uploadedDate: "2026-03-21",
  },
  {
    userId: "USR-1007",
    username: "nina_b",
    verificationType: "ID",
    status: "Rejected",
    uploadedDate: "2026-03-21",
  },
  {
    userId: "USR-1008",
    username: "dario_v",
    verificationType: "Selfie",
    status: "Pending",
    uploadedDate: "2026-03-20",
  },
  {
    userId: "USR-1009",
    username: "emma_stone",
    verificationType: "Proof",
    status: "Approved",
    uploadedDate: "2026-03-20",
  },
  {
    userId: "USR-1010",
    username: "ryan_mills",
    verificationType: "ID",
    status: "Pending",
    uploadedDate: "2026-03-19",
  },
];

function statusClass(status: ReviewStatus) {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (status === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

export default function ReviewPage() {
  const [rows, setRows] = useState<KycRow[]>(mockRows);
  const [statusFilter, setStatusFilter] = useState<"All" | ReviewStatus>("All");
  const [verificationFilter, setVerificationFilter] = useState<
    "All" | VerificationType
  >("All");
  const [usernameQuery, setUsernameQuery] = useState("");

  const updateRowStatus = (userId: string, status: ReviewStatus) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.userId === userId ? { ...row, status } : row))
    );
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "All" ? true : row.status === statusFilter;
      const matchesVerification =
        verificationFilter === "All"
          ? true
          : row.verificationType === verificationFilter;
      const matchesUsername = row.username
        .toLowerCase()
        .includes(usernameQuery.toLowerCase().trim());

      return matchesStatus && matchesVerification && matchesUsername;
    });
  }, [rows, statusFilter, verificationFilter, usernameQuery]);

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
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Uploaded Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.userId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {row.userId}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.username}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {row.verificationType}
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
                    {row.uploadedDate}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => updateRowStatus(row.userId, "Approved")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        aria-label={`Approve ${row.username}`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRowStatus(row.userId, "Rejected")}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                        aria-label={`Reject ${row.username}`}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No users match the selected filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
