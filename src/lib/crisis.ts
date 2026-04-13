// ============================================================
// CalmSpace — Crisis Detection
//
// Belt-and-suspenders approach: keyword detection fires immediately
// on the client so the user never waits for an API round-trip before
// seeing crisis resources. The system prompt also instructs Claude to
// respond with care and link resources when these themes appear.
//
// IMPORTANT: This is a first-line signal, NOT a clinical assessment.
// False positives are strongly preferred over false negatives here.
// ============================================================

import type { CrisisResource } from "./types";

// Keywords that indicate possible crisis — intentionally broad.
// Grouped by theme so future maintainers can reason about coverage.
const CRISIS_PATTERNS: RegExp[] = [
  // Self-harm and suicidal ideation
  /\b(suicid(e|al|ally)|end\s+my\s+life|kill\s+myself|take\s+my\s+own\s+life)\b/i,
  /\b(self[\s-]?harm|cutting\s+myself|hurt\s+myself)\b/i,
  /\b(don'?t\s+want\s+to\s+(be\s+here|live|exist)\s+anymore)\b/i,
  /\b(no\s+reason\s+to\s+(live|go\s+on))\b/i,
  /\b(want\s+to\s+die|wish\s+i\s+(was|were)\s+dead)\b/i,

  // Hopelessness at intensity level
  /\b(hopeless|worthless|better\s+off\s+without\s+me)\b/i,

  // Crisis / emergency
  /\b(crisis|emergency|in\s+danger)\b/i,

  // Abuse signals
  /\b(being\s+(abused|hurt|threatened)|someone\s+is\s+(hurting|threatening)\s+me)\b/i,
];

/**
 * Returns true if the message content matches any crisis indicator.
 * Called on every user message before the API request is sent.
 */
export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Curated crisis resources — US-centric for MVP.
 * TODO: Expand with international resources and geo-detection.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    description: "Free, confidential support for people in distress",
    contact: "Call or text 988",
    url: "https://988lifeline.org",
    available: "24/7",
  },
  {
    name: "Crisis Text Line",
    description: "Text-based crisis support with trained counselors",
    contact: "Text HOME to 741741",
    url: "https://www.crisistextline.org",
    available: "24/7",
  },
  {
    name: "SAMHSA National Helpline",
    description:
      "Free, confidential treatment referrals for mental health and substance use",
    contact: "1-800-662-4357",
    url: "https://www.samhsa.gov/find-help/national-helpline",
    available: "24/7",
  },
  {
    name: "International Association for Suicide Prevention",
    description: "Crisis centres directory for countries worldwide",
    contact: "Visit website for local numbers",
    url: "https://www.iasp.info/resources/Crisis_Centres/",
    available: "Directory only",
  },
];
