import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar, StatusCard } from './components/UI';
import {
  SearchBar,
  DictionaryCard,
  AIAnalysisCard,
  ComparisonCard,
  DailyWordCard,
} from './components/SearchAndResults';
import { AdminPanel } from './components/AdminPanel';
import {
  analyzeClassicalChinese,
  compareWords,
  getDailyWord,
  submitFeedback,
} from './services/nvidiaService';
import type {
  DictionaryEntry,
  AIAnalysisResult,
  ComparisonResult,
  DailyWord,
} from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'compare' | 'long-text'>('search');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dictionaryResult, setDictionaryResult] =
    useState<DictionaryEntry | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);

  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    getDailyWord()
      .then(setDailyWord)
      .catch(console.error);
  }, []);

  const handleFooterClick = (e: any) => {
    if (e.detail === 2) setShowAdmin(true);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setDictionaryResult(null);
    setAiResult(null);
    setComparisonResult(null);

    try {
      if (mode === 'compare') {
        const words = query.split(/[\s,，]+/).filter(Boolean);
        if (words.length >= 2) {
          const result = await compareWords(words);
          setComparisonResult(result);
        } else {
          setError('请输入至少两个词语进行辨析（如：之 其）');
        }
      } else if (mode === 'long-text' || isAiMode) {
        const result = await analyzeClassicalChinese(query);
        setAiResult(result);
      } else {
        const res = await fetch(
          `/api/lookup?word=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          setDictionaryResult(await res.json());
        } else {
          const result = await analyzeClassicalChinese(query);
          setAiResult(result);
        }
      }
    } catch (err: any) {
      setError(err.message || '研读古籍时遇到了些许阻碍，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAiMode={isAiMode} onToggleMode={() => setIsAiMode(!isAiMode)} />

      <main className="flex-1 container mx-auto px-4 sm:px-8 py-8 sm:py-12 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-20 right-10 opacity-5 calligraphy text-[10rem] sm:text-[20rem] select-none">
            文言
          </div>
          <div className="absolute bottom-20 left-10 opacity-5 calligraphy text-[8rem] sm:text-[15rem] select-none">
            智慧
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 sm:gap-16">
          {/* Hero */}
          <div className="text-center space-y-4 sm:space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold tracking-tight text-ink"
            >
              {mode === 'compare'
                ? '词汇深度辨析'
                : mode === 'long-text'
                ? '长文一键解析'
                : isAiMode
                ? '文言深度解析'
                : '博学古今，通晓文言'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-ink/40 font-serif text-sm sm:text-lg tracking-[0.1em] sm:tracking-[0.2em]"
            >
              {mode === 'compare'
                ? '· 析微察异，明辨古今 ·'
                : mode === 'long-text'
                ? '· 剥茧抽丝，洞见微言 ·'
                : isAiMode
                ? 'AI 深度解析，让每一粒方块字重焕生机'
                : '· 读书百遍，其义自见 ·'}
            </motion.p>
          </div>

          {/* Search */}
          <div className="w-full flex flex-col xl:flex-row gap-8 sm:gap-12 items-start justify-center">
            <div className="flex-1 w-full max-w-3xl">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                isLoading={isLoading}
                isAiMode={isAiMode}
                mode={mode}
                onModeChange={setMode}
              />
            </div>

            <div className="w-full xl:w-80 shrink-0 flex flex-col sm:flex-row xl:flex-col gap-6 sm:gap-8">
              <StatusCard />
              {dailyWord && <DailyWordCard daily={dailyWord} />}
            </div>
          </div>

          {/* Model / Cache Hint */}
          {(aiResult?.meta || comparisonResult?.meta || dailyWord?.meta) && (
            <div className="text-xs text-ink/50 font-mono">
              {aiResult?.meta &&
                `模型：${aiResult.meta.model} · ${
                  aiResult.meta.cached ? '缓存命中' : '实时解析'
                }`}
              {comparisonResult?.meta &&
                `模型：${comparisonResult.meta.model} · ${
                  comparisonResult.meta.cached ? '缓存命中' : '实时解析'
                }`}
              {dailyWord?.meta &&
                `模型：${dailyWord.meta.model} · ${
                  dailyWord.meta.cached ? '缓存命中' : '实时解析'
                }`}
            </div>
          )}

          {/* Results */}
          <div className="w-full flex justify-center pb-20">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-20 p-6 bg-cinnabar/5 border border-cinnabar/20 rounded-3xl text-cinnabar font-serif text-center max-w-md"
                >
                  {error}
                </motion.div>
              ) : isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 mt-20"
                >
                  <div className="w-16 h-16 border-4 border-cinnabar/20 border-t-cinnabar rounded-full animate-spin" />
                  <p className="font-serif text-cinnabar animate-pulse">
                    正在研读古籍，请稍候…
                  </p>
                </motion.div>
              ) : dictionaryResult ? (
                <DictionaryCard key="dict" entry={dictionaryResult} />
              ) : aiResult ? (
                <AIAnalysisCard key="ai" result={aiResult} />
              ) : comparisonResult ? (
                <ComparisonCard key="compare" result={comparisonResult} />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-20 text-center opacity-20"
                >
                  <div className="w-48 h-48 mx-auto border-2 border-dashed border-ink rounded-[3rem] flex items-center justify-center">
                    <p className="font-serif italic">“读书百遍，其义自见。”</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer
        onClick={handleFooterClick}
        className="py-12 border-t border-gold/10 text-center space-y-2 cursor-default select-none"
      >
        <p className="font-serif text-ink/40 tracking-widest text-sm">
          雅言智选 · 文脉传承
        </p>
        <p className="text-[10px] text-ink/20 uppercase tracking-tighter">
          © 2026 Digitally Preserved & Cloudflare Native
        </p>
      </footer>

      <AnimatePresence>
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>
    </div>
  );
}
