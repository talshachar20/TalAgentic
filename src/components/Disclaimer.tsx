"use client";

// ============================================================
// CalmSpace — "This is not therapy" Disclaimer
//
// Legally required, ethically necessary, and ideally phrased
// so it doesn't sound like a lawyer wrote it at 11pm.
// Visible persistently in the UI — not buried in a footer.
// ============================================================

import { cn } from "@/lib/utils";

interface DisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function Disclaimer({ className, compact = false }: DisclaimerProps) {
  if (compact) {
    return (
      <p
        className={cn(
          "text-xs text-slate-400 text-center leading-relaxed",
          className
        )}
      >
        CalmSpace is not a substitute for professional mental health care.{" "}
        <a
          href="https://www.psychologytoday.com/us/therapists"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-500 transition-colors"
        >
          Find a therapist
        </a>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 text-sm text-slate-500 leading-relaxed",
        className
      )}
      role="note"
      aria-label="Disclaimer"
    >
      <span className="font-medium text-slate-600">A gentle note: </span>
      CalmSpace offers support and coping strategies, but it is not a
      replacement for professional mental health care or crisis services. If
      you&apos;re in crisis, please reach out to a qualified professional or call{" "}
      <strong className="text-slate-600">988</strong> (US) immediately.
    </div>
  );
}
