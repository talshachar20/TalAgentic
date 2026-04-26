"use client";

// ============================================================
// useTazoniser — Supabase-backed state for the Tazoniser feature
//
// All data is persisted in Supabase. Local state is updated
// optimistically so the UI stays responsive.
//
// Shared lists: dynamic lists can be shared with other users
// via tazoniser_list_members. fetchState loads both owned and
// shared lists. A 15-second poll keeps shared lists in sync.
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
  comment: string;
  subTasks: SubTask[];
  createdAt: number;
}

export interface DynamicList {
  id: string;
  name: string;
  tasks: Task[];
  done: Task[];
  createdAt: number;
  ownerEmail: string;
  members: string[];  // collaborator emails (owner excluded)
  isOwner: boolean;
}

export interface TazoniserState {
  genericList: Task[];
  doneList: Task[];
  dynamicLists: DynamicList[];
}

const MAX_DYNAMIC_LISTS = 15;
const POLL_INTERVAL_MS = 15_000;

// ── DB row shapes ──────────────────────────────────────────────

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
  user_email: string;
  created_at: string;
}

interface SubTaskRow {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  created_at: string;
}

interface ListMemberRow {
  list_id: string;
  user_email: string;
}

// ── Pure helpers ───────────────────────────────────────────────

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

// ── fetchState ─────────────────────────────────────────────────
// Loads all lists the user owns or is a member of, plus their
// tasks, subtasks, and member rosters.

async function fetchState(email: string): Promise<TazoniserState> {
  const sb = getSupabaseBrowser();

  // Round 1 (parallel): owned lists + membership links
  const [{ data: ownedListsRaw }, { data: memberLinksRaw }] = await Promise.all([
    sb.from("tazoniser_lists").select("*").eq("user_email", email).order("created_at"),
    sb.from("tazoniser_list_members").select("list_id").eq("user_email", email),
  ]);

  const ownedLists = (ownedListsRaw ?? []) as ListRow[];
  const ownedIds = new Set(ownedLists.map((l) => l.id));
  const foreignIds = ((memberLinksRaw ?? []) as { list_id: string }[])
    .map((r) => r.list_id)
    .filter((id) => !ownedIds.has(id));

  // Round 2 (parallel): shared list details + user's generic tasks
  const [sharedListsData, genericTasksData] = await Promise.all([
    foreignIds.length > 0
      ? sb.from("tazoniser_lists").select("*").in("id", foreignIds).order("created_at")
          .then((r) => (r.data ?? []) as ListRow[])
      : Promise.resolve([] as ListRow[]),
    sb.from("tazoniser_tasks").select("*")
      .eq("user_email", email).eq("list_id", "generic").order("created_at")
      .then((r) => (r.data ?? []) as TaskRow[]),
  ]);

  const allLists = [...ownedLists, ...sharedListsData];
  const allListIds = allLists.map((l) => l.id);

  // Round 3 (parallel): tasks for all accessible lists + member rosters
  const [listTasksData, membersData] = await Promise.all([
    allListIds.length > 0
      ? sb.from("tazoniser_tasks").select("*").in("list_id", allListIds).order("created_at")
          .then((r) => (r.data ?? []) as TaskRow[])
      : Promise.resolve([] as TaskRow[]),
    allListIds.length > 0
      ? sb.from("tazoniser_list_members").select("*").in("list_id", allListIds)
          .then((r) => (r.data ?? []) as ListMemberRow[])
      : Promise.resolve([] as ListMemberRow[]),
  ]);

  // Round 4: subtasks keyed by task ID
  const allTaskIds = [...genericTasksData, ...listTasksData].map((t) => t.id);
  let rawSubTasks: SubTaskRow[] = [];
  if (allTaskIds.length > 0) {
    const { data } = await sb.from("tazoniser_subtasks").select("*")
      .in("task_id", allTaskIds).order("created_at");
    rawSubTasks = (data ?? []) as SubTaskRow[];
  }

  // Build lookup maps
  const subTaskMap = new Map<string, SubTask[]>();
  for (const s of rawSubTasks) {
    const arr = subTaskMap.get(s.task_id) ?? [];
    arr.push({ id: s.id, text: s.title, done: s.done, createdAt: new Date(s.created_at).getTime() });
    subTaskMap.set(s.task_id, arr);
  }

  const memberMap = new Map<string, string[]>();
  for (const m of membersData) {
    const arr = memberMap.get(m.list_id) ?? [];
    arr.push(m.user_email);
    memberMap.set(m.list_id, arr);
  }

  const toTask = (row: TaskRow) => dbRowToTask(row, subTaskMap.get(row.id) ?? []);

  return {
    genericList: genericTasksData.filter((t) => !t.done).map(toTask),
    doneList: genericTasksData.filter((t) => t.done).map(toTask),
    dynamicLists: allLists.map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: new Date(l.created_at).getTime(),
      ownerEmail: l.user_email,
      members: (memberMap.get(l.id) ?? []).filter((e) => e !== l.user_email),
      isOwner: l.user_email === email,
      tasks: listTasksData.filter((t) => t.list_id === l.id && !t.done).map(toTask),
      done: listTasksData.filter((t) => t.list_id === l.id && t.done).map(toTask),
    })),
  };
}

// ── Hook ──────────────────────────────────────────────────────

export function useTazoniser(userEmail: string | null) {
  const [state, setState] = useState<TazoniserState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const loadedEmailRef = useRef<string | null>(null);

  // Initial load
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

  // Polling — keeps shared lists in sync for all collaborators
  useEffect(() => {
    if (!userEmail || !hydrated) return;
    const id = setInterval(() => {
      fetchState(userEmail).then(setState);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userEmail, hydrated]);

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
          {
            id,
            name: name.trim(),
            tasks: [],
            done: [],
            createdAt: Date.now(),
            ownerEmail: userEmail,
            members: [],
            isOwner: true,
          },
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
  // updateTaskInState searches all lists by task ID — works for
  // both own and shared list tasks.

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

  // ── Sharing ───────────────────────────────────────────────────

  const inviteToList = useCallback(async (listId: string, inviteeEmail: string) => {
    const trimmed = inviteeEmail.trim().toLowerCase();
    if (!trimmed || trimmed === userEmail) return;
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId && !l.members.includes(trimmed)
          ? { ...l, members: [...l.members, trimmed] }
          : l
      ),
    }));
    await getSupabaseBrowser()
      .from("tazoniser_list_members")
      .upsert({ list_id: listId, user_email: trimmed }, { onConflict: "list_id,user_email" });
  }, [userEmail]);

  const removeFromList = useCallback(async (listId: string, memberEmail: string) => {
    setState((s) => ({
      ...s,
      dynamicLists: s.dynamicLists.map((l) =>
        l.id === listId
          ? { ...l, members: l.members.filter((e) => e !== memberEmail) }
          : l
      ),
    }));
    await getSupabaseBrowser()
      .from("tazoniser_list_members")
      .delete()
      .eq("list_id", listId)
      .eq("user_email", memberEmail);
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
    inviteToList,
    removeFromList,
  };
}
