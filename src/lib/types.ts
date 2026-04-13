// ============================================================
// CalmSpace — Shared Types
// ============================================================

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export type SessionPhase =
  | "welcome"      // Landing screen — gentle opening prompt
  | "chatting"     // Active conversation
  | "save-invite"; // Post-session invite to create an account

export interface CrisisResource {
  name: string;
  description: string;
  contact: string;
  url: string;
  available: string;
}

// Populated from the crisis-resources module — keeps UI code clean
export interface CrisisState {
  detected: boolean;
  // The message index that triggered detection (so we can anchor the banner)
  triggeredAtMessageId: string | null;
}
