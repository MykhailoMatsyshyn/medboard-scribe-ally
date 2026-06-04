import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// OpenRouter config — model is swappable via env var
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Retry on transient failures as required by §3.3
const RETRYABLE_STATUSES = new Set([429, 502, 503, 529]);
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
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

// One tool — its parameters are the typed shape we want back from the model
const chatTool = {
  type: "function" as const,
  function: {
    name: "answer",
    description: "Answer the user's health question.",
    parameters: {
      type: "object",
      properties: {
        reply: {
          type: "string",
          description: "The answer in Markdown. Use tables when they help.",
        },
      },
      required: ["reply"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RAG: full-text search the user's knowledge base for chunks relevant to the question.
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    let context = "";
    if (lastUser?.content) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: matches, error } = await admin.rpc("match_rag_chunks", {
        query_text: String(lastUser.content).slice(0, 1000),
        match_user_id: user.id,
        match_count: 6,
      });
      if (error) console.error("match error", error);
      if (matches && matches.length) {
        context = matches
          .map((m: any, i: number) => `[Source ${i + 1}]\n${m.content}`)
          .join("\n\n---\n\n");
      }
    }

    const systemPrompt = `You are a helpful AI health assistant. Always respond in well-formatted Markdown. Use tables (GitHub-flavored markdown) whenever the data is tabular. Use headings, lists, bold, and code blocks where appropriate.${
      context
        ? `\n\nThe user has uploaded a personal knowledge base. Use the following retrieved excerpts to ground your answer when relevant. If the answer is not in the context, say so and answer from general knowledge.\n\n=== KNOWLEDGE BASE CONTEXT ===\n${context}\n=== END CONTEXT ===`
        : ""
    }`;

    // One OpenRouter call — force the tool, answer arrives as typed JSON in tool_calls
    const res = await fetchWithRetry(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medboard-scribe-ally.vercel.app",
        "X-Title": "Health Companion",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: [chatTool],
        tool_choice: { type: "function", function: { name: "answer" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenRouter error", res.status, text);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "No tool call returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read typed result from tool_calls[0].function.arguments — never free text
    const result = JSON.parse(toolCall.function.arguments) as { reply: string };

    return new Response(JSON.stringify({ reply: result.reply, usedContext: !!context }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
