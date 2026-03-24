"use client";

import { FormEvent, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";
import {
  ConditionType,
  EventType,
  RestrictionType,
  useRules,
} from "@/app/components/rules-context";

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
const countryOptions = ["United States", "Canada", "United Kingdom", "India"];
const stateOptions = [
  "California",
  "New York",
  "Texas",
  "Ontario",
  "London",
  "Maharashtra",
];
const depositConditionOptions: Extract<
  ConditionType,
  "Single deposit" | "Number of deposits" | "Lifetime deposit"
>[] = ["Single deposit", "Number of deposits", "Lifetime deposit"];
const withdrawalConditionOptions: Extract<
  ConditionType,
  "Single withdrawal" | "Number of withdrawals" | "Lifetime withdrawal"
>[] = ["Single withdrawal", "Number of withdrawals", "Lifetime withdrawal"];

function getDefaultConditionType(eventType: EventType): ConditionType {
  if (eventType === "Deposit") return "Single deposit";
  if (eventType === "Withdrawal") return "Single withdrawal";
  if (eventType === "Bonus") return "Number of bonuses used";
  if (eventType === "Bet") return "Bet count";
  return "Country/State";
}

export default function RulesPage() {
  const { rules, addRule } = useRules();
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [country, setCountry] = useState(countryOptions[0]);
  const [state, setState] = useState(stateOptions[0]);
  const [conditionType, setConditionType] = useState<ConditionType>(
    getDefaultConditionType("Registration")
  );
  const [conditionValue, setConditionValue] = useState("");
  const [verificationRequired, setVerificationRequired] = useState<
    VerificationType[]
  >([]);
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);

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

  const onEventTypeChange = (nextEventType: EventType) => {
    setEventType(nextEventType);
    setConditionType(getDefaultConditionType(nextEventType));
    setConditionValue("");
  };

  const onSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resolvedConditionValue =
      eventType === "Registration" ? `${country} / ${state}` : conditionValue;

    addRule({
      eventType,
      conditionType,
      conditionValue: resolvedConditionValue || "N/A",
      verificationRequired,
      restrictions,
    });
    setConditionValue("");
    setVerificationRequired([]);
    setRestrictions([]);
    onEventTypeChange("Registration");
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
              onChange={(event) => onEventTypeChange(event.target.value as EventType)}
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
            {eventType === "Registration" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {countryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {stateOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {eventType === "Deposit" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Condition type
                  </label>
                  <select
                    value={conditionType}
                    onChange={(event) =>
                      setConditionType(event.target.value as ConditionType)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {depositConditionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={conditionValue}
                    onChange={(event) => setConditionValue(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {eventType === "Withdrawal" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Condition type
                  </label>
                  <select
                    value={conditionType}
                    onChange={(event) =>
                      setConditionType(event.target.value as ConditionType)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {withdrawalConditionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={conditionValue}
                    onChange={(event) => setConditionValue(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {eventType === "Bonus" ? (
              <div className="max-w-sm space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Number of bonuses used
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={conditionValue}
                  onChange={(event) => setConditionValue(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            ) : null}

            {eventType === "Bet" ? (
              <div className="max-w-sm space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Bet count
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={conditionValue}
                  onChange={(event) => setConditionValue(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            ) : null}
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
                  Condition: {rule.conditionType} = {rule.conditionValue}
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
