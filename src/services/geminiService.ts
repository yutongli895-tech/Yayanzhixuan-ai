import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, ComparisonResult, DailyWord } from "../types";

// Initialize Gemini on the frontend
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeClassicalChinese(text: string): Promise<AIAnalysisResult> {
  try {
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function compareWords(words: string[]): Promise<ComparisonResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `请对比以下文言词汇的用法：\n\n"${words.join(" 和 ")}"`,
      config: {
        systemInstruction: `你是一位博学古今的文言文专家。
你的任务是对比两个或多个文言词汇的异同，包括词性、用法、语境以及典型例句。
请务必以 JSON 格式返回结果。`,
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Comparison Error:", error);
    throw error;
  }
}

export async function getDailyWord(): Promise<DailyWord> {
  const response = await fetch("/api/daily");
  if (!response.ok) {
    throw new Error("Failed to fetch daily word");
  }
  return await response.json();
}

export async function submitFeedback(word: string, feedback: string, type: string) {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ word, feedback, type }),
  });
  return response.ok;
}
