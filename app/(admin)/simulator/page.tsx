"use client";

import { FormEvent, useState } from "react";
import { useKycCases } from "@/app/components/kyc-cases-context";
import { usePlayers } from "@/app/components/players-context";
import { EventType, Rule, useRules } from "@/app/components/rules-context";

type SimulationResult = {
  triggeredAction: string;
  createdCaseStatus: string;
  appliedRestriction: string;
  verificationRequired: string;
};

const initialResult: SimulationResult = {
  triggeredAction: "No action triggered yet",
  createdCaseStatus: "No case created",
  appliedRestriction: "None",
  verificationRequired: "None",
};

export default function SimulatorPage() {
  const { rules } = useRules();
  const { addCase } = useKycCases();
  const { applyTriggerToPlayer } = usePlayers();
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [eventType, setEventType] = useState<EventType>("Registration");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("California");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [odds, setOdds] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [result, setResult] = useState<SimulationResult>(initialResult);

  const isRuleMatched = (
    rule: Rule,
    simulation: {
      eventType: EventType;
      amount: number;
      count: number;
      betAmount: number;
      odds: number;
      isLive: boolean;
    }
  ) => {
    if (rule.eventType !== simulation.eventType) {
      return false;
    }

    if (
      rule.eventType === "Bet Placement" &&
      rule.isLiveOnly &&
      !simulation.isLive
    ) {
      return false;
    }

    if (rule.conditionType === "Country/State") {
      return rule.conditionValue === `${country} / ${state}`;
    }

    const numericValue = Number(rule.conditionValue);
    if (Number.isNaN(numericValue)) {
      return false;
    }

    if (
      rule.conditionType === "Single deposit" ||
      rule.conditionType === "Single withdrawal"
    ) {
      return simulation.amount >= numericValue;
    }

    if (rule.conditionType === "Bet amount >") {
      return simulation.betAmount >= numericValue;
    }

    if (rule.conditionType === "Odds >") {
      return simulation.odds >= numericValue;
    }

    return simulation.count >= numericValue;
  };

  const runSimulation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const simulation = {
      eventType,
      amount: Number(amount || 0),
      count: Number(count || 0),
      betAmount: Number(betAmount || 0),
      odds: Number(odds || 0),
      isLive,
    };

    const matchedRules = rules.filter((rule) => isRuleMatched(rule, simulation));

    const normalizedUserId = userId.trim() || `SIM-${Date.now()}`;
    const normalizedUsername = username.trim() || "simulated_user";

    if (matchedRules.length === 0) {
      setResult({
        triggeredAction: "No rule triggered",
        createdCaseStatus: "No case created",
        appliedRestriction: "None",
        verificationRequired: "None",
      });
      return;
    }

    let createdCases = 0;
    matchedRules.forEach((rule) => {
      const triggerResult = applyTriggerToPlayer({
        id: normalizedUserId,
        username: normalizedUsername,
        verificationRequired: rule.verificationRequired,
        restrictions: rule.restrictions,
        flags: rule.flags,
      });

      if (triggerResult.levelChanged || triggerResult.newRestrictionsApplied) {
        addCase({
          userId: normalizedUserId,
          username: normalizedUsername,
          verificationRequired: rule.verificationRequired,
          restrictions: triggerResult.appliedRestrictions,
        });
        createdCases += 1;
      }
    });

    setResult({
      triggeredAction: `${matchedRules.length} rule(s) triggered`,
      createdCaseStatus:
        createdCases > 0
          ? `${createdCases} case(s) created (Pending)`
          : "No case created",
      appliedRestriction: (() => {
        const uniqueRestrictions = Array.from(
          new Set(matchedRules.flatMap((rule) => rule.restrictions))
        );
        return uniqueRestrictions.length > 0
          ? uniqueRestrictions.join(", ")
          : "None";
      })(),
      verificationRequired: (() => {
        const uniqueVerifications = Array.from(
          new Set(matchedRules.flatMap((rule) => rule.verificationRequired))
        );
        return uniqueVerifications.length > 0
          ? uniqueVerifications.join(", ")
          : "None";
      })(),
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
                <option value="Bonus">Bonus</option>
                <option value="Bet Placement">Bet Placement</option>
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

          {eventType === "Registration" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            </div>
          ) : (
            <div className="max-w-sm space-y-1">
              <label className="text-sm font-medium text-slate-700">Count</label>
              <input
                type="number"
                min="0"
                step="1"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
          )}

          {eventType === "Bet Placement" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  betAmount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={betAmount}
                  onChange={(event) => setBetAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">odds</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={odds}
                  onChange={(event) => setOdds(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                />
              </div>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2 pt-8 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isLive}
                    onChange={(event) => setIsLive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  isLive
                </label>
              </div>
            </div>
          ) : null}

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
