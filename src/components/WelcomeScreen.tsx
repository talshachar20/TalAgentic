"use client";

// ============================================================
// CalmSpace — Welcome / Opening Screen
//
// This is the first thing a user sees. It needs to:
// - Not be overwhelming (ironic for a stress app)
// - Set the tone clearly: safe, non-judgmental, anonymous
// - Give them a low-friction way to start
// - Show the disclaimer before they engage
//
// The check-in prompts are optional — they're there to help
// people who don't know how to start, not to funnel them.
// ============================================================

import { useState } from "react";
import { Disclaimer } from "./Disclaimer";

interface WelcomeScreenProps {
  onStart: (initialMessage?: string) => void;
}

// Gentle, open-ended prompts to lower the barrier to entry.
// These are suggestions, not a form to fill out.
const OPENING_PROMPTS = [
  "I've been feeling really anxious lately...",
  "Work stress is getting to me...",
  "I'm struggling with a relationship...",
  "I'm worried about my finances...",
  "I haven't been sleeping well and I'm overwhelmed...",
  "I just need to talk to someone...",
];

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [inputValue, setInputValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      onStart(trimmed);
    }
  }

  function handlePromptClick(prompt: string) {
    setInputValue(prompt);
    // Move cursor to end — small UX detail that matters on mobile
    setTimeout(() => {
      const textarea = document.getElementById("welcome-input") as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter (not Shift+Enter — that's a newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        onStart(trimmed);
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 animate-fade-in">
      <div className="w-full max-w-lg">
        {/* Logo / Identity */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-calm-100 rounded-2xl mb-5 shadow-sm">
            {/* Leaf / calm icon — SVG inline so no external deps */}
            <svg
              className="w-8 h-8 text-calm-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c-1.2 5.4-5 8-9 9 0 5 4 9 9 9s9-4 9-9c-4-1-7.8-3.6-9-9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12v9"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-calm-800 tracking-tight">
            CalmSpace
          </h1>
          <p className="text-slate-500 mt-2 text-lg leading-relaxed">
            You&apos;re not alone.
          </p>
        </div>

        {/* Invitation text */}
        <div className="text-center mb-8">
          <p className="text-slate-600 leading-relaxed text-base">
            Whatever is weighing on you right now — worries, fears, stress,
            that feeling you can&apos;t quite name — this is a safe space to
            put it into words. No account needed. No judgment.
          </p>
        </div>

        {/* Main input form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <textarea
              id="welcome-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind today?"
              rows={3}
              className="w-full px-4 py-4 bg-white border border-calm-200 rounded-2xl text-slate-700 placeholder-slate-400 text-base leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
              aria-label="Share what's on your mind"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-full mt-3 px-6 py-3.5 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white font-medium rounded-2xl transition-colors duration-200 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-calm-500 focus:ring-offset-2"
          >
            Start talking
          </button>
        </form>

        {/* Quick-start prompts */}
        <div className="mb-8">
          <p className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wide font-medium">
            Or start with one of these
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {OPENING_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                className="px-3 py-2 bg-white border border-calm-200 hover:border-calm-400 hover:bg-calm-50 text-slate-600 text-sm rounded-xl transition-colors duration-150 text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <Disclaimer />

        {/* Anonymous notice */}
        <p className="text-xs text-slate-400 text-center mt-4">
          Anonymous by default &middot; Nothing is saved unless you choose to
        </p>
      </div>
    </div>
  );
}
