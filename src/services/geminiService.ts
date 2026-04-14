import { AIAnalysisResult } from "../types";

export async function analyzeClassicalChinese(text: string): Promise<AIAnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze classical Chinese");
  }

  return await response.json();
}
