"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/review": "Review",
  "/reports": "Reports",
  "/simulator": "Simulator",
  "/rules": "Rules",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Admin";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">Admin User</p>
          <p className="text-xs text-slate-500">Operations</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          AU
        </div>
      </div>
    </header>
  );
}
