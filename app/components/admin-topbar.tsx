"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminNavItems } from "@/app/components/admin-sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/review": "Review",
  "/reports": "Reports",
  "/simulator": "Simulator",
  "/manual": "Manual Trigger",
  "/rules": "Rules",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Admin";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            Menu
          </button>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">Admin User</p>
            <p className="text-xs text-slate-500">Operations</p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
            AU
          </div>
        </div>
      </div>

      {menuOpen ? (
        <nav className="mt-3 space-y-1 lg:hidden">
          {adminNavItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname === href
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
