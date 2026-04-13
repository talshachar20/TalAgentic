"use client";

// ============================================================
// CalmSpace — Crisis Resource Banner
//
// Displayed immediately when crisis keywords are detected.
// Prioritizes speed and clarity over elegance — when someone
// is in crisis, they need information NOW, not after they
// admire the UI.
//
// Design choices:
// - Warm amber/red rather than clinical red — not alarming, but urgent
// - Resources shown inline (no modal) — fewest clicks to get help
// - Cannot be dismissed mid-session once triggered
// ============================================================

import { CRISIS_RESOURCES } from "@/lib/crisis";

export function CrisisBanner() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="mx-4 mb-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 animate-slide-up shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex-shrink-0 w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center mt-0.5"
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4 text-amber-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-amber-900 text-base leading-snug">
            You don&apos;t have to face this alone
          </h2>
          <p className="text-amber-800 text-sm mt-1 leading-relaxed">
            If you&apos;re having thoughts of harming yourself or are in crisis,
            please reach out to one of these free, confidential services. Real
            humans are available right now.
          </p>
        </div>
      </div>

      {/* Resources grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {CRISIS_RESOURCES.map((resource) => (
          <a
            key={resource.name}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-amber-200 rounded-xl p-3 hover:border-amber-400 hover:bg-amber-50 transition-colors group"
          >
            <div className="font-medium text-amber-900 text-sm group-hover:text-amber-700 transition-colors">
              {resource.name}
            </div>
            <div className="text-amber-700 text-sm font-semibold mt-0.5">
              {resource.contact}
            </div>
            <div className="text-amber-600 text-xs mt-1">
              {resource.available} &middot; {resource.description}
            </div>
          </a>
        ))}
      </div>

      {/* Reassurance footer */}
      <p className="text-amber-700 text-xs mt-3 text-center">
        I&apos;m still here and listening. You can keep talking to me too.
      </p>
    </div>
  );
}
