"use client";

// ============================================================
// useTazoniser — Supabase-backed state for the Tazoniser feature
//
// All data is persisted in Supabase (tazoniser_tasks +
// tazoniser_lists tables). Local state is updated optimistically
// so the UI stays responsive — Supabase calls happen in the
// background after each action.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ── Types ─────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  comment: string;   // single note per task — matches DB schema
  createdAt: number;
}

export interface DynamicList {
  id: string;
  name: string;
  tasks: Task[];
  done: Task[];
  createdAt: number;
}

export interface TazoniserState {
  genericList: Task[];
  doneList: Task[];
  dynamicLists: DynamicList[];
}

const MAX_DYNAMIC_LISTS = 5;

// ── DB helpers ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToTask(row: any): Task {
  return {
    id: row.id,
    text: row.title,
    comment: row.comment ?? "",
    createdAt: new Date(row.created_at).getTime(),
  };
}

function emptyState(): TazoniserState {
  return { genericList: [], doneList: [], dynamicLists: [] };
}

async function fetchState(email: string): Promise<TazoniserState> {
  const [{ data: tasksData }, { data: listsData }] = await Promise.all([
    supabaseBrowser
      .from("tazoniser_tasks")
      .select("*")
      .eq("user_email", email)
      .order("created_at"),
    supabaseBrowser
      .from("tazoniser_lists")
      .select("*")
      .eq("user_email", email)
      .order("created_at"),
  ]);

  const tasks = tasksData ?? [];
  const lists = listsData ?? [];

  return {
    genericList: tasks
      .filter((t) => t.list_id === "generic" && !t.done)
      .map(dbRowToTask),
    doneList: tasks
      .filter((t) => t.list_id === "generic" && t.done)
      .map(dbRowToTask),
    dynamicLists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: new Date(l.created_at).getTime(),
      tasks: tasks.filter((t) => t.list_id === l.id && !t.done).map(dbRowToTask),
      done: tasks.filter((t) => t.list_id === l.id && t.done).map(dbRowToTask),
    })),
  };
}

// ── Hook ──────────────────────────────────────────────────────

