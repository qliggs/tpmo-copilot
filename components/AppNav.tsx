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
    <header className="shrink-0 border-b border-gray-800/60 bg-gray-900">
      <nav className="flex items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">
            TC
          </div>
          <span className="font-mono text-sm font-medium tracking-tight text-gray-100">
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
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50",
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
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
