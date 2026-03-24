"use client";

import { FormEvent, useState } from "react";

type EventType =
  | "Registration"
  | "Deposit"
  | "Withdrawal"
  | "Bonus Activation"
  | "Bet Placed";
type VerificationType = "ID" | "Selfie" | "Proof" | "Full KYC";
type RiskFlag = "Multi Account" | "Suspicious Device" | "Bonus Abuse";

type SimulationResult = {
  triggeredAction: string;
  createdCaseStatus: string;
  appliedRestriction: string;
  verificationRequired: VerificationType | "None";
};

const riskFlags: RiskFlag[] = [
  "Multi Account",
  "Suspicious Device",
  "Bonus Abuse",
];

const initialResult: SimulationResult = {
  triggeredAction: "No action triggered yet",
  createdCaseStatus: "No case created",
  appliedRestriction: "None",
  verificationRequired: "None",
};

export default function SimulatorPage() {
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [verificationType, setVerificationType] =
    useState<VerificationType>("ID");
  const [amount, setAmount] = useState("");
  const [selectedRiskFlags, setSelectedRiskFlags] = useState<RiskFlag[]>([]);
  const [result, setResult] = useState<SimulationResult>(initialResult);

  const toggleRiskFlag = (flag: RiskFlag) => {
    setSelectedRiskFlags((currentFlags) =>
      currentFlags.includes(flag)
        ? currentFlags.filter((currentFlag) => currentFlag !== flag)
        : [...currentFlags, flag]
    );
  };

  const runSimulation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number(amount || 0);
    const hasBonusAbuse = selectedRiskFlags.includes("Bonus Abuse");
    const hasSuspiciousDevice = selectedRiskFlags.includes("Suspicious Device");

    let triggeredAction = "No risk rules triggered";
    let createdCaseStatus = "No case created";
    let appliedRestriction = "None";
    let verificationRequired: SimulationResult["verificationRequired"] = "None";

    if (eventType === "Withdrawal" && parsedAmount > 1000) {
      triggeredAction = "High-value withdrawal review";
      createdCaseStatus = "Case Created";
      appliedRestriction = "Withdrawal Block";
      verificationRequired = "Full KYC";
    } else if (eventType === "Deposit" && parsedAmount > 500) {
      triggeredAction = "High-value deposit review";
      createdCaseStatus = "Case Created";
      verificationRequired = "ID";
    } else if (eventType === "Bonus Activation" && hasBonusAbuse) {
      triggeredAction = "Bonus abuse risk review";
      createdCaseStatus = "Case Created";
      verificationRequired = "Full KYC";
    }

    if (hasSuspiciousDevice) {
      triggeredAction =
        triggeredAction === "No risk rules triggered"
          ? "Suspicious device pattern detected"
          : `${triggeredAction} + suspicious device pattern`;
      createdCaseStatus = "Case Created";
      appliedRestriction =
        appliedRestriction === "None"
          ? "Device Restriction"
          : `${appliedRestriction} + Device Restriction`;
    }

    setResult({
      triggeredAction,
      createdCaseStatus,
      appliedRestriction,
      verificationRequired,
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Risk Simulator</h3>
        <p className="mt-1 text-sm text-slate-600">
          Simulate user events and evaluate KYC and restriction outcomes.
        </p>

        <form className="mt-5 space-y-4" onSubmit={runSimulation}>
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
                placeholder="e.g. USR-1203"
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
                placeholder="e.g. alex_turner"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="eventType"
                className="text-sm font-medium text-slate-700"
              >
                Event Type
              </label>
              <select
                id="eventType"
                value={eventType}
                onChange={(event) => setEventType(event.target.value as EventType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              >
                <option value="Registration">Registration</option>
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Bonus Activation">Bonus Activation</option>
                <option value="Bet Placed">Bet Placed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="verificationType"
                className="text-sm font-medium text-slate-700"
              >
                Verification Type
              </label>
              <select
                id="verificationType"
                value={verificationType}
                onChange={(event) =>
                  setVerificationType(event.target.value as VerificationType)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              >
                <option value="ID">ID</option>
                <option value="Selfie">Selfie</option>
                <option value="Proof">Proof</option>
                <option value="Full KYC">Full KYC</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="amount" className="text-sm font-medium text-slate-700">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Risk Flag</legend>
            <div className="flex flex-wrap gap-3">
              {riskFlags.map((flag) => (
                <label
                  key={flag}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedRiskFlags.includes(flag)}
                    onChange={() => toggleRiskFlag(flag)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  {flag}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Run Simulation
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Simulation Results</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ResultItem label="Triggered action" value={result.triggeredAction} />
          <ResultItem label="Created case status" value={result.createdCaseStatus} />
          <ResultItem label="Applied restriction" value={result.appliedRestriction} />
          <ResultItem
            label="Verification required"
            value={result.verificationRequired}
          />
        </div>
      </section>
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </article>
  );
}
