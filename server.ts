import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { MOCK_DICTIONARY } from "./src/constants";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Setup with Key Rotation
  const getAiClient = () => {
    const keys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    return new GoogleGenAI({ apiKey: selectedKey });
  };

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const ai = getAiClient();
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
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze text" });
    }
  });

  app.post("/api/compare", async (req, res) => {
    const { words } = req.body;
    if (!words || !Array.isArray(words) || words.length < 2) {
      return res.status(400).json({ error: "At least two words are required" });
    }

    try {
      const ai = getAiClient();
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

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to compare words" });
    }
  });
  app.get("/api/daily", (req, res) => {
    const keys = Object.keys(MOCK_DICTIONARY);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const entry = (MOCK_DICTIONARY as any)[randomKey];
    
    res.json({
      entry,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(randomKey)}/800/450`,
      quote: "博观而约取，厚积而薄发。"
    });
  });

  app.post("/api/feedback", (req, res) => {
    const { word, feedback, type } = req.body;
    console.log("User Feedback Received:", { word, feedback, type });
    res.json({ success: true });
  });

  // D1 Mock/Proxy (For local dev, in CF this would be env.DB)
  app.get("/api/status", (req, res) => {
    res.json({
      database: "connected",
      count: 160,
      provider: "Cloudflare D1"
    });
  });

  app.get("/api/lookup", (req, res) => {
    const { word } = req.query;
    // 模拟本地 D1 查询逻辑
    const entry = (MOCK_DICTIONARY as any)[word as string];
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      res.json({ success: true, token: "mock-admin-token" });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  app.post("/api/admin/dictionary/add", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== "Bearer mock-admin-token") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const entry = req.body;
    console.log("Mock D1 Insert:", entry);
    // In local dev, we just log it or could update MOCK_DICTIONARY
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
