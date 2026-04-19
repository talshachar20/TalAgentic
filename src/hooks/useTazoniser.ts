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
import { getSupabaseBrowser } from "@/lib/supabase-browser";

// ── Types ─────────────────────────────────────────────────────

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface Task {
  id: string;
  text: string;
  comment: string;   // single note per task — matches DB schema
  subTasks: SubTask[];
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

const MAX_DYNAMIC_LISTS = 15;

// ── DB helpers ─────────────────────────────────────────────────

interface TaskRow {
  id: string;
  title: string;
  comment: string;
  done: boolean;
  list_id: string;
  created_at: string;
}

interface ListRow {
  id: string;
  name: string;
  created_at: string;
}

interface SubTaskRow {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  created_at: string;
}

function dbRowToTask(row: TaskRow, subTasks: SubTask[] = []): Task {
  return {
    id: row.id,
    text: row.title,
    comment: row.comment ?? "",
    subTasks,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function emptyState(): TazoniserState {
  return { genericList: [], doneList: [], dynamicLists: [] };
}

function updateTaskInState(
  state: TazoniserState,
  taskId: string,
  updater: (task: Task) => Task
): TazoniserState {
  const mapTask = (t: Task) => (t.id === taskId ? updater(t) : t);
  return {
    ...state,
    genericList: state.genericList.map(mapTask),
    doneList: state.doneList.map(mapTask),
    dynamicLists: state.dynamicLists.map((l) => ({
      ...l,
      tasks: l.tasks.map(mapTask),
      done: l.done.map(mapTask),
    })),
  };
}

async function fetchState(email: string): Promise<TazoniserState> {
  const sb = getSupabaseBrowser();
  const [{ data: tasksData }, { data: listsData }, { data: subTasksData }] = await Promise.all([
    sb.from("tazoniser_tasks").select("*").eq("user_email", email).order("created_at"),
    sb.from("tazoniser_lists").select("*").eq("user_email", email).order("created_at"),
    sb.from("tazoniser_subtasks").select("*").eq("user_email", email).order("created_at"),
  ]);

  const tasks = (tasksData ?? []) as TaskRow[];
  const lists = (listsData ?? []) as ListRow[];
  const rawSubTasks = (subTasksData ?? []) as SubTaskRow[];

  // Build taskId → SubTask[] map
  const subTaskMap = new Map<string, SubTask[]>();
  for (const s of rawSubTasks) {
    const arr = subTaskMap.get(s.task_id) ?? [];
    arr.push({ id: s.id, text: s.title, done: s.done, createdAt: new Date(s.created_at).getTime() });
    subTaskMap.set(s.task_id, arr);
  }
  const toTask = (row: TaskRow) => dbRowToTask(row, subTaskMap.get(row.id) ?? []);

  return {
    genericList: tasks.filter((t) => t.list_id === "generic" && !t.done).map(toTask),
    doneList: tasks.filter((t) => t.list_id === "generic" && t.done).map(toTask),
    dynamicLists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: new Date(l.created_at).getTime(),
      tasks: tasks.filter((t) => t.list_id === l.id && !t.done).map(toTask),
      done: tasks.filter((t) => t.list_id === l.id && t.done).map(toTask),
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
    const task: Task = { id, text: text.trim(), comment: "", subTasks: [], createdAt: Date.now() };
    setState((s) => ({ ...s, genericList: [...s.genericList, task] }));
    await getSupabaseBrowser().from("tazoniser_tasks").insert({
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
    await getSupabaseBrowser().from("tazoniser_tasks").delete().eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_tasks").update({ done: true }).eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_tasks").update({ comment: trimmed }).eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_tasks").update({ done: false }).eq("id", taskId);
  }, []);

  const removeDoneTask = useCallback(async (taskId: string) => {
    setState((s) => ({ ...s, doneList: s.doneList.filter((t) => t.id !== taskId) }));
    await getSupabaseBrowser().from("tazoniser_tasks").delete().eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_lists").insert({
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
    await getSupabaseBrowser().from("tazoniser_lists").update({ name: trimmed }).eq("id", listId);
  }, []);

  const deleteDynamicList = useCallback(async (listId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.filter((l) => l.id !== listId),
    }));
    // Tasks are cascade-deleted via the FK constraint on tazoniser_tasks
    await getSupabaseBrowser().from("tazoniser_lists").delete().eq("id", listId);
  }, []);

  const addDynamicTask = useCallback(async (listId: string, text: string) => {
    if (!userEmail || !text.trim()) return;
    const id = crypto.randomUUID();
    const task: Task = { id, text: text.trim(), comment: "", subTasks: [], createdAt: Date.now() };
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, tasks: [...l.tasks, task] } : l
      ),
    }));
    await getSupabaseBrowser().from("tazoniser_tasks").insert({
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
    await getSupabaseBrowser().from("tazoniser_tasks").delete().eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_tasks").update({ done: true }).eq("id", taskId);
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
    await getSupabaseBrowser().from("tazoniser_tasks").update({ done: false }).eq("id", taskId);
  }, []);

  const removeDynamicDoneTask = useCallback(async (listId: string, taskId: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId ? { ...l, done: l.done.filter((t) => t.id !== taskId) } : l
      ),
    }));
    await getSupabaseBrowser().from("tazoniser_tasks").delete().eq("id", taskId);
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
      await getSupabaseBrowser().from("tazoniser_tasks").update({ comment: trimmed }).eq("id", taskId);
    },
    []
  );

  // ── Sub-tasks ─────────────────────────────────────────────────
  // These work across all list types — updateTaskInState searches
  // genericList, doneList, and every dynamic list by task ID.

  const addSubTask = useCallback(async (taskId: string, text: string) => {
    if (!userEmail || !text.trim()) return;
    const id = crypto.randomUUID();
    const subTask: SubTask = { id, text: text.trim(), done: false, createdAt: Date.now() };
    setState((s) =>
      updateTaskInState(s, taskId, (t) => ({ ...t, subTasks: [...t.subTasks, subTask] }))
    );
    await getSupabaseBrowser().from("tazoniser_subtasks").insert({
      id,
      task_id: taskId,
      user_email: userEmail,
      title: subTask.text,
      done: false,
    });
  }, [userEmail]);

  const toggleSubTask = useCallback(async (taskId: string, subTaskId: string, done: boolean) => {
    setState((s) =>
      updateTaskInState(s, taskId, (t) => ({
        ...t,
        subTasks: t.subTasks.map((st) => (st.id === subTaskId ? { ...st, done } : st)),
      }))
    );
    await getSupabaseBrowser().from("tazoniser_subtasks").update({ done }).eq("id", subTaskId);
  }, []);

  const removeSubTask = useCallback(async (taskId: string, subTaskId: string) => {
    setState((s) =>
      updateTaskInState(s, taskId, (t) => ({
        ...t,
        subTasks: t.subTasks.filter((st) => st.id !== subTaskId),
      }))
    );
    await getSupabaseBrowser().from("tazoniser_subtasks").delete().eq("id", subTaskId);
  }, []);

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
    addSubTask,
    toggleSubTask,
    removeSubTask,
  };
}
