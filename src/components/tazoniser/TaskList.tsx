"use client";

// ============================================================
// TaskList — reusable to-do list component
//
// Used by both the Generic list and each Dynamic list.
// Handles: add, check-off, remove, and per-task comments.
// Completed tasks are handed back to the parent via onComplete
// rather than being stored here — the parent decides where
// completed items go (generic done list vs. dynamic done list).
// ============================================================

import { useState } from "react";
import type { Task } from "@/hooks/useTazoniser";

interface TaskListProps {
  tasks: Task[];
  onAdd: (text: string) => void;
  onComplete: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onAddComment: (taskId: string, comment: string) => void;
  placeholder?: string;
}

export function TaskList({
  tasks,
  onAdd,
  onComplete,
  onRemove,
  onAddComment,
  placeholder = "Add a new task…",
}: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState("");
  // Track which task has the comment box open
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewTaskText("");
  }

  function handleAddComment(taskId: string) {
    const draft = commentDrafts[taskId]?.trim();
    if (!draft) return;
    onAddComment(taskId, draft);
    setCommentDrafts((prev) => ({ ...prev, [taskId]: "" }));
    // Leave the comment box open — user may want to add another
  }

  function toggleComments(taskId: string) {
    setExpandedCommentId((prev) => (prev === taskId ? null : taskId));
  }

  return (
    <div className="space-y-3">
      {/* Add task form */}
      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 bg-white border border-calm-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
        />
        <button
          type="submit"
          disabled={!newTaskText.trim()}
          className="px-4 py-2.5 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white text-sm font-medium rounded-xl transition-colors"
          aria-label="Add task"
        >
          Add
        </button>
      </form>

      {/* Task items */}
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No tasks yet — add one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="bg-white border border-calm-100 rounded-xl overflow-hidden animate-slide-up"
            >
              {/* Task row */}
              <div className="flex items-start gap-3 px-4 py-3">
                {/* Check-off button */}
                <button
                  onClick={() => onComplete(task.id)}
                  className="mt-0.5 flex-none w-5 h-5 rounded-md border-2 border-calm-300 hover:border-calm-500 hover:bg-calm-50 transition-colors flex items-center justify-center group"
                  aria-label={`Mark "${task.text}" as done`}
                >
                  {/* Empty circle — filled state only exists in DoneList */}
                  <svg
                    className="w-3 h-3 text-calm-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                </button>

                {/* Task text */}
                <span className="flex-1 text-sm text-slate-700 leading-relaxed pt-0.5">
                  {task.text}
                </span>

                {/* Action buttons */}
                <div className="flex-none flex items-center gap-1">
                  <button
                    onClick={() => toggleComments(task.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      expandedCommentId === task.id
                        ? "bg-calm-100 text-calm-700"
                        : "text-slate-400 hover:text-calm-600 hover:bg-calm-50"
                    }`}
                    aria-label={`${expandedCommentId === task.id ? "Hide" : "Show"} note for "${task.text}"`}
                  >
                    {task.comment ? "Note ✓" : "Note"}
                  </button>
                  <button
                    onClick={() => onRemove(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={`Remove "${task.text}"`}
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
                </div>
              </div>

              {/* Expandable note section */}
              {expandedCommentId === task.id && (
                <div className="border-t border-calm-100 px-4 py-3 bg-calm-50 space-y-2">
                  {/* Existing note */}
                  {task.comment && (
                    <p className="text-xs text-slate-600 bg-white border border-calm-100 rounded-lg px-3 py-2 leading-relaxed">
                      {task.comment}
                    </p>
                  )}

                  {/* New comment input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentDrafts[task.id] ?? ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(task.id);
                        }
                      }}
                      placeholder="Add a note…"
                      className="flex-1 px-3 py-2 bg-white border border-calm-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow"
                    />
                    <button
                      onClick={() => handleAddComment(task.id)}
                      disabled={!commentDrafts[task.id]?.trim()}
                      className="px-3 py-2 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
