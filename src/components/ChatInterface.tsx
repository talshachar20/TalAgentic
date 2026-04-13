"use client";

// ============================================================
// CalmSpace — Main Chat Interface
//
// Manages the conversation state, streaming, crisis detection,
// and the save-session invite flow. This is the core of the app.
//
// State machine (simplified):
//   sending=false, streaming=false → idle, user can type
//   sending=true                   → POST in flight
//   streaming=true                 → streaming response in
//   crisisDetected=true            → crisis banner pinned to top
//   showSaveInvite=true            → save session nudge shown
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { CrisisBanner } from "./CrisisBanner";
import { SaveSessionInvite } from "./SaveSessionInvite";
import { Disclaimer } from "./Disclaimer";
import { detectCrisis } from "@/lib/crisis";
import { generateId, shouldShowSaveInvite } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ChatMessage, CrisisState, SessionPhase } from "@/lib/types";

interface ChatInterfaceProps {
  initialMessage?: string;
  onNewSession: () => void;
}

export function ChatInterface({ initialMessage, onNewSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [crisisState, setCrisisState] = useState<CrisisState>({
    detected: false,
    triggeredAtMessageId: null,
  });
  const [phase, setPhase] = useState<SessionPhase>("chatting");
  const [saveInviteDismissed, setSaveInviteDismissed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [inputValue]);

  // If an initial message was passed from the welcome screen, send it immediately
  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count assistant messages for the save-session heuristic
  const assistantMessageCount = messages.filter((m) => m.role === "assistant").length;

  // Show save invite after enough back-and-forth, unless dismissed
  const showSaveInvite =
    shouldShowSaveInvite(assistantMessageCount) &&
    !saveInviteDismissed &&
    !isStreaming &&
    phase === "chatting";

  /**
   * Core send function. Handles:
   * - Appending user message
   * - Crisis detection
   * - Streaming Claude response
   * - Error states
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || isSending) return;

      // Build the user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      // Check for crisis signals before anything else
      if (detectCrisis(trimmed)) {
        setCrisisState({
          detected: true,
          triggeredAtMessageId: userMessage.id,
        });
      }

      // Optimistically add user message to state
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");
      setIsSending(true);

      // Placeholder for the streaming assistant message
      const assistantMessageId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsSending(false);
      setIsStreaming(true);

      // Abort controller so we can cancel if needed
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(
            errorBody.error || `Request failed with status ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error("Response body is empty");
        }

        // Read the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();

            if (data === "[DONE]") {
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                // Server sent an error through the stream
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: parsed.error }
                      : m
                  )
                );
                setIsStreaming(false);
                return;
              }

              if (parsed.text) {
                // Append the chunk to the assistant message
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // Malformed SSE chunk — skip it
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User navigated away or cancelled — not an error
          return;
        }

        console.error("[CalmSpace] Chat error:", err);

        // Replace the empty assistant placeholder with a gentle error message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    "I'm having a little trouble connecting right now. Please give it a moment and try again — I'm still here.",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        setIsSending(false);
      }
    },
    [messages, isStreaming, isSending]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  function handleSaveSession() {
    // TODO: Wire up Clerk/Auth0. For now, show a placeholder state.
    setSaveInviteDismissed(true);
    alert("Account creation coming soon! Your session is safe for now.");
  }

  const isInputDisabled = isStreaming || isSending;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-calm-100 bg-calm-50/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-calm-600 rounded-xl flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c-1.2 5.4-5 8-9 9 0 5 4 9 9 9s9-4 9-9c-4-1-7.8-3.6-9-9z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-calm-800 text-sm leading-none">
              CalmSpace
            </h1>
            <p className="text-xs text-calm-500 mt-0.5">
              {isStreaming ? "Responding..." : "Here with you"}
            </p>
          </div>
        </div>

        <button
          onClick={onNewSession}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-calm-100"
          title="Start a new session"
        >
          New session
        </button>
      </header>

      {/* Crisis banner — pinned below header when triggered */}
      {crisisState.detected && (
        <div className="flex-shrink-0 pt-4">
          <CrisisBanner />
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm">Starting your session...</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isLastMessage && isStreaming}
            />
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Save session invite — appears above the input area */}
      {showSaveInvite && (
        <div className="flex-shrink-0">
          <SaveSessionInvite
            onDismiss={() => setSaveInviteDismissed(true)}
            onSave={handleSaveSession}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-calm-100 bg-calm-50/80 backdrop-blur-sm px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind..."
            rows={1}
            disabled={isInputDisabled}
            className={cn(
              "flex-1 px-4 py-3 bg-white border border-calm-200 rounded-2xl text-slate-700 placeholder-slate-400 text-sm leading-relaxed shadow-sm transition-all",
              "focus:outline-none focus:ring-2 focus:ring-calm-400 focus:border-transparent",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "min-h-[44px] max-h-[160px]"
            )}
            aria-label="Your message"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isInputDisabled}
            className={cn(
              "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-calm-500 focus:ring-offset-2",
              inputValue.trim() && !isInputDisabled
                ? "bg-calm-600 hover:bg-calm-700 text-white"
                : "bg-calm-100 text-calm-300 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5M5 12l7-7 7 7"
              />
            </svg>
          </button>
        </form>

        {/* Disclaimer — compact version in chat footer */}
        <Disclaimer compact className="mt-2.5" />
      </div>
    </div>
  );
}
