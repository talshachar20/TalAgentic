"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import { useTazoniser } from "@/hooks/useTazoniser";
import type { DynamicList } from "@/hooks/useTazoniser";
import { TaskList } from "@/components/tazoniser/TaskList";
import { DoneList } from "@/components/tazoniser/DoneList";

export default function TazoniserPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const taz = useTazoniser(user?.email ?? null);

  // Panel order: fixed IDs + dynamic list IDs
  const [panelOrder, setPanelOrder] = useState<string[]>(["generic", "done"]);
  const [newListName, setNewListName] = useState("");

  // Sync panel order when dynamic lists load or change
  useEffect(() => {
    if (!taz.hydrated) return;
    setPanelOrder((prev) => {
      const dynamicIds = taz.dynamicLists.map((l) => l.id);
      const kept = prev.filter(
        (id) => id === "generic" || id === "done" || dynamicIds.includes(id)
      );
      const added = dynamicIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [taz.hydrated, taz.dynamicLists]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPanelOrder((items) =>
      arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id)))
    );
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    await taz.createDynamicList(trimmed);
    setNewListName("");
  }

  // ── Auth loading ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader user={null} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center">
          <span className="w-6 h-6 rounded-full border-2 border-calm-300 border-t-calm-600 animate-spin" />
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
              <svg className="w-7 h-7 text-calm-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-calm-800 mb-2">Sign in to use Tazoniser</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Tazoniser saves your tasks to your account so they are here whenever you need them.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/login" className="w-full px-6 py-3.5 bg-calm-600 hover:bg-calm-700 text-white font-medium rounded-2xl transition-colors text-base text-center shadow-sm">
                Sign in
              </Link>
              <Link href="/signup" className="w-full px-6 py-3.5 bg-white hover:bg-calm-50 text-calm-700 font-medium rounded-2xl transition-colors text-base text-center border border-calm-200">
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={panelOrder} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 px-6 py-6 h-full items-start">

              {panelOrder.map((id) => {
                if (id === "generic") {
                  return (
                    <SortableCard key="generic" id="generic" title="To-Do" description="Your general task list">
                      <TaskList
                        tasks={taz.genericList}
                        onAdd={taz.addTask}
                        onComplete={taz.completeTask}
                        onRemove={taz.removeTask}
                        onAddComment={taz.addCommentToTask}
                      />
                      <DoneSection
                        count={taz.doneList.length}
                        tasks={taz.doneList}
                        onUncomplete={taz.uncompleteTask}
                        onRemove={taz.removeDoneTask}
                      />
                    </SortableCard>
                  );
                }

                if (id === "done") {
                  return (
                    <SortableCard key="done" id="done" title="Done" description="All completed tasks">
                      <DoneList
                        tasks={taz.doneList}
                        onUncomplete={taz.uncompleteTask}
                        onRemove={taz.removeDoneTask}
                      />
                    </SortableCard>
                  );
                }

                const list = taz.dynamicLists.find((l) => l.id === id);
                if (!list) return null;
                return (
                  <DynamicCard
                    key={id}
                    list={list}
                    onAddTask={(text) => taz.addDynamicTask(id, text)}
                    onCompleteTask={(taskId) => taz.completeDynamicTask(id, taskId)}
                    onRemoveTask={(taskId) => taz.removeDynamicTask(id, taskId)}
                    onAddComment={(taskId, c) => taz.addCommentToDynamicTask(id, taskId, c)}
                    onUncomplete={(taskId) => taz.uncompleteDynamicTask(id, taskId)}
                    onRemoveDone={(taskId) => taz.removeDynamicDoneTask(id, taskId)}
                    onRename={(name) => taz.renameDynamicList(id, name)}
                    onDelete={() => taz.deleteDynamicList(id)}
                  />
                );
              })}

              {/* Add new list card */}
              {taz.dynamicLists.length < taz.maxDynamicLists && (
                <div className="w-72 flex-none bg-white/60 border-2 border-dashed border-calm-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-40">
                  <p className="text-sm text-slate-400 text-center">New list</p>
                  <form onSubmit={handleCreateList} className="w-full flex flex-col gap-2">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="List name…"
                      className="w-full px-3 py-2 bg-white border border-calm-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!newListName.trim()}
                      className="w-full px-4 py-2 bg-calm-600 hover:bg-calm-700 disabled:bg-calm-200 disabled:text-calm-400 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      Create
                    </button>
                  </form>
                </div>
              )}

            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ── SortableCard ────────────────────────────────────────────────

