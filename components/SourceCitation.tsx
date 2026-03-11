"use client";

// SourceCitation — renders source references below an assistant message.

interface Source {
  readonly filename: string;
  readonly section_path: readonly string[];
}

interface SourceCitationProps {
  readonly sources: readonly Source[];
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-1">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
        Sources
      </p>
      {sources.map((source, i) => {
        const path = [source.filename, ...source.section_path].join(" \u2192 ");
        return (
          <div
            key={`${source.filename}-${i}`}
            className="flex items-start gap-1.5 text-xs text-gray-400"
          >
            <span className="shrink-0">&#128196;</span>
            <span className="font-mono leading-relaxed">{path}</span>
          </div>
        );
      })}
    </div>
  );
}
