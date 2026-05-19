interface Env {
  NVIDIA_API_KEY: string;
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  /* CORS */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  /* 参数 */
  let text: string;
  try {
    const body = await request.json<any>();
    text = body?.text;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!text || text.length > 2000) {
    return json({ error: "Text is required or too long" }, 400);
  }

  /* API Key */
  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) {
    return json({ error: "NVIDIA_API_KEY not set" }, 500);
  }

  /* D1 缓存 */
  const hash = await sha256(text);
  const cached = await env.DB.prepare(
    "SELECT result FROM analysis_cache WHERE text_hash = ?"
  )
    .bind(hash)
    .first<{ result: string }>();

  if (cached) {
    return json({
      ...JSON.parse(cached.result),
      meta: { model: "cache", cached: true },
    });
  }

  /* AI */
  try {
    const result = await callNvidia(text, apiKey);

    await env.DB.prepare(
      "INSERT OR IGNORE INTO analysis_cache VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(null, hash, text, JSON.stringify(result), "qwen2.5", Date.now())
      .run();

    return json({ ...result, meta: { model: "qwen2.5", cached: false } });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

/* ================= AI ================= */

async function callNvidia(text: string, apiKey: string) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5-72b-instruct",
      messages: [
        {
          role: "system",
          content: `
你是一位文言文专家。
请对以下文言文进行深度解析，并以严格 JSON 格式返回，不要包含任何解释性文字。

字段要求：
- translation: 现代汉语翻译
- syntax: [{ point, explanation }]
- keyWords: [{ word, meaning, usage }]
- culturalContext: 文化背景说明
`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NVIDIA ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  return safeParseJSON(raw);
}

/* ================= 工具 ================= */

function safeParseJSON(raw: string): any {
  let cleaned = raw.trim().replace(/^```json|^```|```$/g, "");
  try {
    return ensureFields(JSON.parse(cleaned));
  } catch {}
  const m = cleaned.match(/{[\s\S]*}/);
  if (m) return ensureFields(JSON.parse(m[0]));
  throw new Error("AI returned invalid JSON");
}

function ensureFields(obj: any) {
  return {
    translation: obj.translation ?? "",
    syntax: Array.isArray(obj.syntax) ? obj.syntax : [],
    keyWords: Array.isArray(obj.keyWords) ? obj.keyWords : [],
    culturalContext: obj.culturalContext ?? "",
  };
}

async function sha256(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