interface SortableCardProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SortableCard({ id, title, description, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`w-72 flex-none flex flex-col bg-white border border-calm-100 rounded-2xl shadow-sm overflow-hidden max-h-[calc(100vh-8rem)] ${
        isDragging ? "opacity-50 shadow-xl scale-105" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-calm-50 border-b border-calm-100 cursor-grab active:cursor-grabbing select-none"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-calm-800 truncate">{title}</h2>
          <p className="text-xs text-slate-400 truncate">{description}</p>
        </div>
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{children}</div>
    </div>
  );
}

// ── DynamicCard — sortable card with rename + delete ────────────

interface DynamicCardProps {
  list: DynamicList;
  onAddTask: (text: string) => void;
  onCompleteTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onAddComment: (taskId: string, comment: string) => void;
  onUncomplete: (taskId: string) => void;
  onRemoveDone: (taskId: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function DynamicCard({
  list,
  onAddTask,
  onCompleteTask,
  onRemoveTask,
  onAddComment,
  onUncomplete,
  onRemoveDone,
  onRename,
  onDelete,
}: DynamicCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(list.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== list.name) onRename(trimmed);
    setRenaming(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`w-72 flex-none flex flex-col bg-white border border-calm-100 rounded-2xl shadow-sm overflow-hidden max-h-[calc(100vh-8rem)] ${
        isDragging ? "opacity-50 shadow-xl scale-105" : ""
      }`}
    >
      {/* Drag handle + title */}
      <div className="flex items-center gap-2 px-3 py-3 bg-calm-50 border-b border-calm-100">
        <div
          className="flex-none cursor-grab active:cursor-grabbing select-none text-slate-400 hover:text-calm-600 p-0.5"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </div>

        {renaming ? (
          <form onSubmit={handleRename} className="flex-1 flex gap-1.5">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              className="flex-1 min-w-0 px-2 py-1 text-sm border border-calm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calm-400"
            />
          </form>
        ) : (
          <button
            onClick={() => { setRenameValue(list.name); setRenaming(true); }}
            className="flex-1 min-w-0 text-left text-sm font-semibold text-calm-800 truncate hover:text-calm-600 transition-colors"
            title="Click to rename"
          >
            {list.name}
          </button>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1 flex-none">
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">Yes</button>
            <span className="text-slate-300 text-xs">/</span>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-slate-600">No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-none p-1 text-slate-300 hover:text-red-400 transition-colors"
            aria-label={`Delete list "${list.name}"`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <TaskList
          tasks={list.tasks}
          onAdd={onAddTask}
          onComplete={onCompleteTask}
          onRemove={onRemoveTask}
          onAddComment={onAddComment}
        />
        <DoneSection
          count={list.done.length}
          tasks={list.done}
          onUncomplete={onUncomplete}
          onRemove={onRemoveDone}
        />
      </div>
    </div>
  );
}

// ── DoneSection — collapsible done list used inside cards ───────

function DoneSection({
  count,
  tasks,
  onUncomplete,
  onRemove,
}: {
  count: number;
  tasks: ReturnType<typeof useTazoniser>["doneList"];
  onUncomplete: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-calm-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-calm-600 transition-colors w-full"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
        Completed ({count})
      </button>
      {open && (
        <div className="mt-2">
          <DoneList tasks={tasks} onUncomplete={onUncomplete} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

// ── PageHeader ──────────────────────────────────────────────────

function PageHeader({ user, onLogout }: { user: { name: string } | null; onLogout: () => void }) {
  return (
    <header className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-calm-100 bg-white/80 backdrop-blur-sm">
      <span className="text-sm font-semibold text-calm-700">Tazoniser</span>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Hi, <span className="text-calm-700 font-medium">{user.name}</span>
          </span>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

// ── GripIcon ────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="4" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="4" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}
