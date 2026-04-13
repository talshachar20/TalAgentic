import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts. The two functions that every
 *  Next.js project eventually needs and nobody writes from scratch. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a short random ID — not cryptographically secure, just unique
 *  enough for React keys and message IDs within a single session. */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Format a Date for display in the chat — "2:34 PM" style. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Determine whether a session is "helpful enough" to prompt a save invite.
 * The heuristic: at least 3 assistant messages (meaning real back-and-forth),
 * and the last assistant message is not empty.
 *
 * This is intentionally simple. We're not scoring sentiment here.
 * If someone had a conversation, they might want to save it.
 */
export function shouldShowSaveInvite(assistantMessageCount: number): boolean {
  return assistantMessageCount >= 3;
}
