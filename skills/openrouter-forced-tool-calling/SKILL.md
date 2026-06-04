---
name: openrouter-forced-tool-calling
description: Call an LLM through OpenRouter from a server-side route and force a single tool call so the model returns typed JSON instead of free text. Use when you need structured, schema-validated output from a chat model in one round-trip (no agent loop), with a swappable model id and retry/backoff on transient errors.
---

# OpenRouter forced tool-calling (single call → typed JSON)

## When to use this

You want an LLM answer as **validated JSON of a known shape**, not free text you have to
parse. You make **one** request, force the model to call **one** tool whose parameters
*are* your output schema, and read the result from `tool_calls[0].function.arguments`.

This is the pattern behind `supabase/functions/chat/index.ts` in this repo.

## Ground rules this satisfies

- **All model calls go through OpenRouter**, server-side only — the key never reaches the
  browser. OpenRouter normalizes the tool format across providers, so the same code works
  for Claude / GPT / Gemini; you swap one string.
- **Model id is a single config value** (`OPENROUTER_MODEL`) — swappable without code changes.
- **Transient failures (429/5xx) are retried** with backoff.

## Prerequisites

- A server-side runtime (Supabase Edge Function / Next.js route / any Node-or-Deno backend).
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` available **only** server-side
  (e.g. `supabase secrets set ...`, or Vercel server env — never a `VITE_`/`NEXT_PUBLIC_` var).

## Step 1 — shared client + retry

```ts
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";

const RETRYABLE_STATUSES = new Set([429, 502, 503, 529]);
const MAX_RETRIES = 3;

export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, init);
    if (response.ok || !RETRYABLE_STATUSES.has(response.status)) return response;
    lastError = new Error(`OpenRouter error (${response.status}): ${await response.text()}`);
    if (attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get("retry-after");
      const delay = retryAfter ? Number(retryAfter) * 1000 : 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError!;
}
```

(Use `process.env.OPENROUTER_MODEL` instead of `Deno.env.get` on Node/Next.js.)

## Step 2 — define one tool whose parameters are the shape you want back

```ts
const chatTool = {
  type: "function" as const,
  function: {
    name: "answer",
    description: "Answer the user's health question.",
    parameters: {
      type: "object",
      properties: {
        reply: { type: "string", description: "The answer in Markdown. Use tables when they help." },
      },
      required: ["reply"],
    },
  },
};
```

To get richer typed output, add more properties (e.g. `sources: string[]`, `confidence: number`).
The `parameters` object **is** your contract — whatever you put there is what comes back.

## Step 3 — one call: force the tool, read the typed result

```ts
const res = await fetchWithRetry(OPENROUTER_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
    "Content-Type": "application/json",
    // Optional but recommended by OpenRouter for attribution / rankings:
    "HTTP-Referer": "https://your-app.example.com",
    "X-Title": "Your App",
  },
  body: JSON.stringify({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nContext:\n${context}` },
      ...history,
    ],
    tools: [chatTool],
    tool_choice: { type: "function", function: { name: "answer" } }, // <- forces the tool
  }),
});

const data = await res.json();
const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
if (!toolCall) throw new Error("No tool call returned");
const result = JSON.parse(toolCall.function.arguments) as { reply: string };
return Response.json(result);
```

That is the whole pattern. **One request, one turn, no agent loop.** Swap `DEFAULT_MODEL`
to move between providers — the code is identical.

## Grounding (RAG) is just prompt assembly

RAG adds nothing to the call shape. You run retrieval first, then fold the result into the
system prompt's `context` before sending. See `rag-pgvector-gte-small`.

## Gotchas

- **`tool_choice` must name the function** (`{ type: "function", function: { name: "answer" } }`).
  Just passing `tools` without forcing lets the model reply as free text and skip the tool.
- **Read `tool_calls[0].function.arguments`, not `message.content`.** With a forced tool the
  content is usually empty; the payload lives in the tool call as a JSON **string** you must
  `JSON.parse`.
- **The model must support tool-calling.** Pick an `OPENROUTER_MODEL` that does (most
  OpenAI/Anthropic/Gemini chat models do; some tiny/free models don't).
- **OpenRouter has no `/embeddings` endpoint.** Only chat-completions route through it.
  Do embeddings elsewhere (see `rag-pgvector-gte-small`).
- **Keep the key server-side.** Never expose `OPENROUTER_API_KEY` to the browser; call this
  route from the client, not OpenRouter directly.
- **Validate before trusting.** Forced tool-calling makes malformed output rare, but still
  guard the `tool_calls?.[0]` access and the `JSON.parse`.
