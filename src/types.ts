export interface DictionaryEntry {
  character: string;
  pinyin: string;
  type: string; // e.g., "实词", "虚词"
  definitions: string[];
  examples: {
    text: string;
    source: string;
  }[];
}

export interface AIAnalysisResult {
  translation: string;
  syntax: {
    point: string;
    explanation: string;
  }[];
  keyWords: {
    word: string;
    meaning: string;
    usage: string;
  }[];
  culturalContext?: string;
}
