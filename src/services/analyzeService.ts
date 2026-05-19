export interface SyntaxPoint {
  point: string;
  explanation: string;
}

export interface Keyword {
  word: string;
  meaning: string;
  usage: string;
}

export interface AnalysisResult {
  translation: string;
  syntax: SyntaxPoint[];
  keyWords: Keyword[];
  culturalContext: string;
  meta?: {
    model: string;
    cached: boolean;
  };
}

export async function analyzeText(
  text: string
): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "解析失败");
  }

  return res.json();
}
