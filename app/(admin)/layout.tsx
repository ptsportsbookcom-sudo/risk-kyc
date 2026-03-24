import { AdminSidebar } from "@/app/components/admin-sidebar";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { KycCasesProvider } from "@/app/components/kyc-cases-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KycCasesProvider>
      <div className="flex min-h-screen bg-slate-100">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </KycCasesProvider>
  );
}
