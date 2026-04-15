import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const body = await request.json() as { text: string };
  const { text } = body;

  if (!text) {
    return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
  }

  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare Pages" }), { status: 500 });
  }

  try {
    const keys = env.GEMINI_API_KEY.split(",").map(k => k.trim()).filter(Boolean);
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    const ai = new GoogleGenAI({ apiKey: selectedKey });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: `请对以下文言文进行深度解析：\n\n"${text}"`,
      config: {
        systemInstruction: `你是一位博学古今的文言文专家。你的任务是提供文言文的深度解析，包括现代汉语翻译、句法拆解（语法点）、重点词汇剖析以及必要的文化背景。请务必以 JSON 格式返回结果。`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            syntax: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["point", "explanation"]
              }
            },
            keyWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  usage: { type: Type.STRING }
                },
                required: ["word", "meaning", "usage"]
              }
            },
            culturalContext: { type: Type.STRING }
          },
          required: ["translation", "syntax", "keyWords"]
        }
      }
    });

    return new Response(response.text, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "AI Analysis Failed" }), { status: 500 });
  }
};
