// Root layout for TPMO Copilot
// Dark mode, Bricolage Grotesque for display, DM Sans for body, Geist Mono for code.

import type { Metadata } from "next";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TPMO Copilot — AI-Powered TPM Second Brain",
  description:
    "Your AI-powered second brain for technical program management. Instant knowledge retrieval, portfolio intelligence, and decision audit trails.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        "font-sans",
        bricolage.variable,
        dmSans.variable,
        geistMono.variable,
      )}
    >
      <body className="bg-bg-primary text-text-primary antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
