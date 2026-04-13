"use client";

// ============================================================
// CalmSpace — Save Session Invite (US-06)
//
// Shown after a few exchanges — invites, never forces.
// The user can dismiss this and continue chatting.
// Auth is TODO (Clerk/Auth0) — this scaffolds the UX pattern.
// ============================================================

interface SaveSessionInviteProps {
  onDismiss: () => void;
  onSave: () => void;
}

export function SaveSessionInvite({ onDismiss, onSave }: SaveSessionInviteProps) {
  return (
    <div
      role="dialog"
      aria-label="Save this session"
      className="mx-4 mb-4 bg-white border border-calm-200 rounded-2xl p-5 shadow-sm animate-slide-up"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-9 h-9 bg-calm-100 rounded-xl flex items-center justify-center mt-0.5"
          aria-hidden="true"
        >
          <svg
            className="w-5 h-5 text-calm-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-calm-800 text-sm leading-snug">
            Want to save this conversation?
          </h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Create a free account to revisit this session, track patterns over
            time, and pick up where you left off.
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onSave}
              className="flex-1 px-3 py-2 bg-calm-600 hover:bg-calm-700 text-white text-xs font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-calm-500 focus:ring-offset-1"
            >
              {/* TODO: Wire up Clerk/Auth0 sign-up flow */}
              Save session
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-3 py-2 bg-calm-50 hover:bg-calm-100 text-calm-700 text-xs font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-calm-300 focus:ring-offset-1"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mt-3">
        Always anonymous until you choose otherwise
      </p>
    </div>
  );
}
