import { AIAnalysisResult, ComparisonResult, DailyWord } from "../types";

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

export async function compareWords(words: string[]): Promise<ComparisonResult> {
  const response = await fetch("/api/analyze/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ words }),
  });

  if (!response.ok) {
    throw new Error("Failed to compare words");
  }

  return await response.json();
}

export async function getDailyWord(): Promise<DailyWord> {
  const response = await fetch("/api/dictionary/daily");
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
