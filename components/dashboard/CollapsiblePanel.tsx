"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsiblePanelProps {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
}

export default function CollapsiblePanel({
  title,
  defaultOpen = true,
  children,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-bg-surface">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="font-display text-lg font-semibold text-text-primary">
          {title}
        </h3>
        <ChevronDown
          className={`h-5 w-5 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
