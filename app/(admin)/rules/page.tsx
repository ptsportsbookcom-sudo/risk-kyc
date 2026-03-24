"use client";

import { FormEvent, useState } from "react";

type EventType = "Registration" | "Deposit" | "Withdrawal" | "Bonus" | "Bet";
type VerificationType = "ID" | "Selfie" | "Proof" | "Full KYC";
type RestrictionType =
  | "Withdrawal Block"
  | "Deposit Block"
  | "Casino Block"
  | "Full Account Block";

type Rule = {
  id: string;
  eventType: EventType;
  amountThreshold: number;
  countThreshold: number;
  verificationRequired: VerificationType[];
  restrictions: RestrictionType[];
};

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

export default function RulesPage() {
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [amountThreshold, setAmountThreshold] = useState("");
  const [countThreshold, setCountThreshold] = useState("");
  const [verificationRequired, setVerificationRequired] = useState<
    VerificationType[]
  >([]);
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

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

  const onSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const createdRule: Rule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType,
      amountThreshold: Number(amountThreshold || 0),
      countThreshold: Number(countThreshold || 0),
      verificationRequired,
      restrictions,
    };

    setRules((currentRules) => [createdRule, ...currentRules]);
    setAmountThreshold("");
    setCountThreshold("");
    setVerificationRequired([]);
    setRestrictions([]);
    setEventType("Registration");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Rule Configuration</h3>
        <p className="mt-1 text-sm text-slate-600">
          Build KYC trigger rules for event-driven risk controls.
        </p>

        <form className="mt-5 space-y-6" onSubmit={onSaveRule}>
          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              1. Event Type
            </h4>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as EventType)}
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            >
              <option value="Registration">Registration</option>
              <option value="Deposit">Deposit</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Bonus">Bonus</option>
              <option value="Bet">Bet</option>
            </select>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              2. Conditions
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="amountThreshold"
                  className="text-sm font-medium text-slate-700"
                >
                  Amount threshold
                </label>
                <input
                  id="amountThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountThreshold}
                  onChange={(event) => setAmountThreshold(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="countThreshold"
                  className="text-sm font-medium text-slate-700"
                >
                  Count threshold
                </label>
                <input
                  id="countThreshold"
                  type="number"
                  min="0"
                  step="1"
                  value={countThreshold}
                  onChange={(event) => setCountThreshold(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              3. Verification Required
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
              4. Restrictions
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

          <div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Save Rule
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Created Rules</h4>

        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No rules saved yet. Configure a rule and click Save Rule.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  Event: {rule.eventType}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Conditions: Amount &gt; {rule.amountThreshold} | Count &gt;{" "}
                  {rule.countThreshold}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Verification:{" "}
                  {rule.verificationRequired.length > 0
                    ? rule.verificationRequired.join(", ")
                    : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Restrictions:{" "}
                  {rule.restrictions.length > 0
                    ? rule.restrictions.join(", ")
                    : "None"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
