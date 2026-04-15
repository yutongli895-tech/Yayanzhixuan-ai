export interface DictionaryEntry {
  character: string;
  pinyin: string;
  type: string; // e.g., "实词", "虚词", "兵法", "中医"
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

export interface ComparisonResult {
  words: string[];
  similarities: string[];
  differences: {
    aspect: string;
    explanations: string[];
  }[];
  summary: string;
}

export interface DailyWord {
  entry: DictionaryEntry;
  imageUrl: string;
  quote: string;
}
