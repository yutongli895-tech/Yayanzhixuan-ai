// services/nvidiaService.ts
import { AnalysisResult } from '../types';

const MODELS = [
  'qwen2.5-72b-instruct',
  'yi-large',
  'glm-4-9b-chat'
];

const SYSTEM_PROMPT = `你是一位文言文专家。请对以下文言文进行深度解析，并以严格 JSON 格式返回，不要包含任何解释性文字。

字段要求：
- translation: 现代汉语翻译
- syntax: [{ point, explanation }]
- keyWords: [{ word, meaning, usage }]
- culturalContext: 文化背景说明`;

export class NvidiaService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(text: string): Promise<AnalysisResult> {
    // 多模型降级逻辑
    let lastError: Error | null = null;
    
    for (const model of MODELS) {
      try {
        const result = await this.callModel(model, text);
        return result;
      } catch (err) {
        lastError = err as Error;
        console.warn(`模型 ${model} 失败，尝试下一个:`, err);
        continue;
      }
    }
    
    throw lastError || new Error('所有模型均解析失败');
  }

  private async callModel(model: string, text: string): Promise<AnalysisResult> {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    return this.parseJSON(raw);
  }

  private parseJSON(raw: string): AnalysisResult {
    let cleaned = raw.trim();
    // 去掉 ```json / ```
    cleaned = cleaned.replace(/^```json|```$/g, "");

    // 尝试直接解析
    try {
      return this.ensureFields(JSON.parse(cleaned));
    } catch {}

    // 正则提取第一个 JSON 对象
    const match = cleaned.match(/{[\s\S]*}/);
    if (match) {
      try {
        return this.ensureFields(JSON.parse(match[0]));
      } catch {}
    }

    throw new Error("JSON parse failed");
  }

  private ensureFields(obj: any): AnalysisResult {
    return {
      translation: obj.translation ?? "",
      syntax: Array.isArray(obj.syntax) ? obj.syntax : [],
      keyWords: Array.isArray(obj.keyWords) ? obj.keyWords : [],
      culturalContext: obj.culturalContext ?? "",
    };
  }
}
