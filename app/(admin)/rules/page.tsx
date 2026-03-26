"use client";

import { FormEvent, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";
import {
  EventType,
  RuleField,
  RuleLogic,
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
  return "country";
}

function getEventConditionFields(eventType: EventType): RuleField[] {
  if (eventType === "Registration") return ["country", "state"];
  if (eventType === "Deposit") return ["depositAmount"];
  if (eventType === "Withdrawal") return ["withdrawalAmount"];
  if (eventType === "Bonus") return ["bonusesUsed"];
  return ["betAmount", "odds"]; // Bet Placement
}

function getFieldLabel(field: RuleField) {
  return field;
}

export default function RulesPage() {
  const { rules, addRule } = useRules();
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [country, setCountry] = useState(countryOptions[0]);
  const [state, setState] = useState(stateOptions[0]);
  const [field, setField] = useState<RuleField>(getDefaultField("Registration"));
  const [operator, setOperator] = useState<RuleOperator>("==");
  const [, setValue] = useState("");
  const [conditions, setConditions] = useState<
    Array<{ field: RuleField; operator: RuleOperator; value: string }>
  >([{ field: "depositAmount", operator: ">", value: "" }]);
  const [conditionLogic, setConditionLogic] = useState<RuleLogic>("ALL");
  const [ruleMode, setRuleMode] = useState<"Simple" | "Advanced">("Simple");
  const [betweenGroupsLogic, setBetweenGroupsLogic] = useState<RuleLogic>("ALL");
  const [conditionGroups, setConditionGroups] = useState<
    Array<{ conditions: Array<{ field: RuleField; operator: RuleOperator; value: string }> }>
  >([{ conditions: [{ field: "depositAmount", operator: ">", value: "" }] }]);
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
    setConditionLogic("ALL");
    setConditions([
      {
        field: getDefaultField(nextEventType),
        operator: nextEventType === "Registration" ? "==" : ">",
        value: "",
      },
    ]);
    setBetweenGroupsLogic("ALL");
    setConditionGroups([
      {
        conditions: [
          {
            field: getDefaultField(nextEventType),
            operator: nextEventType === "Registration" ? "==" : ">",
            value: "",
          },
        ],
      },
    ]);
  };

  const updateCondition = (
    index: number,
    patch: Partial<{ field: RuleField; operator: RuleOperator; value: string }>
  ) => {
    setConditions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const addCondition = () => {
    setConditions((current) => [
      ...current,
      { field: getDefaultField(eventType), operator: ">", value: "" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateGroupCondition = (
    groupIndex: number,
    conditionIndex: number,
    patch: Partial<{
      field: RuleField;
      operator: RuleOperator;
      value: string;
    }>
  ) => {
    setConditionGroups((current) =>
      current.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;
        return {
          ...group,
          conditions: group.conditions.map((condition, cIndex) =>
            cIndex === conditionIndex ? { ...condition, ...patch } : condition
          ),
        };
      })
    );
  };

  const addConditionToGroup = (groupIndex: number) => {
    setConditionGroups((current) =>
      current.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;
        const usedFields = new Set(group.conditions.map((c) => c.field));
        const remainingFields = getEventConditionFields(eventType).filter(
          (fieldOption) => !usedFields.has(fieldOption)
        );
        if (remainingFields.length === 0) return group;
        const nextField = remainingFields[0];
        return {
          ...group,
          conditions: [
            ...group.conditions,
            {
              field: nextField,
              operator: eventType === "Registration" ? "==" : ">",
              value: "",
            },
          ],
        };
      })
    );
  };

  const removeConditionFromGroup = (groupIndex: number, conditionIndex: number) => {
    setConditionGroups((current) =>
      current.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;
        return {
          ...group,
          conditions: group.conditions.filter((_, cIndex) => cIndex !== conditionIndex),
        };
      })
    );
  };

  const addGroup = () => {
    setConditionGroups((current) => [
      ...current,
      {
        conditions: [
          {
            field: getDefaultField(eventType),
            operator: eventType === "Registration" ? "==" : ">",
            value: "",
          },
        ],
      },
    ]);
  };

  const onSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const registrationConditions: Array<{
      field: RuleField;
      operator: RuleOperator;
      value: string;
    }> = [
      { field: "country", operator: "==" as RuleOperator, value: country },
      { field: "state", operator: "==" as RuleOperator, value: state },
    ];

    const simpleConditions =
      eventType === "Registration"
        ? registrationConditions
        : conditions.filter((item) => item.value.trim() !== "");

    const advancedGroups =
      eventType === "Registration"
        ? [{ conditions: registrationConditions }]
        : conditionGroups
            .map((group) => ({
              conditions: group.conditions.filter((c) => c.value.trim() !== ""),
            }))
            .filter((group) => group.conditions.length > 0);

    const flattenedConditions =
      ruleMode === "Advanced" ? advancedGroups.flatMap((g) => g.conditions) : simpleConditions;

    const primaryCondition =
      flattenedConditions[0] ??
      ({ field, operator, value: "N/A" } as {
        field: RuleField;
        operator: RuleOperator;
        value: string;
      });

    addRule({
      eventType,
      conditions: flattenedConditions,
      conditionLogic: eventType === "Registration" ? "ALL" : ruleMode === "Advanced" ? betweenGroupsLogic : conditionLogic,
      conditionGroups: ruleMode === "Advanced" ? advancedGroups.map((g) => ({ conditions: g.conditions })) : undefined,
      groupLogic: ruleMode === "Advanced" ? betweenGroupsLogic : undefined,
      field: primaryCondition.field,
      operator: primaryCondition.operator,
      value: primaryCondition.value,
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

  const registrationConditions: Array<{
    field: RuleField;
    operator: RuleOperator;
    value: string;
  }> = [
    { field: "country", operator: "==" as RuleOperator, value: country },
    { field: "state", operator: "==" as RuleOperator, value: state },
  ];

  const simplePreviewConditions =
    eventType === "Registration"
      ? registrationConditions
      : conditions.filter((item) => item.value.trim() !== "");

  const advancedPreviewGroups =
    eventType === "Registration"
      ? [{ conditions: registrationConditions }]
      : conditionGroups
          .map((group) => ({
            conditions: group.conditions.filter((c) => c.value.trim() !== ""),
          }))
          .filter((group) => group.conditions.length > 0);

  const simpleHasConditions = simplePreviewConditions.length > 0;
  const advancedHasConditions = advancedPreviewGroups.length > 0;
  const hasAnyConditions =
    ruleMode === "Advanced" ? advancedHasConditions : simpleHasConditions;

  const formatCondition = (condition: {
    field: RuleField;
    operator: RuleOperator;
    value: string;
  }) => `${getFieldLabel(condition.field)} ${condition.operator} ${condition.value}`;

  const ifExpression =
    !hasAnyConditions
      ? ""
      : ruleMode === "Advanced"
        ? (() => {
            const groupExpressions = advancedPreviewGroups.map((group) => {
              const joined = group.conditions.map(formatCondition).join(" AND ");
              return `(${joined})`;
            });
            const betweenOperator = betweenGroupsLogic === "ANY" ? "OR" : "AND";
            return groupExpressions.length === 1
              ? groupExpressions[0]
              : groupExpressions.join(` ${betweenOperator} `);
          })()
        : (() => {
            const logic = eventType === "Registration" ? "ALL" : conditionLogic;
            const betweenOperator = logic === "ANY" ? "OR" : "AND";
            const joined = simplePreviewConditions.map(formatCondition).join(` ${betweenOperator} `);
            return simplePreviewConditions.length === 1
              ? `(${joined})`
              : `(${joined})`;
          })();

  const thenActions: string[] = [];
  if (verificationRequired.length > 0) {
    thenActions.push(`Verify: ${verificationRequired.join(", ")}`);
  }
  if (restrictions.length > 0) {
    thenActions.push(`Restrictions: ${restrictions.join(", ")}`);
  }
  if (flags.length > 0) {
    thenActions.push(`Flags: ${flags.join(", ")}`);
  }
  if (thenActions.length === 0) {
    thenActions.push("No actions configured");
  }

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
          1.1. Rule Type
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRuleMode("Simple")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              ruleMode === "Simple"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setRuleMode("Advanced")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              ruleMode === "Advanced"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Advanced
          </button>
        </div>
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
                  <ReadOnlyField label="Field" value="country" />
                  <ReadOnlyField label="Operator" value="==" />
                  <ReadOnlyField label="Value" value={country} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField label="Field" value="state" />
                  <ReadOnlyField label="Operator" value="==" />
                  <ReadOnlyField label="Value" value={state} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {ruleMode === "Simple" ? (
                  <>
                    {!hasAnyConditions ? (
                      <p className="text-sm text-slate-500">
                        Add conditions to define when this rule should trigger
                      </p>
                    ) : null}

                    <div className="inline-flex rounded-lg border border-slate-300 p-1">
                      <button
                        type="button"
                        onClick={() => setConditionLogic("ALL")}
                        className={`rounded-md px-3 py-1 text-sm font-medium ${
                          conditionLogic === "ALL"
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        ALL (AND)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConditionLogic("ANY")}
                        className={`rounded-md px-3 py-1 text-sm font-medium ${
                          conditionLogic === "ANY"
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        ANY (OR)
                      </button>
                    </div>

                    {conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]"
                      >
                        <select
                          value={condition.field}
                          onChange={(event) =>
                            updateCondition(index, {
                              field: event.target.value as RuleField,
                            })
                          }
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

                        <select
                          value={condition.operator}
                          onChange={(event) =>
                            updateCondition(index, {
                              operator: event.target.value as RuleOperator,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                        >
                          {operatorOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={condition.value}
                          onChange={(event) =>
                            updateCondition(index, { value: event.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                        />

                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          disabled={conditions.length === 1}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addCondition}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Add Condition
                    </button>
                  </>
                ) : (
                  <>
                    {!hasAnyConditions ? (
                      <p className="text-sm text-slate-500">
                        Add conditions to define when this rule should trigger
                      </p>
                    ) : null}

                    <div className="inline-flex rounded-lg border border-slate-300 p-1">
                      <button
                        type="button"
                        onClick={() => setBetweenGroupsLogic("ANY")}
                        className={`rounded-md px-3 py-1 text-sm font-medium ${
                          betweenGroupsLogic === "ANY"
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        ANY (OR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetweenGroupsLogic("ALL")}
                        className={`rounded-md px-3 py-1 text-sm font-medium ${
                          betweenGroupsLogic === "ALL"
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        ALL (AND)
                      </button>
                    </div>

                    {conditionGroups.map((group, groupIndex) => (
                      <div
                        key={groupIndex}
                        className={`space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                          groupIndex > 0 ? "mt-4" : ""
                        }`}
                      >
                        {(() => {
                          const usedFields = new Set(group.conditions.map((c) => c.field));
                          const remainingFields = getEventConditionFields(eventType).filter(
                            (fieldOption) => !usedFields.has(fieldOption)
                          );
                          return (
                            <>
                              <p className="text-sm font-semibold text-slate-700">
                                Group {groupIndex + 1} (ALL conditions must match)
                              </p>

                              {group.conditions.map((condition, index) => (
                                <div
                                  key={index}
                                  className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]"
                                >
                                  <select
                                    value={condition.field}
                                    onChange={(event) =>
                                      updateGroupCondition(groupIndex, index, {
                                        field: event.target.value as RuleField,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  >
                                    {getEventConditionFields(eventType).map((fieldOption) => (
                                      <option
                                        key={fieldOption}
                                        value={fieldOption}
                                        disabled={
                                          usedFields.has(fieldOption) &&
                                          fieldOption !== condition.field
                                        }
                                      >
                                        {getFieldLabel(fieldOption)}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={condition.operator}
                                    onChange={(event) =>
                                      updateGroupCondition(groupIndex, index, {
                                        operator: event.target.value as RuleOperator,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  >
                                    {operatorOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>

                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={condition.value}
                                    onChange={(event) =>
                                      updateGroupCondition(groupIndex, index, {
                                        value: event.target.value,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeConditionFromGroup(groupIndex, index)
                                    }
                                    disabled={group.conditions.length === 1}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addConditionToGroup(groupIndex)}
                                disabled={remainingFields.length === 0}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Add Condition
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addGroup}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Add Group
                    </button>
                  </>
                )}
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

          <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Rule Preview
            </h4>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">
                IF:
              </p>
              <p className="font-mono text-xs text-slate-700">
                {hasAnyConditions ? ifExpression : "Add conditions to define when this rule should trigger"}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                THEN:
              </p>
              <p className="font-mono text-xs text-slate-700">
                {thenActions.join(" | ")}
              </p>
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
                  Condition:{" "}
                  {rule.conditionGroups && rule.conditionGroups.length > 0
                    ? `Groups (${rule.groupLogic ?? "ALL"} between), each group AND: ${rule.conditionGroups
                        .map(
                          (group, groupIndex) =>
                            `G${groupIndex + 1}[${group.conditions
                              .map(
                                (item) =>
                                  `${item.field} ${item.operator} ${item.value}`
                              )
                              .join(", ")}]`
                        )
                        .join(" ")}`
                    : rule.conditions && rule.conditions.length > 0
                      ? `${rule.conditionLogic ?? "ALL"} -> ${rule.conditions
                          .map((item) => `${item.field} ${item.operator} ${item.value}`)
                          .join(" | ")}`
                      : `${rule.field} ${rule.operator} ${rule.value}`}
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
