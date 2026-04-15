import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const body = await request.json() as { words: string[] };
  const { words } = body;

  if (!words || !Array.isArray(words) || words.length < 2) {
    return new Response(JSON.stringify({ error: "At least two words are required" }), { status: 400 });
  }

  try {
    const keys = (env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), { status: 500 });
    }
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    const ai = new GoogleGenAI({ apiKey: selectedKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `请对比以下文言词汇的用法：\n\n"${words.join(" 和 ")}"`,
      config: {
        systemInstruction: `你是一位博学古今的文言文专家。你的任务是对比两个或多个文言词汇的异同，包括词性、用法、语境以及典型例句。请务必以 JSON 格式返回结果。`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            words: { type: Type.ARRAY, items: { type: Type.STRING } },
            similarities: { type: Type.ARRAY, items: { type: Type.STRING } },
            differences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  aspect: { type: Type.STRING },
                  explanations: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["aspect", "explanations"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["words", "similarities", "differences", "summary"]
        }
      }
    });

    return new Response(response.text, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "AI Comparison Failed" }), { status: 500 });
  }
};
