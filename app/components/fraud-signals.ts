"use client";

export type FraudSignalPlayer = {
  deviceCount: number;
  ipCountry: string;
  accountCountry: string;
  totalDeposits: number;
  depositCount: number;
  withdrawalCount: number;
  lastDepositTimestamp: number;
  lastBetTimestamp: number;
  betCountLastMinute: number;
  bonusesUsed: number;
};

export function getFraudSignals(player: FraudSignalPlayer) {
  const flags: string[] = [];
  const now = Date.now();
  const shortWindowMs = 10 * 60 * 1000;

  if (player.deviceCount > 3) flags.push("MULTI_ACCOUNT");

  if (
    player.ipCountry.trim() &&
    player.accountCountry.trim() &&
    player.ipCountry.trim() !== player.accountCountry.trim()
  ) {
    flags.push("COUNTRY_MISMATCH");
  }

  if (
    player.depositCount > 5 &&
    player.lastDepositTimestamp > 0 &&
    now - player.lastDepositTimestamp <= shortWindowMs
  ) {
    flags.push("HIGH_DEPOSIT_VELOCITY");
  }

  if (player.betCountLastMinute > 20) flags.push("BET_VELOCITY");

  if (player.bonusesUsed > 2) flags.push("BONUS_ABUSE");

  return { flags };
}

