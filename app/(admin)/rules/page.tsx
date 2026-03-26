"use client";

import { FormEvent, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";
import {
  EventType,
  RuleField,
  RuleOperator,
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
const operatorOptions: RuleOperator[] = [">", ">=", "<", "<=", "=="];
const flagOptions = [
  "High Bet Amount",
  "Live Bet Risk",
  "High Odds Risk",
  "Bet Velocity",
];

function getDefaultField(eventType: EventType): RuleField {
  if (eventType === "Deposit") return "depositAmount";
  if (eventType === "Withdrawal") return "withdrawalAmount";
  if (eventType === "Bonus") return "bonusesUsed";
  if (eventType === "Bet Placement") return "betAmount";
  return "countryState";
}

export default function RulesPage() {
  const { rules, addRule } = useRules();
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [country, setCountry] = useState(countryOptions[0]);
  const [state, setState] = useState(stateOptions[0]);
  const [field, setField] = useState<RuleField>(getDefaultField("Registration"));
  const [operator, setOperator] = useState<RuleOperator>("==");
  const [value, setValue] = useState("");
  const [verificationRequired, setVerificationRequired] = useState<
    VerificationType[]
  >([]);
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [isLiveOnly, setIsLiveOnly] = useState(false);

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

  const toggleFlag = (value: string) => {
    setFlags((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const onEventTypeChange = (nextEventType: EventType) => {
    setEventType(nextEventType);
    setField(getDefaultField(nextEventType));
    setOperator(nextEventType === "Registration" ? "==" : ">");
    setValue("");
    setIsLiveOnly(false);
  };

  const onSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resolvedValue = eventType === "Registration" ? `${country} / ${state}` : value;

    addRule({
      eventType,
      field,
      operator,
      value: resolvedValue || "N/A",
      isLiveOnly: eventType === "Bet Placement" ? isLiveOnly : undefined,
      verificationRequired,
      restrictions,
      flags,
    });
    setValue("");
    setVerificationRequired([]);
    setRestrictions([]);
    setFlags([]);
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
              <option value="Bet Placement">Bet Placement</option>
            </select>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              2. Conditions
            </h4>
            {eventType === "Registration" ? (
              <div className="space-y-3">
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
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField label="Field" value="countryState" />
                  <ReadOnlyField label="Operator" value="==" />
                  <ReadOnlyField label="Value" value={`${country} / ${state}`} />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Field
                  </label>
                  <select
                    value={field}
                    onChange={(event) => setField(event.target.value as RuleField)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {eventType === "Deposit" ? (
                      <option value="depositAmount">depositAmount</option>
                    ) : null}
                    {eventType === "Withdrawal" ? (
                      <option value="withdrawalAmount">withdrawalAmount</option>
                    ) : null}
                    {eventType === "Bonus" ? (
                      <option value="bonusesUsed">bonusesUsed</option>
                    ) : null}
                    {eventType === "Bet Placement" ? (
                      <>
                        <option value="betAmount">betAmount</option>
                        <option value="odds">odds</option>
                      </>
                    ) : null}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Operator
                  </label>
                  <select
                    value={operator}
                    onChange={(event) => setOperator(event.target.value as RuleOperator)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  >
                    {operatorOptions.map((option) => (
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
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  />
                </div>
              </div>
            )}

            {eventType === "Bet Placement" ? (
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isLiveOnly}
                  onChange={(event) => setIsLiveOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                isLive only
              </label>
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

          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              5. Flags
            </h4>
            <div className="flex flex-wrap gap-2">
              {flagOptions.map((option) => (
                <label
                  key={option}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={flags.includes(option)}
                    onChange={() => toggleFlag(option)}
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
                  Condition: {rule.field} {rule.operator} {rule.value}
                  {rule.isLiveOnly ? " (Live Only)" : ""}
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
                <p className="mt-1 text-sm text-slate-700">
                  Flags: {rule.flags.length > 0 ? rule.flags.join(", ") : "None"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      />
    </div>
  );
}
