// Root layout for TPMO Copilot
// Dark mode, IBM Plex Mono for data values, system font for UI.

import type { Metadata } from "next";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
