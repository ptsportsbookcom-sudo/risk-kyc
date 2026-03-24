"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type VerificationType = "ID" | "Selfie" | "Proof" | "Full KYC";
export type ReviewStatus = "Pending" | "Approved" | "Rejected";

export type KycCase = {
  id: string;
  userId: string;
  username: string;
  verificationType: VerificationType;
  status: ReviewStatus;
  createdDate: string;
};

type CreateKycCaseInput = {
  userId: string;
  username: string;
  verificationType: VerificationType;
};

type KycCasesContextValue = {
  cases: KycCase[];
  addCase: (input: CreateKycCaseInput) => void;
  updateCaseStatus: (caseId: string, status: ReviewStatus) => void;
};

const KycCasesContext = createContext<KycCasesContextValue | undefined>(undefined);

export function KycCasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<KycCase[]>([]);

  const addCase = (input: CreateKycCaseInput) => {
    const now = new Date();
    const createdDate = now.toISOString().slice(0, 10);

    setCases((currentCases) => [
      {
        id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: input.userId,
        username: input.username,
        verificationType: input.verificationType,
        status: "Pending",
        createdDate,
      },
      ...currentCases,
    ]);
  };

  const updateCaseStatus = (caseId: string, status: ReviewStatus) => {
    setCases((currentCases) =>
      currentCases.map((kycCase) =>
        kycCase.id === caseId ? { ...kycCase, status } : kycCase
      )
    );
  };

  const value = useMemo(
    () => ({ cases, addCase, updateCaseStatus }),
    [cases]
  );

  return (
    <KycCasesContext.Provider value={value}>{children}</KycCasesContext.Provider>
  );
}

export function useKycCases() {
  const context = useContext(KycCasesContext);
  if (!context) {
    throw new Error("useKycCases must be used within KycCasesProvider");
  }
  return context;
}
