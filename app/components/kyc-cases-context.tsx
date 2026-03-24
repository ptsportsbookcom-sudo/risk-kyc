"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type VerificationType = "ID" | "Selfie" | "Proof" | "Full KYC";
export type ReviewStatus = "Pending" | "Approved" | "Rejected";

export type KycCase = {
  id: string;
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  status: ReviewStatus;
  createdDate: string;
  restrictions: string[];
};

type CreateKycCaseInput = {
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  restrictions: string[];
};

type KycCasesContextValue = {
  cases: KycCase[];
  addCase: (input: CreateKycCaseInput) => void;
  updateCaseStatus: (caseId: string, status: ReviewStatus) => void;
};

const KycCasesContext = createContext<KycCasesContextValue | undefined>(undefined);
const KYC_CASES_STORAGE_KEY = "kyc_cases";

export function KycCasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<KycCase[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCases = window.localStorage.getItem(KYC_CASES_STORAGE_KEY);
      if (!savedCases) {
        setCases([]);
        setIsHydrated(true);
        return;
      }

      const parsedCases = JSON.parse(savedCases) as KycCase[];
      setCases(Array.isArray(parsedCases) ? parsedCases : []);
    } catch {
      setCases([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(KYC_CASES_STORAGE_KEY, JSON.stringify(cases));
  }, [cases, isHydrated]);

  const addCase = (input: CreateKycCaseInput) => {
    const now = new Date();
    const createdDate = now.toISOString().slice(0, 10);

    setCases((currentCases) => [
      {
        id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: input.userId,
        username: input.username,
        verificationRequired: input.verificationRequired,
        status: "Pending",
        createdDate,
        restrictions: input.restrictions,
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
