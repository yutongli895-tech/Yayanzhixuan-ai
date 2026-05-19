import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  NVIDIA_API_KEY: string;
}

interface AnalysisResult {
  translation: string;
  syntax: { point: string; explanation: string }[];
  keyWords: { word: string; meaning: string; usage: string }[];
  culturalContext: string;
  meta: {
    model: string;
    cached: boolean;
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  let text: string;
  try {
    const body = await request.json<any>();
    text = body?.text?.trim();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!text) {
    return json({ error: "text is required" }, 400);
  }

  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) {
    return json({ error: "NVIDIA_API_KEY not set" }, 500);
  }

  const hash = await sha256(text);

  /* -------- D1 缓存 -------- */
  try {
    const cached = await env.DB.prepare(
      `SELECT result, model FROM analysis_cache WHERE text_hash = ?`
    )
      .bind(hash)
      .first<{ result: string; model: string }>();

    if (cached && cached.result) {
      return json({
        ...JSON.parse(cached.result),
        meta: { model: cached.model, cached: true },
      });
    }
  } catch {}

  /* -------- 多模型降级 -------- */
  const models = [
    "qwen2.5-72b-instruct",
    "yi-large",
    "glm-4-9b-chat",
  ];

  let result: Omit<AnalysisResult, "meta"> | null = null;
  let usedModel = "";

  for (const model of models) {
    try {
      result = await callNvidia(model, text, apiKey);
      usedModel = model;
      break;
    } catch (err) {
      console.error(`❌ ${model} failed`, err);
    }
  }

  if (!result) {
    return json({ error: "All models failed" }, 500);
  }

  /* -------- 写缓存 -------- */
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO analysis_cache VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(null, hash, text, JSON.stringify(result), usedModel, Date.now())
      .run();
  } catch {}

  return json({
    ...result,
    meta: { model: usedModel, cached: false },
  });
};

/* ================= AI ================= */

async function callNvidia(
  model: string,
  text: string,
  apiKey: string
) {
  const res = await fetch(
    "https://api.nvidia.com/v1/chat/completions", // ✅ 正确 Endpoint
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NVIDIA API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  return safeParse(raw);
}

/* ================= 工具 ================= */

function safeParse(raw: string) {
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
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
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
