import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { CALMSPACE_SYSTEM_PROMPT } from "@/lib/system-prompt";

// The Anthropic SDK is instantiated once at module level.
// In a serverless environment (Vercel), this module is re-evaluated per
// cold start — that's fine. The key is not re-instantiated per request.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Shape of a single message as sent from the client
interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: IncomingMessage[];
}

export async function POST(req: NextRequest) {
  // Validate API key is configured — fail fast and clearly
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[CalmSpace] ANTHROPIC_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error. Please contact support." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No messages provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Sanitize messages — only pass role and content to the API.
  // Never trust client-provided data structure for API calls.
  const sanitizedMessages: Anthropic.MessageParam[] = messages
    .filter(
      (m): m is IncomingMessage =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));

  if (sanitizedMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid messages after sanitization" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Ensure the conversation starts with a user message — Claude requires this.
  if (sanitizedMessages[0].role !== "user") {
    return new Response(
      JSON.stringify({ error: "Conversation must begin with a user message" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Stream the response back to the client using the native Fetch/Web Streams API.
    // This gives us a ReadableStream we can pipe directly — no intermediate buffering.
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use the Anthropic streaming API.
          // Model is claude-sonnet-4-6 per the product brief.
          // Temperature 0.7 — warm and natural but not erratic.
          // Max tokens 1024 — enough for a thoughtful response, not a treatise.
          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            temperature: 0.7,
            system: CALMSPACE_SYSTEM_PROMPT,
            messages: sanitizedMessages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // Send each text chunk as a Server-Sent Event
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          // Signal the end of the stream
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          // Log server-side, send a generic message client-side
          console.error("[CalmSpace] Stream error:", streamError);
          const errorChunk = `data: ${JSON.stringify({
            error: "Something went wrong. Please try again in a moment.",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // CORS — tighten this for production if needed
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    // Handle Anthropic API errors specifically
    if (error instanceof Anthropic.APIError) {
      console.error(`[CalmSpace] Anthropic API error ${error.status}:`, error.message);

      // Rate limiting — tell the user to slow down, not that we broke
      if (error.status === 429) {
        return new Response(
          JSON.stringify({
            error: "We're receiving a lot of requests right now. Please wait a moment and try again.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      // Auth failure — configuration problem, not user problem
      if (error.status === 401) {
        return new Response(
          JSON.stringify({ error: "Server configuration error. Please contact support." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    console.error("[CalmSpace] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
