"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AppNav() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-white/[0.07] bg-graphite-900">
      <nav className="flex items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-arctic text-[10px] font-bold text-graphite-950">
            TC
          </div>
          <span className="font-mono text-sm font-medium tracking-tight text-slate-100">
            TPMO Copilot
          </span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-graphite-800 text-slate-100"
                    : "text-arctic-muted hover:text-slate-200 hover:bg-graphite-800/50",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-arctic-dim hover:text-arctic-muted transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
