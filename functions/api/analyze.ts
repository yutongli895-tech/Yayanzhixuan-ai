// functions/api/analyze.ts
import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  NVIDIA_API_KEY: string;
}

// 定义返回给前端的 JSON 结构
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
  // ===== 1. CORS 预检 =====
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // ===== 2. 解析请求体 =====
  let text: string;
  try {
    const body = await request.json<any>();
    text = body?.text?.trim();
  } catch {
    return json({ error: "请求体必须是 JSON 格式" }, 400);
  }

  if (!text) {
    return json({ error: "text 参数不能为空" }, 400);
  }

  if (text.length > 2000) {
    return json({ error: "文本长度不能超过 2000 字" }, 400);
  }

  // ===== 3. 检查环境变量 =====
  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error("❌ 环境变量 NVIDIA_API_KEY 未配置");
    return json({ error: "服务器配置错误" }, 500);
  }

  // ===== 4. D1 缓存检查 =====
  const hash = await sha256(text);
  
  try {
    // 注意：D1 的 first() 返回可能是 null，也可能是 object
    const cached = await env.DB.prepare(
      `SELECT result, model FROM analysis_cache WHERE text_hash = ?`
    )
      .bind(hash)
      .first<{ result: string; model: string }>();

    if (cached && cached.result) {
      console.log("⚡ 命中缓存");
      const result = JSON.parse(cached.result) as Omit<AnalysisResult, "meta">;
      return json({
        ...result,
        meta: { model: cached.model, cached: true },
      });
    }
  } catch (dbError) {
    // 如果表不存在或查询出错，打印日志但不中断流程，继续走 AI
    console.error("⚠️ D1 查询失败，跳过缓存:", dbError);
  }

  // ===== 5. 多模型降级调用 =====
  const models = [
    "qwen/qwen2.5-72b-instruct",
    "yi/yi-large",
    "01-ai/yi-large", // 备用
  ];

  let result: Omit<AnalysisResult, "meta"> | null = null;
  let usedModel = "unknown";

  for (const model of models) {
    try {
      console.log(`🤖 尝试模型: ${model}`);
      result = await callNvidia(model, text, apiKey);
      usedModel = model;
      break; // 成功则跳出循环
    } catch (err) {
      console.error(`❌ 模型 ${model} 失败:`, err);
      continue; // 失败则尝试下一个
    }
  }

  if (!result) {
    return json({ error: "所有 AI 模型均调用失败，请稍后重试" }, 500);
  }

  // ===== 6. 写入 D1 缓存 =====
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO analysis_cache (text_hash, text, result, model, created_at) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(hash, text, JSON.stringify(result), usedModel, Date.now())
      .run();
    console.log("💾 已写入缓存");
  } catch (dbError) {
    console.error("⚠️ 写入缓存失败:", dbError);
    // 缓存失败不影响返回结果
  }

  // ===== 7. 返回最终结果 =====
  return json({
    ...result,
    meta: { model: usedModel, cached: false },
  });
};

// ==================== AI 调用函数 ====================
async function callNvidia(model: string, text: string, apiKey: string): Promise<Omit<AnalysisResult, "meta">> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20秒超时

  const systemPrompt = `
你是一位文言文专家。请对以下文言文进行深度解析，并以严格 JSON 格式返回，不要包含任何解释性文字。

字段要求：
- translation: 现代汉语翻译
- syntax: [{ point: string, explanation: string }]
- keyWords: [{ word: string, meaning: string, usage: string }]
- culturalContext: 文化背景说明
`;

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";

  // JSON 容错清洗
  let cleaned = raw.trim().replace(/^```json|^```|```$/g, "");
  let parsed: any;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/{[\s\S]*}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("AI 返回了无效的 JSON 格式");
    }
  }

  // 字段兜底
  return {
    translation: parsed.translation ?? "",
    syntax: Array.isArray(parsed.syntax) ? parsed.syntax : [],
    keyWords: Array.isArray(parsed.keyWords) ? parsed.keyWords : [],
    culturalContext: parsed.culturalContext ?? "",
  };
}

// ==================== 工具函数 ====================
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
