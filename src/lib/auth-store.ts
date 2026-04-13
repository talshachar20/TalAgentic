// ============================================================
// CalmSpace — Supabase-backed Auth Store
//
// User accounts are persisted in Supabase (postgres).
// Sessions remain in-memory — users re-login after a server
// restart. Wire up a sessions table to change this.
// ============================================================

import { supabase } from "./supabase";

// In-memory session store: token → email
const sessions = new Map<string, string>();

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "calmspace-v1");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<void> {
  const key = email.toLowerCase().trim();
  const passwordHash = await hashPassword(password);

  const { error } = await supabase
    .from("users")
    .insert({ email: key, name: name.trim(), password_hash: passwordHash });

  if (error) {
    if (error.code === "23505") throw new Error("EMAIL_TAKEN");
    throw error;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ email: string; name: string } | null> {
  const key = email.toLowerCase().trim();
  const hash = await hashPassword(password);

  const { data, error } = await supabase
    .from("users")
    .select("email, name, password_hash")
    .eq("email", key)
    .single();

  if (error || !data) return null;
  return data.password_hash === hash
    ? { email: data.email, name: data.name }
    : null;
}

export function createSession(email: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, email.toLowerCase().trim());
  return token;
}

export async function getSessionUser(
  token: string
): Promise<{ email: string; name: string } | null> {
  const email = sessions.get(token);
  if (!email) return null;

  const { data, error } = await supabase
    .from("users")
    .select("email, name")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return { email: data.email, name: data.name };
}

export function destroySession(token: string): void {
  sessions.delete(token);
}
