"use client";

import { VerificationType } from "@/app/components/kyc-cases-context";

export type KycLevel = "L0" | "L1" | "L2" | "L3";

const levelRank: Record<KycLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
};

export function getKycLevel(verificationArray: string[]): KycLevel {
  const unique = Array.from(new Set(verificationArray));
  if (unique.length === 0) return "L0";

  if (
    unique.includes("Full KYC") ||
    (unique.includes("ID") && unique.includes("Selfie") && unique.includes("Proof"))
  ) {
    return "L3";
  }

  if (unique.includes("Selfie") || (unique.includes("ID") && unique.includes("Selfie"))) {
    return "L2";
  }

  if (unique.includes("ID")) return "L1";
  return "L0";
}

export function maxKycLevel(levels: KycLevel[]): KycLevel {
  if (levels.length === 0) return "L0";
  return levels.reduce((max, current) =>
    levelRank[current] > levelRank[max] ? current : max
  , "L0");
}

export function toVerificationArrayFromLevel(level: KycLevel): VerificationType[] {
  if (level === "L3") return ["Full KYC"];
  if (level === "L2") return ["ID", "Selfie"];
  if (level === "L1") return ["ID"];
  return [];
}

