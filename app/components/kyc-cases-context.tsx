"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getKycLevel, KycLevel } from "@/app/components/kyc-levels";

export type VerificationType = "ID" | "Selfie" | "Proof" | "Full KYC";
export type ReviewStatus = "Pending" | "Approved" | "Rejected";
export type DocumentType = "ID" | "Selfie" | "Proof";

export type KycDocument = {
  type: DocumentType;
  status: ReviewStatus;
  file: string;
};

export type CaseNote = {
  text: string;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  caseId: string;
  userId: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type KycCase = {
  id: string;
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  kycLevel: KycLevel;
  /** Engine `finalDecision.kycLevel` at case creation — recommendation only. */
  recommendedKycLevel?: KycLevel;
  status: ReviewStatus;
  createdDate: string;
  createdAt?: string;
  source?: "manual" | "simulation" | "self-exclusion";
  reason?: string;
  selfExclusionDuration?: string;
  selfExclusionUntil?: string | null;
  triggeredRules?: Array<{ id: string; name: string; priority: number }>;
  fraudFlags?: string[];
  riskScore?: number;
  finalDecision?: {
    verification: string[];
    primaryVerification?: string | null;
    kycLevel: KycLevel;
    restriction: string | null;
    flags: string[];
    riskScore?: number;
  };
  restrictions: string[];
  flags?: string[];
  notes: CaseNote[];
  documents: KycDocument[];
};

type CreateKycCaseInput = {
  userId: string;
  username: string;
  verificationRequired: VerificationType[];
  kycLevel?: KycLevel;
  recommendedKycLevel?: KycLevel;
  restrictions: string[];
  flags?: string[];
  source?: "manual" | "simulation" | "self-exclusion";
  reason?: string;
  selfExclusionDuration?: string;
  selfExclusionUntil?: string | null;
  triggeredRules?: Array<{ id: string; name: string; priority: number }>;
  fraudFlags?: string[];
  riskScore?: number;
  finalDecision?: {
    verification: string[];
    primaryVerification?: string | null;
    kycLevel: KycLevel;
    restriction: string | null;
    flags: string[];
    riskScore?: number;
  };
  createdAt?: string;
  status?: ReviewStatus;
};

type KycCasesContextValue = {
  cases: KycCase[];
  auditLogs: AuditLogEntry[];
  addCase: (input: CreateKycCaseInput) => string;
  updateCaseStatus: (caseId: string, status: ReviewStatus) => void;
  addCaseNote: (caseId: string, text: string) => void;
  addAuditLog: (input: {
    caseId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) => void;
  uploadDocument: (caseId: string, type: DocumentType, file?: string) => void;
  updateDocumentStatus: (
    caseId: string,
    type: DocumentType,
    status: ReviewStatus
  ) => void;
  resetCasesData: () => void;
};

const KycCasesContext = createContext<KycCasesContextValue | undefined>(undefined);
const KYC_CASES_STORAGE_KEY = "kyc_cases";
const KYC_AUDIT_LOGS_STORAGE_KEY = "kyc_audit_logs";
const ALL_DOCUMENT_TYPES: DocumentType[] = ["ID", "Selfie", "Proof"];

function parseOptionalKycLevel(raw: unknown): KycLevel | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw === "L0" || raw === "L1" || raw === "L2" || raw === "L3") return raw;
  return undefined;
}

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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
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
      const savedLogs = window.localStorage.getItem(KYC_AUDIT_LOGS_STORAGE_KEY);
      const parsedLogs = savedLogs ? (JSON.parse(savedLogs) as AuditLogEntry[]) : [];
      const normalizedCases = Array.isArray(parsedCases)
        ? parsedCases.map((kycCase) =>
            normalizeRestrictionsForStatus({
              ...kycCase,
              kycLevel: kycCase.kycLevel ?? getKycLevel(kycCase.verificationRequired ?? []),
              recommendedKycLevel: parseOptionalKycLevel(kycCase.recommendedKycLevel),
              status: (kycCase.status ?? "Pending") as ReviewStatus,
              flags: Array.isArray(kycCase.flags) ? kycCase.flags : [],
              notes: Array.isArray(kycCase.notes) ? kycCase.notes : [],
              triggeredRules: Array.isArray(kycCase.triggeredRules)
                ? kycCase.triggeredRules
                : [],
              fraudFlags: Array.isArray(kycCase.fraudFlags) ? kycCase.fraudFlags : [],
              documents: Array.isArray(kycCase.documents) ? kycCase.documents : [],
            })
          )
        : [];
      const normalizedLogs = Array.isArray(parsedLogs) ? parsedLogs : [];
      setCases(normalizedCases);
      setAuditLogs(normalizedLogs);
    } catch {
      setCases([]);
      setAuditLogs([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(KYC_CASES_STORAGE_KEY, JSON.stringify(cases));
    window.localStorage.setItem(KYC_AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
    window.localStorage.setItem("kycCases", JSON.stringify(cases));
    window.dispatchEvent(new Event("kyc-data-updated"));
  }, [cases, auditLogs, isHydrated]);

  const addAuditLog = (input: {
    caseId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) => {
    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      caseId: input.caseId,
      userId: input.userId,
      type: input.type,
      description: input.description,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };

    setAuditLogs((current) => [entry, ...current]);
  };

  const addCase = (input: CreateKycCaseInput) => {
    console.log("CASE STORE", input);
    const now = new Date();
    const createdDate = now.toISOString().slice(0, 10);
    const caseId = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

    setCases((currentCases) => [
      {
        id: caseId,
        userId: input.userId,
        username: input.username,
        verificationRequired: input.verificationRequired,
        kycLevel: input.kycLevel ?? getKycLevel(input.verificationRequired),
        recommendedKycLevel: input.recommendedKycLevel,
        status: input.status ?? "Pending",
        createdDate,
        createdAt: input.createdAt ?? now.toISOString(),
        source: input.source ?? "simulation",
        reason: input.reason,
        selfExclusionDuration: input.selfExclusionDuration,
        selfExclusionUntil: input.selfExclusionUntil,
        triggeredRules: input.triggeredRules ?? [],
        fraudFlags: input.fraudFlags ?? [],
        riskScore: input.riskScore ?? 0,
        finalDecision: input.finalDecision,
        restrictions: input.restrictions,
        flags: input.flags ?? [],
        notes: [],
        documents: [],
      },
      ...currentCases,
    ]);
    addAuditLog({
      caseId,
      userId: input.userId,
      type: "case_created",
      description: `Case created from ${input.source ?? "simulation"}`,
      metadata: { source: input.source ?? "simulation" },
    });
    return caseId;
  };

  const updateCaseStatus = (caseId: string, status: ReviewStatus) => {
    const caseItem = cases.find((item) => item.id === caseId);
    setCases((currentCases) =>
      currentCases.map((kycCase) =>
        kycCase.id === caseId
          ? normalizeRestrictionsForStatus({ ...kycCase, status })
          : kycCase
      )
    );
    if (caseItem) {
      addAuditLog({
        caseId,
        userId: caseItem.userId,
        type: "case_status_changed",
        description: `Case marked as ${status.toLowerCase()}`,
        metadata: { status },
      });
    }
  };

  const addCaseNote = (caseId: string, text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    setCases((currentCases) =>
      currentCases.map((kycCase) => {
        if (kycCase.id !== caseId) {
          return kycCase;
        }

        return {
          ...kycCase,
          notes: [
            ...kycCase.notes,
            { text: normalizedText, createdAt: new Date().toISOString() },
          ],
        };
      })
    );
    const caseItem = cases.find((item) => item.id === caseId);
    if (caseItem) {
      addAuditLog({
        caseId,
        userId: caseItem.userId,
        type: "note_added",
        description: "Note added to case",
        metadata: { text: normalizedText },
      });
    }
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

  const resetCasesData = () => {
    setCases([]);
    setAuditLogs([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KYC_CASES_STORAGE_KEY);
      window.localStorage.removeItem(KYC_AUDIT_LOGS_STORAGE_KEY);
    }
  };

  const value = {
    cases,
    auditLogs,
    addCase,
    updateCaseStatus,
    addCaseNote,
    addAuditLog,
    uploadDocument,
    updateDocumentStatus,
    resetCasesData,
  };

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
