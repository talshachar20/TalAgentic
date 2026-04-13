"use client";

// ============================================================
// DynamicLists — manages up to 5 user-created named lists
//
// Each list is self-contained: its own to-do tasks and its own
// done section. Create / rename / delete the list itself here.
// Task operations are delegated to TaskList and DoneList.
// ============================================================

import { useState } from "react";
import { TaskList } from "./TaskList";
import { DoneList } from "./DoneList";
import type { DynamicList } from "@/hooks/useTazoniser";

interface DynamicListsProps {
  lists: DynamicList[];
  maxLists: number;
  onCreateList: (name: string) => void;
  onRenameList: (listId: string, name: string) => void;
  onDeleteList: (listId: string) => void;
  onAddTask: (listId: string, text: string) => void;
  onRemoveTask: (listId: string, taskId: string) => void;
  onCompleteTask: (listId: string, taskId: string) => void;
  onUncompleteTask: (listId: string, taskId: string) => void;
  onRemoveDoneTask: (listId: string, taskId: string) => void;
  onAddComment: (listId: string, taskId: string, comment: string) => void;
}

export function DynamicLists({
  lists,
  maxLists,
  onCreateList,
  onRenameList,
  onDeleteList,
  onAddTask,
  onRemoveTask,
  onCompleteTask,
  onUncompleteTask,
  onRemoveDoneTask,
  onAddComment,
}: DynamicListsProps) {
  const [newListName, setNewListName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Track which lists have their done section expanded
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());
  // Track which lists are collapsed entirely
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set());
  // Track pending delete confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const atCapacity = lists.length >= maxLists;

  function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed || atCapacity) return;
    onCreateList(trimmed);
    setNewListName("");
  }

  function startRename(list: DynamicList) {
    setRenamingId(list.id);
    setRenameValue(list.name);
  }

  function commitRename(listId: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRenameList(listId, trimmed);
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function toggleDone(listId: string) {
    setExpandedDone((prev) => {
      const next = new Set(prev);
      next.has(listId) ? next.delete(listId) : next.add(listId);
      return next;
    });
  }

  function toggleCollapse(listId: string) {
    setCollapsedLists((prev) => {
      const next = new Set(prev);
      next.has(listId) ? next.delete(listId) : next.add(listId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Create new list form */}
      <form onSubmit={handleCreateList} className="flex gap-2">
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder={
            atCapacity
              ? `Maximum ${maxLists} lists reached`
              : "New list name… (e.g. Team Alpha Todo)"
          }
          disabled={atCapacity}
          className="flex-1 px-4 py-2.5 bg-white border border-calm-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent transition-shadow disabled:bg-calm-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={!newListName.trim() || atCapacity}
          className="px-4 py-2.5 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          Create list
        </button>
      </form>

      {atCapacity && (
        <p className="text-xs text-sand-600 bg-sand-50 border border-sand-200 rounded-xl px-4 py-3">
          You have reached the maximum of {maxLists} custom lists. Delete one
          to create another.
        </p>
      )}

      {lists.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No custom lists yet — create one above.
        </p>
      ) : (
        <div className="space-y-5">
          {lists.map((list) => {
            const isCollapsed = collapsedLists.has(list.id);
            const isDoneExpanded = expandedDone.has(list.id);

            return (
              <div
                key={list.id}
                className="border border-calm-200 rounded-2xl overflow-hidden bg-calm-50"
              >
                {/* List header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-calm-100">
                  {renamingId === list.id ? (
                    // Inline rename input
                    <div className="flex-1 flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(list.id);
                          if (e.key === "Escape") {
                            setRenamingId(null);
                            setRenameValue("");
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-calm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-calm-400"
                      />
                      <button
                        onClick={() => commitRename(list.id)}
                        className="px-3 py-1.5 bg-calm-600 text-white text-xs rounded-lg hover:bg-calm-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setRenamingId(null); setRenameValue(""); }}
                        className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-xs rounded-lg hover:bg-calm-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* List name + task count */}
                      <button
                        onClick={() => toggleCollapse(list.id)}
                        className="flex-1 flex items-center gap-2 text-left group"
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} "${list.name}"`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <polyline points="2,4 6,8 10,4" />
                        </svg>
                        <h3 className="text-sm font-semibold text-calm-800 group-hover:text-calm-600 transition-colors">
                          {list.name}
                        </h3>
                        <span className="text-xs text-slate-400 font-normal">
                          {list.tasks.length} task{list.tasks.length !== 1 ? "s" : ""}
                          {list.done.length > 0 && `, ${list.done.length} done`}
                        </span>
                      </button>

                      {/* List actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startRename(list)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-calm-600 hover:bg-calm-100 rounded-lg transition-colors"
                          aria-label={`Rename "${list.name}"`}
                        >
                          Rename
                        </button>
                        {confirmDeleteId === list.id ? (
                          // Confirmation prompt — accidental deletions are annoying
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-500">Delete list?</span>
                            <button
                              onClick={() => {
                                onDeleteList(list.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs text-white bg-red-400 hover:bg-red-500 rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-calm-100 rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(list.id)}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label={`Delete "${list.name}"`}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* List body — collapsible */}
                {!isCollapsed && (
                  <div className="px-4 py-4 space-y-4">
                    {/* Active tasks */}
                    <TaskList
                      tasks={list.tasks}
                      onAdd={(text) => onAddTask(list.id, text)}
                      onComplete={(taskId) => onCompleteTask(list.id, taskId)}
                      onRemove={(taskId) => onRemoveTask(list.id, taskId)}
                      onAddComment={(taskId, comment) =>
                        onAddComment(list.id, taskId, comment)
                      }
                      placeholder="Add a task to this list…"
                    />

                    {/* Done section toggle */}
                    <div className="pt-1">
                      <button
                        onClick={() => toggleDone(list.id)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-calm-600 transition-colors"
                        aria-expanded={isDoneExpanded}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${isDoneExpanded ? "" : "-rotate-90"}`}
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <polyline points="2,4 6,8 10,4" />
                        </svg>
                        Done ({list.done.length})
                      </button>

                      {isDoneExpanded && (
                        <div className="mt-3">
                          <DoneList
                            tasks={list.done}
                            onUncomplete={(taskId) =>
                              onUncompleteTask(list.id, taskId)
                            }
                            onRemove={(taskId) =>
                              onRemoveDoneTask(list.id, taskId)
                            }
                            emptyMessage="No completed tasks in this list yet."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
