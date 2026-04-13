"use client";

// ============================================================
// CalmSpace — Chat Message Bubble
//
// Renders a single message in the conversation. The assistant
// messages use a simple markdown-like rendering without pulling
// in a full markdown library — we control what Claude outputs
// well enough with the system prompt, so we just need paragraphs
// and basic bold/emphasis support.
// ============================================================

import { cn, formatTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

/**
 * Very lightweight "markdown" renderer for assistant responses.
 * Handles: paragraphs, **bold**, *italic*, and basic bullet lists.
 * Not a full markdown parser — doesn't need to be. Claude writes prose.
 *
 * If this grows beyond these four cases, pull in react-markdown.
 */
function renderAssistantContent(text: string) {
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;

    // Detect bullet list block
    const lines = trimmed.split("\n");
    const isList = lines.every((l) => l.match(/^[\-\*\•]\s+/));

    if (isList) {
      return (
        <ul key={i} className="list-none space-y-1.5 my-2">
          {lines.map((line, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-calm-400" aria-hidden="true" />
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^[\-\*\•]\s+/, "")) }} />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={i}
        className="leading-relaxed mb-2 last:mb-0"
        dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
      />
    );
  });
}

/** Apply inline bold/italic formatting. Using dangerouslySetInnerHTML here
 *  is acceptable because Claude's output is server-generated — not
 *  user-controlled HTML. Still: only bold, italic, and no other tags allowed. */
function inlineFormat(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** Blinking cursor shown at the end of streaming messages */
function StreamingCursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-0.5 h-4 bg-calm-500 ml-0.5 animate-pulse rounded-sm align-middle"
    />
  );
}

/** The three-dot typing indicator shown before any content arrives */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1" aria-label="CalmSpace is responding">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-2 h-2 bg-calm-400 rounded-full animate-typing-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmptyStreaming = isStreaming && message.content === "";

  return (
    <div
      className={cn(
        "flex items-end gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1",
          isUser
            ? "bg-calm-200 text-calm-700"
            : "bg-calm-600 text-white"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.2 5.4-5 8-9 9 0 5 4 9 9 9s9-4 9-9c-4-1-7.8-3.6-9-9z" />
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%] sm:max-w-[70%]", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-calm-600 text-white rounded-br-sm"
              : "bg-white border border-calm-100 text-slate-700 rounded-bl-sm shadow-sm prose-calm"
          )}
        >
          {isEmptyStreaming ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <>
              {renderAssistantContent(message.content)}
              {isStreaming && <StreamingCursor />}
            </>
          )}
        </div>

        {/* Timestamp — only show on completed messages */}
        {!isStreaming && (
          <time
            dateTime={message.timestamp.toISOString()}
            className={cn(
              "text-xs text-slate-400 mt-1 px-1",
              isUser ? "text-right" : "text-left"
            )}
          >
            {formatTime(message.timestamp)}
          </time>
        )}
      </div>
    </div>
  );
}
