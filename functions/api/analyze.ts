interface Env {
  NVIDIA_API_KEY: string;
  DB: D1Database;
}

const MODELS = [
  "qwen2.5-72b-instruct",
  "yi-large",
  "glm-4-9b-chat",
];

const SYSTEM_PROMPT = `
你是一位文言文专家。
请对以下文言文进行深度解析，并以严格 JSON 格式返回，不要输出任何解释、注释或 Markdown。

字段要求：
- translation: 现代汉语翻译
- syntax: [{ point, explanation }]
- keyWords: [{ word, meaning, usage }]
- culturalContext: 文化背景说明
`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  /* ---------------- CORS ---------------- */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  /* ---------------- 参数校验 ---------------- */
  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  if (!text || text.length > 2000) {
    return json({ error: "Text is required or too long" }, 400);
  }

  /* ---------------- API Key ---------------- */
  const keys = (env.NVIDIA_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return json({ error: "NVIDIA_API_KEY not configured" }, 500);
  }

  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  /* ---------------- D1 缓存 ---------------- */
  const hash = await sha256(text);

  const cached = await env.DB.prepare(
    `SELECT result FROM analysis_cache WHERE text_hash = ?`
  )
    .bind(hash)
    .first<{ result: string }>();

  if (cached) {
    return json(JSON.parse(cached.result));
  }

  /* ---------------- 多模型降级 ---------------- */
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      const result = await callModel(model, text, apiKey);
      await saveCache(env.DB, hash, text, result, model);
      return json(result);
    } catch (err) {
      lastError = err;
    }
  }

  return json(
    { error: (lastError as Error)?.message || "All models failed" },
    500
  );
};

/* ================== 工具函数 ================== */

async function callModel(
  model: string,
  text: string,
  apiKey: string
) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  return safeParseJSON(raw);
}

/* ---------- JSON 容错 ---------- */
function safeParseJSON(raw: string): any {
  let cleaned = raw.trim().replace(/^```json|^```|```$/g, "");

  try {
    return ensureFields(JSON.parse(cleaned));
  } catch {}

  const match = cleaned.match(/{[\s\S]*}/);
  if (match) {
    try {
      return ensureFields(JSON.parse(match[0]));
    } catch {}
  }

  throw new Error("AI returned invalid JSON");
}

/* ---------- 字段兜底 ---------- */
function ensureFields(obj: any) {
  return {
    translation: obj.translation ?? "",
    syntax: Array.isArray(obj.syntax) ? obj.syntax : [],
    keyWords: Array.isArray(obj.keyWords) ? obj.keyWords : [],
    culturalContext: obj.culturalContext ?? "",
  };
}

/* ---------- D1 缓存 ---------- */
async function saveCache(
  db: D1Database,
  hash: string,
  text: string,
  result: any,
  model: string
) {
  await db.prepare(
    `INSERT OR IGNORE INTO analysis_cache
     (text_hash, text, result, model, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(hash, text, JSON.stringify(result), model, Date.now())
    .run();
}

/* ---------- SHA-256 ---------- */
async function sha256(str: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- JSON 响应 ---------- */
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