export function useTazoniser(userEmail: string | null) {
  const [state, setState] = useState<TazoniserState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const loadedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setState(emptyState());
      loadedEmailRef.current = null;
      setHydrated(false);
      return;
    }
    if (loadedEmailRef.current === userEmail) return;
    loadedEmailRef.current = userEmail;
    setHydrated(false);
    fetchState(userEmail).then((s) => {
      setState(s);
      setHydrated(true);
    });
  }, [userEmail]);

  // ── Generic List ──────────────────────────────────────────────

  const addTask = useCallback(async (text: string) => {
    if (!userEmail || !text.trim()) return;
    const id = crypto.randomUUID();
    const task: Task = { id, text: text.trim(), comment: "", createdAt: Date.now() };
    setState((s) => ({ ...s, genericList: [...s.genericList, task] }));
    await supabaseBrowser.from("tazoniser_tasks").insert({
      id,
      user_email: userEmail,
      list_id: "generic",
      title: task.text,
      done: false,
      comment: "",
    });
  }, [userEmail]);

  const removeTask = useCallback(async (taskId: string) => {
    setState((s) => ({ ...s, genericList: s.genericList.filter((t) => t.id !== taskId) }));
    await supabaseBrowser.from("tazoniser_tasks").delete().eq("id", taskId);
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    setState((s) => {
      const task = s.genericList.find((t) => t.id === taskId);
      if (!task) return s;
      return {
        ...s,
        genericList: s.genericList.filter((t) => t.id !== taskId),
        doneList: [...s.doneList, task],
      };
    });
    await supabaseBrowser.from("tazoniser_tasks").update({ done: true }).eq("id", taskId);
  }, []);

  const addCommentToTask = useCallback(async (taskId: string, comment: string) => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      genericList: s.genericList.map((t) =>
        t.id === taskId ? { ...t, comment: trimmed } : t
      ),
    }));
    await supabaseBrowser.from("tazoniser_tasks").update({ comment: trimmed }).eq("id", taskId);
  }, []);

  // ── Done List ─────────────────────────────────────────────────

  const uncompleteTask = useCallback(async (taskId: string) => {
    setState((s) => {
      const task = s.doneList.find((t) => t.id === taskId);
      if (!task) return s;
      return {
        ...s,
        doneList: s.doneList.filter((t) => t.id !== taskId),
        genericList: [...s.genericList, task],
      };
    });
    await supabaseBrowser.from("tazoniser_tasks").update({ done: false }).eq("id", taskId);
  }, []);

  const removeDoneTask = useCallback(async (taskId: string) => {
    setState((s) => ({ ...s, doneList: s.doneList.filter((t) => t.id !== taskId) }));
    await supabaseBrowser.from("tazoniser_tasks").delete().eq("id", taskId);
  }, []);

  // ── Dynamic Lists ─────────────────────────────────────────────

  const createDynamicList = useCallback(async (name: string) => {
    if (!userEmail || !name.trim()) return;
    const id = crypto.randomUUID();
    setState((s) => {
      if (s.dynamicLists.length >= MAX_DYNAMIC_LISTS) return s;
      return {
        ...s,
        dynamicLists: [
          ...s.dynamicLists,
          { id, name: name.trim(), tasks: [], done: [], createdAt: Date.now() },
        ],
      };
    });
    await supabaseBrowser.from("tazoniser_lists").insert({
      id,
      user_email: userEmail,
      name: name.trim(),
    });
  }, [userEmail]);

  const renameDynamicList = useCallback(async (listId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, name: trimmed } : l
      ),
    }));
    await supabaseBrowser.from("tazoniser_lists").update({ name: trimmed }).eq("id", listId);
  }, []);

  const deleteDynamicList = useCallback(async (listId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.filter((l) => l.id !== listId),
    }));
    // Tasks are cascade-deleted via the FK constraint on tazoniser_tasks
    await supabaseBrowser.from("tazoniser_lists").delete().eq("id", listId);
  }, []);

  const addDynamicTask = useCallback(async (listId: string, text: string) => {
    if (!userEmail || !text.trim()) return;
    const id = crypto.randomUUID();
    const task: Task = { id, text: text.trim(), comment: "", createdAt: Date.now() };
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, tasks: [...l.tasks, task] } : l
      ),
    }));
    await supabaseBrowser.from("tazoniser_tasks").insert({
      id,
      user_email: userEmail,
      list_id: listId,
      title: task.text,
      done: false,
      comment: "",
    });
  }, [userEmail]);

  const removeDynamicTask = useCallback(async (listId: string, taskId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) } : l
      ),
    }));
    await supabaseBrowser.from("tazoniser_tasks").delete().eq("id", taskId);
  }, []);

  const completeDynamicTask = useCallback(async (listId: string, taskId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) => {
        if (l.id !== listId) return l;
        const task = l.tasks.find((t) => t.id === taskId);
        if (!task) return l;
        return { ...l, tasks: l.tasks.filter((t) => t.id !== taskId), done: [...l.done, task] };
      }),
    }));
    await supabaseBrowser.from("tazoniser_tasks").update({ done: true }).eq("id", taskId);
  }, []);

  const uncompleteDynamicTask = useCallback(async (listId: string, taskId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) => {
        if (l.id !== listId) return l;
        const task = l.done.find((t) => t.id === taskId);
        if (!task) return l;
        return { ...l, done: l.done.filter((t) => t.id !== taskId), tasks: [...l.tasks, task] };
      }),
    }));
    await supabaseBrowser.from("tazoniser_tasks").update({ done: false }).eq("id", taskId);
  }, []);

  const removeDynamicDoneTask = useCallback(async (listId: string, taskId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, done: l.done.filter((t) => t.id !== taskId) } : l
      ),
    }));
    await supabaseBrowser.from("tazoniser_tasks").delete().eq("id", taskId);
  }, []);

  const addCommentToDynamicTask = useCallback(
    async (listId: string, taskId: string, comment: string) => {
      const trimmed = comment.trim();
      if (!trimmed) return;
      setState((s) => ({
        ...s,
        dynamicLists: s.dynamicLists.map((l) =>
          l.id === listId
            ? { ...l, tasks: l.tasks.map((t) => t.id === taskId ? { ...t, comment: trimmed } : t) }
            : l
        ),
      }));
      await supabaseBrowser.from("tazoniser_tasks").update({ comment: trimmed }).eq("id", taskId);
    },
    []
  );

  return {
    genericList: state.genericList,
    doneList: state.doneList,
    dynamicLists: state.dynamicLists,
    hydrated,
    maxDynamicLists: MAX_DYNAMIC_LISTS,
    addTask,
    removeTask,
    completeTask,
    addCommentToTask,
    uncompleteTask,
    removeDoneTask,
    createDynamicList,
    renameDynamicList,
    deleteDynamicList,
    addDynamicTask,
    removeDynamicTask,
    completeDynamicTask,
    uncompleteDynamicTask,
    removeDynamicDoneTask,
    addCommentToDynamicTask,
  };
}
