"use client";

import { useState } from "react";
import Link from "next/link";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInterface } from "@/components/ChatInterface";
import { useAuth } from "@/hooks/useAuth";

type AppPhase = "welcome" | "chatting";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("welcome");
  const [initialMessage, setInitialMessage] = useState<string | undefined>();
  const { user, loading, logout } = useAuth();

  function handleStart(message?: string) {
    setInitialMessage(message);
    setPhase("chatting");
  }

  function handleNewSession() {
    setInitialMessage(undefined);
    setPhase("welcome");
  }

  return (
    <main className="h-full flex flex-col">
      {/* Auth header */}
      <header className="flex-none flex items-center justify-end px-4 py-2.5 border-b border-calm-100 bg-white/80 backdrop-blur-sm">
        {!loading && (
          user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/tazoniser"
                className="text-sm text-slate-500 hover:text-calm-700 transition-colors"
              >
                Tazoniser
              </Link>
              <span className="text-sm text-slate-500">
                Hi,{" "}
                <span className="text-calm-700 font-medium">{user.name}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-slate-500 hover:text-calm-700 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm px-3.5 py-1.5 bg-calm-600 hover:bg-calm-700 text-white rounded-lg transition-colors font-medium"
              >
                Create account
              </Link>
            </div>
          )
        )}
      </header>

      {phase === "welcome" ? (
        <WelcomeScreen onStart={handleStart} />
      ) : (
        <ChatInterface
          initialMessage={initialMessage}
          onNewSession={handleNewSession}
        />
      )}
    </main>
  );
}
