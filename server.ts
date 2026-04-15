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

  // Gemini AI Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // API Routes
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
