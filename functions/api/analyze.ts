import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  MODELSCOPE_API_KEY: string; // ✅ 改用魔搭
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

  /* ---------------- API Key ---------------- */
  const apiKey = env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return json({ error: "MODELSCOPE_API_KEY not set" }, 500);
  }

  /* ---------------- D1 缓存 ---------------- */
  const hash = await sha256(text);

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
  } catch (e) {
    console.warn("⚠️ D1 cache read failed, continue without cache");
  }

  /* ---------------- AI 调用 ---------------- */
  const systemPrompt = `
你是一位文言文专家。
请对以下文言文进行深度解析，并以严格 JSON 格式返回，不要包含任何解释性文字。

字段要求：
- translation: 现代汉语翻译
- syntax: [{ point: string, explanation: string }]
- keyWords: [{ word: string, meaning: string, usage: string }]
- culturalContext: 文化背景说明
`;

  try {
    const res = await fetch(
      "https://api-inference.modelscope.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "ZhipuAI/GLM-5.1", // ✅ 魔搭可用模型
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ModelScope API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const result = safeParse(raw);

    /* ---------------- 写缓存 ---------------- */
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO analysis_cache VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(null, hash, text, JSON.stringify(result), "glm-5.1", Date.now())
        .run();
    } catch {}

    return json({
      ...result,
      meta: { model: "glm-5.1", cached: false },
    });
  } catch (err: any) {
    console.error("❌ ModelScope failed:", err);
    return json({ error: "AI 解析失败，请稍后重试" }, 500);
  }
};

/* ================= 工具函数 ================= */

function safeParse(raw: string): Omit<AnalysisResult, "meta"> {
  let cleaned = raw.trim().replace(/^```json|^```|```$/g, "");
  try {
    return ensureFields(JSON.parse(cleaned));
  } catch {}
  const m = cleaned.match(/{[\s\S]*}/);
  if (m) return ensureFields(JSON.parse(m[0]));
  throw new Error("AI 返回了非法 JSON");
}

function ensureFields(obj: any): Omit<AnalysisResult, "meta"> {
  return {
    translation: obj.translation ?? "",
    syntax: Array.isArray(obj.syntax) ? obj.syntax : [],
    keyWords: Array.isArray(obj.keyWords) ? obj.keyWords : [],
    culturalContext: obj.culturalContext ?? "",
  };
}

async function sha256(str: string): Promise<string> {
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
