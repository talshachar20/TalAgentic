"use client";

// ============================================================
// DoneList — completed tasks display
//
// Shared by both the generic done section and each dynamic
// list's done section. Tasks can be unchecked (moved back to
// active) or permanently removed here.
// ============================================================

import type { Task } from "@/hooks/useTazoniser";

interface DoneListProps {
  tasks: Task[];
  onUncomplete: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  emptyMessage?: string;
}

export function DoneList({
  tasks,
  onUncomplete,
  onRemove,
  emptyMessage = "Nothing here yet — complete a task to see it here.",
}: DoneListProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-start gap-3 px-4 py-3 bg-white border border-calm-100 rounded-xl"
        >
          {/* Checked state — clicking uncompletes */}
          <button
            onClick={() => onUncomplete(task.id)}
            className="mt-0.5 flex-none w-5 h-5 rounded-md bg-calm-500 border-2 border-calm-500 hover:bg-calm-400 hover:border-calm-400 transition-colors flex items-center justify-center"
            aria-label={`Unmark "${task.text}" as done`}
            title="Click to move back to To-Do"
          >
            <svg
              className="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </button>

          {/* Task text — visually struck through */}
          <div className="flex-1 min-w-0">
            <span className="text-sm text-slate-400 line-through leading-relaxed">
              {task.text}
            </span>
            {/* Show note if any — read-only in done state */}
            {task.comment && (
              <p className="mt-1.5 text-xs text-slate-400 bg-calm-50 rounded-lg px-2.5 py-1.5 leading-relaxed">
                {task.comment}
              </p>
            )}
          </div>

          {/* Remove permanently */}
          <button
            onClick={() => onRemove(task.id)}
            className="flex-none p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Remove "${task.text}" permanently`}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
