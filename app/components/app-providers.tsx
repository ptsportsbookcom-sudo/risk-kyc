"use client";

import { ReactNode } from "react";
import { KycCasesProvider } from "@/app/components/kyc-cases-context";
import { RulesProvider } from "@/app/components/rules-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RulesProvider>
      <KycCasesProvider>{children}</KycCasesProvider>
    </RulesProvider>
  );
}
