"use client";

import { FormEvent, useState } from "react";
import {
  useKycCases,
  VerificationType,
} from "@/app/components/kyc-cases-context";
import { RestrictionType } from "@/app/components/rules-context";

const verificationOptions: VerificationType[] = [
  "ID",
  "Selfie",
  "Proof",
  "Full KYC",
];

const restrictionOptions: RestrictionType[] = [
  "Withdrawal Block",
  "Deposit Block",
  "Casino Block",
  "Full Account Block",
];

export default function ManualTriggerPage() {
  const { addCase } = useKycCases();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [verificationRequired, setVerificationRequired] = useState<
    VerificationType[]
  >([]);
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  const toggleVerification = (value: VerificationType) => {
    setVerificationRequired((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleRestriction = (value: RestrictionType) => {
    setRestrictions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUserId = userId.trim() || `MANUAL-${Date.now()}`;
    const normalizedUsername = username.trim() || "manual_user";

    addCase({
      userId: normalizedUserId,
      username: normalizedUsername,
      verificationRequired,
      restrictions,
    });

    setUserId("");
    setUsername("");
    setVerificationRequired([]);
    setRestrictions([]);
    setSuccessMessage("Manual KYC trigger applied successfully.");
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Manual KYC Trigger</h3>
      <p className="mt-1 text-sm text-slate-600">
        Manually create a pending KYC case with required verification and
        restrictions.
      </p>

      <form className="mt-5 space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="userId" className="text-sm font-medium text-slate-700">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="e.g. USR-2040"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="username"
              className="text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. player_one"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
        </div>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Verification Required
          </h4>
          <div className="flex flex-wrap gap-2">
            {verificationOptions.map((option) => (
              <label
                key={option}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={verificationRequired.includes(option)}
                  onChange={() => toggleVerification(option)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                {option}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Restrictions
          </h4>
          <div className="flex flex-wrap gap-2">
            {restrictionOptions.map((option) => (
              <label
                key={option}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={restrictions.includes(option)}
                  onChange={() => toggleRestriction(option)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                {option}
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Apply Trigger
          </button>

          {successMessage ? (
            <p className="text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
