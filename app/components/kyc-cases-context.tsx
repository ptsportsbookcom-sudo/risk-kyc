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
export type DocumentType = "ID" | "Selfie" | "Proof";

export type KycDocument = {
  type: DocumentType;
  status: ReviewStatus;
  file: string;
};

export type KycCase = {
  id: string;
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  status: ReviewStatus;
  createdDate: string;
  createdAt?: string;
  source?: "manual" | "simulation";
  reason?: string;
  restrictions: string[];
  flags?: string[];
  documents: KycDocument[];
};

type CreateKycCaseInput = {
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  restrictions: string[];
  flags?: string[];
  source?: "manual" | "simulation";
  reason?: string;
  createdAt?: string;
  status?: ReviewStatus;
};

type KycCasesContextValue = {
  cases: KycCase[];
  addCase: (input: CreateKycCaseInput) => void;
  updateCaseStatus: (caseId: string, status: ReviewStatus) => void;
  uploadDocument: (caseId: string, type: DocumentType, file?: string) => void;
  updateDocumentStatus: (
    caseId: string,
    type: DocumentType,
    status: ReviewStatus
  ) => void;
};

const KycCasesContext = createContext<KycCasesContextValue | undefined>(undefined);
const KYC_CASES_STORAGE_KEY = "kyc_cases";
const ALL_DOCUMENT_TYPES: DocumentType[] = ["ID", "Selfie", "Proof"];

function getRequiredDocumentTypes(verificationRequired: VerificationType[]) {
  if (verificationRequired.includes("Full KYC")) {
    return ALL_DOCUMENT_TYPES;
  }

  return verificationRequired.filter(
    (item): item is DocumentType => item === "ID" || item === "Selfie" || item === "Proof"
  );
}

function deriveCaseStatus(caseData: KycCase): ReviewStatus {
  const requiredTypes = getRequiredDocumentTypes(caseData.verificationRequired);

  if (requiredTypes.length === 0) {
    return caseData.status;
  }

  const requiredDocs = requiredTypes.map((type) =>
    caseData.documents.find((doc) => doc.type === type)
  );

  if (requiredDocs.some((doc) => doc?.status === "Rejected")) {
    return "Rejected";
  }

  const allApproved = requiredDocs.every((doc) => doc?.status === "Approved");
  if (allApproved) {
    return "Approved";
  }

  return "Pending";
}

function normalizeRestrictionsForStatus(caseData: KycCase) {
  if (caseData.status === "Approved") {
    return { ...caseData, restrictions: [] };
  }

  return caseData;
}

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
      const normalizedCases = Array.isArray(parsedCases)
        ? parsedCases.map((kycCase) =>
            normalizeRestrictionsForStatus({
              ...kycCase,
              documents: Array.isArray(kycCase.documents) ? kycCase.documents : [],
            })
          )
        : [];
      setCases(normalizedCases);
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
        status: input.status ?? "Pending",
        createdDate,
        createdAt: input.createdAt ?? now.toISOString(),
        source: input.source ?? "simulation",
        reason: input.reason,
        restrictions: input.restrictions,
        flags: input.flags ?? [],
        documents: [],
      },
      ...currentCases,
    ]);
  };

  const updateCaseStatus = (caseId: string, status: ReviewStatus) => {
    setCases((currentCases) =>
      currentCases.map((kycCase) =>
        kycCase.id === caseId
          ? normalizeRestrictionsForStatus({ ...kycCase, status })
          : kycCase
      )
    );
  };

  const uploadDocument = (caseId: string, type: DocumentType, file?: string) => {
    setCases((currentCases) =>
      currentCases.map((kycCase) => {
        if (kycCase.id !== caseId) {
          return kycCase;
        }

        const existingDocument = kycCase.documents.find((doc) => doc.type === type);
        const uploadedDocument: KycDocument = {
          type,
          status: "Pending",
          file: file ?? `mock://${caseId}/${type.toLowerCase()}`,
        };

        const documents = existingDocument
          ? kycCase.documents.map((doc) => (doc.type === type ? uploadedDocument : doc))
          : [...kycCase.documents, uploadedDocument];

        return normalizeRestrictionsForStatus({
          ...kycCase,
          documents,
          status: deriveCaseStatus({ ...kycCase, documents }),
        });
      })
    );
  };

  const updateDocumentStatus = (
    caseId: string,
    type: DocumentType,
    status: ReviewStatus
  ) => {
    setCases((currentCases) =>
      currentCases.map((kycCase) => {
        if (kycCase.id !== caseId) {
          return kycCase;
        }

        const documents = kycCase.documents.map((doc) =>
          doc.type === type ? { ...doc, status } : doc
        );

        return normalizeRestrictionsForStatus({
          ...kycCase,
          documents,
          status: deriveCaseStatus({ ...kycCase, documents }),
        });
      })
    );
  };

  const value = useMemo(
    () => ({
      cases,
      addCase,
      updateCaseStatus,
      uploadDocument,
      updateDocumentStatus,
    }),
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
