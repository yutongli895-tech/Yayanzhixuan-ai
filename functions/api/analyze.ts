import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 解析请求体
  const body = await request.json() as { text: string };
  const { text } = body;

  if (!text) {
    return new Response(JSON.stringify({ error: "Text is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 2. 初始化 Gemini (使用 CF 环境变量)
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `请对以下文言文进行深度解析：\n\n"${text}"`,
      config: {
        systemInstruction: `你是一位博学古今的文言文专家。
你的任务是提供文言文的深度解析，包括现代汉语翻译、句法拆解（语法点）、重点词汇剖析以及必要的文化背景。
请务必以 JSON 格式返回结果。`,
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

    const result = JSON.parse(response.text || "{}");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini Error:", error);
    return new Response(JSON.stringify({ error: "AI Analysis Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
