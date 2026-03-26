"use client";

import { FormEvent, useState } from "react";
import { VerificationType } from "@/app/components/kyc-cases-context";
import {
  EventType,
  RuleConditionCategory,
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
const operatorOptions: RuleOperator[] = [">", ">=", "<", "<=", "==", "!="];
const flagOptions = [
  "High Bet Amount",
  "Live Bet Risk",
  "High Odds Risk",
  "Bet Velocity",
];

function getAllowedCategories(triggerEvent: EventType): RuleConditionCategory[] {
  void triggerEvent;
  return ["Transaction", "Player", "Bonus", "Betting", "Risk"];
}

function getAllowedFieldsForCategory(
  triggerEvent: EventType,
  category: RuleConditionCategory
): RuleField[] {
  void triggerEvent;
  if (category === "Player")
    return ["country", "kycLevel", "ipCountry", "accountCountry", "deviceCount"];
  if (category === "Transaction")
    return [
      "depositAmount",
      "withdrawalAmount",
      "totalDeposits",
      "depositCount",
      "withdrawalCount",
      "lastDepositTimestamp",
    ];
  if (category === "Bonus") return ["bonusesUsed"];
  if (category === "Betting") return ["betAmount", "odds", "lastBetTimestamp", "betCountLastMinute"];
  if (category === "Risk") return ["flags"];
  return [];
}

function getDefaultConditionForEvent(triggerEvent: EventType) {
  const categories = getAllowedCategories(triggerEvent);
  const defaultCategory = categories.includes("Transaction")
    ? "Transaction"
    : categories.includes("Bonus")
      ? "Bonus"
      : categories.includes("Player")
        ? "Player"
        : categories[0];

  const fields = getAllowedFieldsForCategory(triggerEvent, defaultCategory);
  const defaultField = fields[0] ?? "country";
  const defaultOperator: RuleOperator = isEqualityField(defaultField) ? "==" : ">";

  return {
    category: defaultCategory as RuleConditionCategory,
    field: defaultField,
    operator: defaultOperator,
    value: "",
  };
}

function isNumericField(field: RuleField) {
  return (
    field === "deviceCount" ||
    field === "depositAmount" ||
    field === "withdrawalAmount" ||
    field === "totalDeposits" ||
    field === "depositCount" ||
    field === "withdrawalCount" ||
    field === "lastDepositTimestamp" ||
    field === "lastBetTimestamp" ||
    field === "betCountLastMinute" ||
    field === "bonusesUsed" ||
    field === "betAmount" ||
    field === "odds"
  );
}

function isEqualityField(field: RuleField) {
  return (
    field === "country" ||
    field === "kycLevel" ||
    field === "ipCountry" ||
    field === "accountCountry" ||
    field === "flags"
  );
}

function formatActionListLabel(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function formatVerificationLabel(option: string) {
  return `require ${option}`;
}

function formatRestrictionLabel(option: string) {
  return `apply ${option}`;
}

export default function RulesPage() {
  const { rules, addRule } = useRules();
  const [ruleName, setRuleName] = useState("");
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [ruleMode, setRuleMode] = useState<"Simple" | "Advanced">("Simple");
  const [betweenGroupsLogic, setBetweenGroupsLogic] = useState<RuleLogic>("ALL");
  const [priority, setPriority] = useState("100");
  const [enabled, setEnabled] = useState(true);
  const [stopProcessing, setStopProcessing] = useState(false);

  type ConditionRow = {
    category: RuleConditionCategory;
    field: RuleField;
    operator: RuleOperator;
    value: string;
  };

  const [conditionGroups, setConditionGroups] = useState<
    Array<{ conditions: ConditionRow[] }>
  >([
    {
      conditions: [getDefaultConditionForEvent("Registration")],
    },
  ]);
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
    setIsLiveOnly(false);
    setBetweenGroupsLogic("ALL");
    setConditionGroups([
      {
        conditions: [getDefaultConditionForEvent(nextEventType)],
      },
    ]);
  };

  const updateConditionRow = (groupIndex: number, patch: Partial<ConditionRow>) => {
    setConditionGroups((current) =>
      current.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;
        const nextCondition: ConditionRow = {
          ...group.conditions[0],
          ...patch,
        };
        return { ...group, conditions: [nextCondition] };
      })
    );
  };

  const addConditionRow = () => {
    setConditionGroups((current) => {
      const usedKeys = new Set(
        current.map((g) => `${g.conditions[0].category}-${g.conditions[0].field}`)
      );

      const categories = getAllowedCategories(eventType);
      for (const category of categories) {
        const fields = getAllowedFieldsForCategory(eventType, category);
        for (const field of fields) {
          const key = `${category}-${field}`;
          if (usedKeys.has(key)) continue;
          const defaultOperator: RuleOperator =
            field === "country" || field === "kycLevel" ? "==" : ">";
          return [
            ...current,
            {
              conditions: [
                {
                  category,
                  field,
                  operator: defaultOperator,
                  value: "",
                },
              ],
            },
          ];
        }
      }

      // Fallback: allow duplicates if we somehow ran out of candidates.
      const fallback = getDefaultConditionForEvent(eventType);
      return [...current, { conditions: [fallback] }];
    });
  };

  const removeConditionRow = (groupIndex: number) => {
    setConditionGroups((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, idx) => idx !== groupIndex);
    });
  };

  const onSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedGroups = conditionGroups
      .map((group) => ({
        conditions: group.conditions.filter((c) => c.value.trim() !== ""),
      }))
      .filter((group) => group.conditions.length > 0);

    const flattenedConditions = normalizedGroups.flatMap((g) => g.conditions);
    if (flattenedConditions.length === 0) return;

    const primaryCondition = flattenedConditions[0];

    addRule({
      name: ruleName.trim() || `Rule ${Date.now()}`,
      eventType,
      conditions: flattenedConditions,
      conditionLogic: betweenGroupsLogic,
      conditionGroups: normalizedGroups,
      groupLogic: betweenGroupsLogic,
      actions: {
        verifications: verificationRequired,
        restrictions,
        flags,
      },
      priority: Number(priority || 100),
      enabled,
      stopProcessing,
      field: primaryCondition.field,
      operator: primaryCondition.operator,
      value: primaryCondition.value,
      isLiveOnly: eventType === "Bet Placement" ? isLiveOnly : undefined,
      verificationRequired,
      restrictions,
      flags,
    });

    setVerificationRequired([]);
    setRestrictions([]);
    setFlags([]);
    setIsLiveOnly(false);
    setRuleName("");
    setPriority("100");
    setEnabled(true);
    setStopProcessing(false);

    setRuleMode("Simple");
    setBetweenGroupsLogic("ALL");
    onEventTypeChange("Registration");
  };

    const previewGroups = conditionGroups
      .map((group) => ({
        conditions: group.conditions.filter((c) => c.value.trim() !== ""),
      }))
      .filter((group) => group.conditions.length > 0);

    const hasAnyConditions = previewGroups.length > 0;

    const formatCondition = (condition: {
      category?: RuleConditionCategory;
      field: RuleField;
      operator: RuleOperator;
      value: string;
    }) => `${condition.field} ${condition.operator} ${condition.value}`;

    const conditionLines = previewGroups.flatMap((g) => g.conditions).map(formatCondition);
    const logicOperator = betweenGroupsLogic === "ANY" ? "OR" : "AND";

    const ifExpression = hasAnyConditions
      ? `Trigger Event = ${eventType}\n${conditionLines
          .map((line) => `${logicOperator} ${line}`)
          .join("\n")}`
      : "Add conditions to define when this rule should trigger";

    const thenParts: string[] = [];
    if (verificationRequired.length > 0) {
      thenParts.push(
        formatActionListLabel(
          verificationRequired.map((v) => formatVerificationLabel(v))
        )
      );
    }
    if (restrictions.length > 0) {
      thenParts.push(
        formatActionListLabel(
          restrictions.map((r) => formatRestrictionLabel(r))
        )
      );
    }
    if (flags.length > 0) {
      thenParts.push(`Flags: ${flags.join(", ")}`);
    }
    const thenExpression =
      thenParts.length > 0 ? thenParts.join(" and ") : "No actions configured";

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
              <option value="ANY">ANY event</option>
              <option value="Registration">Registration</option>
              <option value="Deposit">Deposit</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Bonus">Bonus Activation</option>
              <option value="Bet Placement">Bet Placement</option>
            </select>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              1. Rule Settings
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
                placeholder="Rule name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                placeholder="Priority (default 100)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
              <div className="flex items-center gap-4 rounded-lg border border-slate-300 px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  Enabled
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={stopProcessing}
                    onChange={(event) => setStopProcessing(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  Stop Processing
                </label>
              </div>
            </div>
          </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          1.1. Rule Type
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRuleMode("Simple");
              setBetweenGroupsLogic("ALL");
              setConditionGroups((current) => current.slice(0, 1));
            }}
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
                {ruleMode === "Advanced" ? (
                  <div className="inline-flex rounded-lg border border-slate-300 p-1">
                    <button
                      type="button"
                      onClick={() => setBetweenGroupsLogic("ALL")}
                      className={`rounded-md px-3 py-1 text-sm font-medium ${
                        betweenGroupsLogic === "ALL"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700"
                      }`}
                    >
                      ALL conditions must match
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetweenGroupsLogic("ANY")}
                      className={`rounded-md px-3 py-1 text-sm font-medium ${
                        betweenGroupsLogic === "ANY"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700"
                      }`}
                    >
                      ANY condition can match
                    </button>
                  </div>
                ) : null}

                {!hasAnyConditions ? (
                  <p className="text-sm text-slate-500">
                    Add conditions to define when this rule should trigger
                  </p>
                ) : null}

                <div className="space-y-3">
                  {conditionGroups.map((group, groupIndex) => {
                    const condition = group.conditions[0];
                    const usedKeys = new Set(
                      conditionGroups
                        .filter((_, idx) => idx !== groupIndex)
                        .map(
                          (g) => `${g.conditions[0].category}-${g.conditions[0].field}`
                        )
                    );

                    const allowedCategories = getAllowedCategories(eventType);
                    const allowedFields = getAllowedFieldsForCategory(
                      eventType,
                      condition.category
                    );

                    const valueInputType = isNumericField(condition.field)
                      ? "number"
                      : "text";

                    return (
                      <div
                        key={groupIndex}
                        className={`space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                          groupIndex > 0 ? "mt-4" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-700">
                            Condition {groupIndex + 1}
                          </p>
                          {ruleMode === "Advanced" ? (
                            <button
                              type="button"
                              onClick={() => removeConditionRow(groupIndex)}
                              disabled={conditionGroups.length === 1}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr_auto]">
                          <select
                            value={condition.category}
                            onChange={(event) => {
                              const nextCategory =
                                event.target.value as RuleConditionCategory;
                              const nextFields = getAllowedFieldsForCategory(
                                eventType,
                                nextCategory
                              );
                              const nextField = nextFields[0] ?? condition.field;
                              const nextOperator: RuleOperator = isEqualityField(nextField)
                                ? "=="
                                : ">";
                              updateConditionRow(groupIndex, {
                                category: nextCategory,
                                field: nextField,
                                operator: nextOperator,
                                value: "",
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                          >
                            {allowedCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          <select
                            value={condition.field}
                            onChange={(event) => {
                              const nextField =
                                event.target.value as RuleField;
                              const nextOperator: RuleOperator = isEqualityField(nextField)
                                ? "=="
                                : ">";
                              updateConditionRow(groupIndex, {
                                field: nextField,
                                operator: nextOperator,
                                value: "",
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                          >
                            {allowedFields.map((fieldOption) => {
                              const key = `${condition.category}-${fieldOption}`;
                              const isDisabled = usedKeys.has(key) && fieldOption !== condition.field;
                              return (
                                <option
                                  key={fieldOption}
                                  value={fieldOption}
                                  disabled={isDisabled}
                                >
                                  {fieldOption}
                                </option>
                              );
                            })}
                          </select>

                          <select
                            value={condition.operator}
                            onChange={(event) =>
                              updateConditionRow(groupIndex, {
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
                            type={valueInputType}
                            value={condition.value}
                            onChange={(event) =>
                              updateConditionRow(groupIndex, {
                                value: event.target.value,
                              })
                            }
                            placeholder={
                              isNumericField(condition.field)
                                ? "0"
                                : isEqualityField(condition.field)
                                  ? "e.g. value"
                                  : "e.g. United States"
                            }
                            min={isNumericField(condition.field) ? 0 : undefined}
                            step={isNumericField(condition.field) ? "0.01" : undefined}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                          />

                          {ruleMode === "Advanced" ? null : (
                            <div />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ruleMode === "Advanced" ? (
                  <button
                    type="button"
                    onClick={addConditionRow}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Add Condition
                  </button>
                ) : null}
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

                    {conditionGroups[0] ? (
                      (() => {
                        const condition = conditionGroups[0].conditions[0];
                        const allowedCategories = getAllowedCategories(eventType);
                        const allowedFields = getAllowedFieldsForCategory(
                          eventType,
                          condition.category
                        );
                        const valueInputType = isNumericField(condition.field)
                          ? "number"
                          : "text";
                        return (
                          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-700">
                              Condition 1
                            </p>
                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr]">
                              <select
                                value={condition.category}
                                onChange={(event) => {
                                  const nextCategory =
                                    event.target.value as RuleConditionCategory;
                                  const nextFields = getAllowedFieldsForCategory(
                                    eventType,
                                    nextCategory
                                  );
                                  const nextField = nextFields[0] ?? condition.field;
                                  const nextOperator: RuleOperator = isEqualityField(nextField)
                                    ? "=="
                                    : ">";
                                  updateConditionRow(0, {
                                    category: nextCategory,
                                    field: nextField,
                                    operator: nextOperator,
                                    value: "",
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              >
                                {allowedCategories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={condition.field}
                                onChange={(event) => {
                                  const nextField =
                                    event.target.value as RuleField;
                                  const nextOperator: RuleOperator = isEqualityField(nextField)
                                    ? "=="
                                    : ">";
                                  updateConditionRow(0, {
                                    field: nextField,
                                    operator: nextOperator,
                                    value: "",
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              >
                                {allowedFields.map((fieldOption) => (
                                  <option key={fieldOption} value={fieldOption}>
                                    {fieldOption}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={condition.operator}
                                onChange={(event) =>
                                  updateConditionRow(0, {
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
                                type={valueInputType}
                                value={condition.value}
                                onChange={(event) =>
                                  updateConditionRow(0, {
                                    value: event.target.value,
                                  })
                                }
                                placeholder={
                                  isNumericField(condition.field)
                                    ? "0"
                                    : isEqualityField(condition.field)
                                      ? "e.g. value"
                                      : "e.g. United States"
                                }
                                min={isNumericField(condition.field) ? 0 : undefined}
                                step={isNumericField(condition.field) ? "0.01" : undefined}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
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
                        ANY condition can match
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
                        ALL conditions must match
                      </button>
                    </div>

                    <div className="space-y-3">
                      {conditionGroups.map((group, groupIndex) => {
                        const condition = group.conditions[0];
                        const usedKeys = new Set(
                          conditionGroups
                            .filter((_, idx) => idx !== groupIndex)
                            .map(
                              (g) =>
                                `${g.conditions[0].category}-${g.conditions[0].field}`
                            )
                        );

                        const allowedCategories = getAllowedCategories(eventType);
                        const allowedFields = getAllowedFieldsForCategory(
                          eventType,
                          condition.category
                        );

                        const valueInputType = isNumericField(condition.field)
                          ? "number"
                          : "text";

                        return (
                          <div
                            key={groupIndex}
                            className={`space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                              groupIndex > 0 ? "mt-4" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-700">
                                Condition {groupIndex + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeConditionRow(groupIndex)}
                                disabled={conditionGroups.length === 1}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr_auto]">
                              <select
                                value={condition.category}
                                onChange={(event) => {
                                  const nextCategory =
                                    event.target.value as RuleConditionCategory;
                                  const nextFields = getAllowedFieldsForCategory(
                                    eventType,
                                    nextCategory
                                  );
                                  const nextField = nextFields[0] ?? condition.field;
                                  const nextOperator: RuleOperator = isEqualityField(nextField)
                                    ? "=="
                                    : ">";
                                  updateConditionRow(groupIndex, {
                                    category: nextCategory,
                                    field: nextField,
                                    operator: nextOperator,
                                    value: "",
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              >
                                {allowedCategories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={condition.field}
                                onChange={(event) => {
                                  const nextField =
                                    event.target.value as RuleField;
                                  const nextOperator: RuleOperator = isEqualityField(nextField)
                                    ? "=="
                                    : ">";
                                  updateConditionRow(groupIndex, {
                                    field: nextField,
                                    operator: nextOperator,
                                    value: "",
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              >
                                {allowedFields.map((fieldOption) => {
                                  const key = `${condition.category}-${fieldOption}`;
                                  const isDisabled =
                                    usedKeys.has(key) &&
                                    fieldOption !== condition.field;
                                  return (
                                    <option
                                      key={fieldOption}
                                      value={fieldOption}
                                      disabled={isDisabled}
                                    >
                                      {fieldOption}
                                    </option>
                                  );
                                })}
                              </select>

                              <select
                                value={condition.operator}
                                onChange={(event) =>
                                  updateConditionRow(groupIndex, {
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
                                type={valueInputType}
                                value={condition.value}
                                onChange={(event) =>
                                  updateConditionRow(groupIndex, {
                                    value: event.target.value,
                                  })
                                }
                                placeholder={
                                  isNumericField(condition.field)
                                    ? "0"
                                    : isEqualityField(condition.field)
                                      ? "e.g. value"
                                      : "e.g. United States"
                                }
                                min={
                                  isNumericField(condition.field) ? 0 : undefined
                                }
                                step={
                                  isNumericField(condition.field) ? "0.01" : undefined
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={addConditionRow}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Add Condition
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
              <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap">
                {hasAnyConditions
                  ? ifExpression
                  : "Add conditions to define when this rule should trigger"}
              </pre>
              <p className="mt-2 text-sm font-medium text-slate-800">
                THEN:
              </p>
              <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap">
                {thenExpression}
              </pre>
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
                  {rule.name} - Event: {rule.eventType}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Priority: {rule.priority ?? 100} | Enabled:{" "}
                  {rule.enabled === false ? "No" : "Yes"} | Stop Processing:{" "}
                  {rule.stopProcessing ? "Yes" : "No"}
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
                                  `${item.category ? `${item.category}.` : ""}${item.field} ${item.operator} ${item.value}`
                              )
                              .join(", ")}]`
                        )
                        .join(" ")}`
                    : rule.conditions && rule.conditions.length > 0
                      ? `${rule.conditionLogic ?? "ALL"} -> ${rule.conditions
                          .map(
                            (item) =>
                              `${item.category ? `${item.category}.` : ""}${item.field} ${item.operator} ${item.value}`
                          )
                          .join(" | ")}`
                      : `${rule.field} ${rule.operator} ${rule.value}`}
                  {rule.isLiveOnly ? " (Live Only)" : ""}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Verification:{" "}
                  {(rule.actions?.verifications ?? rule.verificationRequired).length > 0
                    ? (rule.actions?.verifications ?? rule.verificationRequired).join(", ")
                    : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Restrictions:{" "}
                  {(rule.actions?.restrictions ?? rule.restrictions).length > 0
                    ? (rule.actions?.restrictions ?? rule.restrictions).join(", ")
                    : "None"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Flags:{" "}
                  {(rule.actions?.flags ?? rule.flags).length > 0
                    ? (rule.actions?.flags ?? rule.flags).join(", ")
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
