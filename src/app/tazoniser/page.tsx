"use client";

// ============================================================
// Tazoniser — task management page
//
// Three sections:
//   1. Generic To-Do List (with shared Done section)
//   2. Done List (from the generic list)
//   3. Dynamic Lists (up to 5 user-created named lists)
//
// Auth-gated: guests are shown a prompt to sign in, not a
// redirect. Redirects break the back-button UX and are
// annoying when someone opens a direct link.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTazoniser } from "@/hooks/useTazoniser";
import { TaskList } from "@/components/tazoniser/TaskList";
import { DoneList } from "@/components/tazoniser/DoneList";
import { DynamicLists } from "@/components/tazoniser/DynamicLists";

type Section = "todo" | "done" | "dynamic";

export default function TazoniserPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const taz = useTazoniser(user?.email ?? null);
  const [activeSection, setActiveSection] = useState<Section>("todo");
  // Generic Done is a sub-toggle within the todo section
  const [showGenericDone, setShowGenericDone] = useState(false);

  // ── Auth loading state ─────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader user={null} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-calm-300 border-t-calm-600 animate-spin inline-block" />
            Loading…
          </div>
        </div>
      </div>
    );
  }

  // ── Guest gate ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader user={null} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center px-4 py-12 animate-fade-in">
          <div className="w-full max-w-sm text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-calm-100 rounded-2xl mb-6 shadow-sm">
              <svg
                className="w-7 h-7 text-calm-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-calm-800 mb-2">
              Sign in to use Tazoniser
            </h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Tazoniser saves your tasks to your account so they are here
              whenever you need them. Sign in or create a free account to get
              started.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full px-6 py-3.5 bg-calm-600 hover:bg-calm-700 text-white font-medium rounded-2xl transition-colors text-base text-center shadow-sm"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="w-full px-6 py-3.5 bg-white hover:bg-calm-50 text-calm-700 font-medium rounded-2xl transition-colors text-base text-center border border-calm-200"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated view ─────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <PageHeader user={user} onLogout={logout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-semibold text-calm-800 tracking-tight">
              Tazoniser
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Your tasks, organised — one list at a time.
            </p>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-calm-100 rounded-xl p-1">
            {(
              [
                { key: "todo", label: "To-Do", count: taz.genericList.length },
                { key: "done", label: "Done", count: taz.doneList.length },
                { key: "dynamic", label: "My Lists", count: taz.dynamicLists.length },
              ] as { key: Section; label: string; count: number }[]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === key
                    ? "bg-white text-calm-700 shadow-sm"
                    : "text-slate-500 hover:text-calm-600"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-md ${
                      activeSection === key
                        ? "bg-calm-100 text-calm-600"
                        : "bg-calm-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Section 1: Generic To-Do ── */}
          {activeSection === "todo" && (
            <section aria-label="To-Do list">
              <SectionCard
                title="To-Do"
                description="Your general task list. Check off tasks to move them to Done."
              >
                <TaskList
                  tasks={taz.genericList}
                  onAdd={taz.addTask}
                  onComplete={taz.completeTask}
                  onRemove={taz.removeTask}
                  onAddComment={taz.addCommentToTask}
                />
              </SectionCard>

              {/* Inline done toggle — easier than navigating away */}
              <div className="mt-4">
                <button
                  onClick={() => setShowGenericDone((v) => !v)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-calm-600 transition-colors"
                  aria-expanded={showGenericDone}
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showGenericDone ? "" : "-rotate-90"}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="2,4 6,8 10,4" />
                  </svg>
                  Completed ({taz.doneList.length})
                </button>
                {showGenericDone && (
                  <div className="mt-3">
                    <DoneList
                      tasks={taz.doneList}
                      onUncomplete={taz.uncompleteTask}
                      onRemove={taz.removeDoneTask}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Section 2: Done List ── */}
          {activeSection === "done" && (
            <section aria-label="Completed tasks">
              <SectionCard
                title="Done"
                description="Everything you have checked off. Uncheck to move a task back to To-Do."
              >
                <DoneList
                  tasks={taz.doneList}
                  onUncomplete={taz.uncompleteTask}
                  onRemove={taz.removeDoneTask}
                />
              </SectionCard>
            </section>
          )}

          {/* ── Section 3: Dynamic Lists ── */}
          {activeSection === "dynamic" && (
            <section aria-label="My custom lists">
              <SectionCard
                title="My Lists"
                description={`Create up to ${taz.maxDynamicLists} named lists. Each has its own tasks and done section.`}
              >
                <DynamicLists
                  lists={taz.dynamicLists}
                  maxLists={taz.maxDynamicLists}
                  onCreateList={taz.createDynamicList}
                  onRenameList={taz.renameDynamicList}
                  onDeleteList={taz.deleteDynamicList}
                  onAddTask={taz.addDynamicTask}
                  onRemoveTask={taz.removeDynamicTask}
                  onCompleteTask={taz.completeDynamicTask}
                  onUncompleteTask={taz.uncompleteDynamicTask}
                  onRemoveDoneTask={taz.removeDynamicDoneTask}
                  onAddComment={taz.addCommentToDynamicTask}
                />
              </SectionCard>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

interface PageHeaderProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

function PageHeader({ user, onLogout }: PageHeaderProps) {
  return (
    <header className="flex-none flex items-center justify-end px-4 py-2.5 border-b border-calm-100 bg-white/80 backdrop-blur-sm">

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Hi,{" "}
            <span className="text-calm-700 font-medium">{user.name}</span>
          </span>
          <button
            onClick={onLogout}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

interface SectionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="bg-white border border-calm-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-calm-100 bg-calm-50">
        <h2 className="text-base font-semibold text-calm-800">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}
