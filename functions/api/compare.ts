import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  MODELSCOPE_API_KEY: string;
}

interface CompareResult {
  words: string[];
  similarities: string[];
  differences: {
    aspect: string;
    explanations: string[];
  }[];
  summary: string;
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
  let words: string[];
  try {
    const body = await request.json<any>();
    words = body?.words;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!Array.isArray(words) || words.length < 2) {
    return json({ error: "至少需要两个词语" }, 400);
  }

  /* ---------------- API Key ---------------- */
  const apiKey = env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return json({ error: "MODELSCOPE_API_KEY not set" }, 500);
  }

  /* ---------------- D1 缓存 ---------------- */
  const hash = await sha256(words.join("||"));
  try {
    const cached = await env.DB.prepare(
      `SELECT result, model FROM compare_cache WHERE text_hash = ?`
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

  /* ---------------- AI 调用 ---------------- */
  const systemPrompt = `
你是一位文言文词汇专家。
请对比以下文言词语在词性、用法、语境和例句上的异同。

请以严格 JSON 格式返回，不要包含任何解释性文字。

字段要求：
- words: 输入的词语数组
- similarities: 相同点的字符串数组
- differences: 差异点数组，每项包含 aspect 和 explanations
- summary: 总体总结
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
          model: "ZhipuAI/GLM-5.1",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: words.join("、") },
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
        `INSERT OR IGNORE INTO compare_cache VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(null, hash, words.join("||"), JSON.stringify(result), "glm-5.1", Date.now())
        .run();
    } catch {}

    return json({
      ...result,
      meta: { model: "glm-5.1", cached: false },
    });
  } catch (err: any) {
    console.error("❌ compare failed:", err);
    return json({ error: "词语对比失败" }, 500);
  }
};

/* ================= 工具 ================= */

function safeParse(raw: string): CompareResult {
  let cleaned = raw.trim().replace(/^```json|^```|```$/g, "");
  try {
    return ensureCompareFields(JSON.parse(cleaned));
  } catch {}
  const m = cleaned.match(/{[\s\S]*}/);
  if (m) return ensureCompareFields(JSON.parse(m[0]));
  throw new Error("AI 返回了非法 JSON");
}

function ensureCompareFields(obj: any): CompareResult {
  return {
    words: Array.isArray(obj.words) ? obj.words : [],
    similarities: Array.isArray(obj.similarities) ? obj.similarities : [],
    differences: Array.isArray(obj.differences) ? obj.differences : [],
    summary: obj.summary ?? "",
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
