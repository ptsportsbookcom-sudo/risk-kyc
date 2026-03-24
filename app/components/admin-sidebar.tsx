"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Review", href: "/review" },
  { label: "Reports", href: "/reports" },
  { label: "Simulator", href: "/simulator" },
  { label: "Manual Trigger", href: "/manual" },
  { label: "Rules", href: "/rules" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Admin Portal
        </p>
        <h1 className="mt-2 text-lg font-semibold">Risk & KYC</h1>
      </div>

      <nav className="space-y-1 px-3 py-4">
        {navItems.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
