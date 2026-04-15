import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar, StatusCard } from './components/UI';
import { SearchBar, DictionaryCard, AIAnalysisCard, ComparisonCard, DailyWordCard } from './components/SearchAndResults';
import { AdminPanel } from './components/AdminPanel';
import { analyzeClassicalChinese, compareWords, getDailyWord } from './services/geminiService';
import { DictionaryEntry, AIAnalysisResult, ComparisonResult, DailyWord } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'compare' | 'long-text'>('search');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryEntry | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const daily = await getDailyWord();
        setDailyWord(daily);
      } catch (err) {
        console.error('Failed to fetch daily word:', err);
      }
    };
    fetchDaily();
  }, []);

  // Secret shortcut to open admin: Double click footer
  const handleFooterClick = (e: any) => {
    if (e.detail === 2) {
      setShowAdmin(true);
    }
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
          setError('请输入至少两个词语进行辨析（如：之 其），用空格或逗号分隔。');
          setIsLoading(false);
          return;
        }
      } else if (mode === 'long-text' || isAiMode) {
        const result = await analyzeClassicalChinese(query);
        setAiResult(result);
      } else {
        // 1. Try D1 lookup via backend
        const response = await fetch(`/api/lookup?word=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const entry = await response.json();
          setDictionaryResult(entry);
        } else {
          // 2. Fallback to AI Analysis if not in DB
          const fallbackResult = await analyzeClassicalChinese(query);
          setAiResult(fallbackResult);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('研读古籍时遇到了些许阻碍，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAiMode={isAiMode} onToggleMode={() => setIsAiMode(!isAiMode)} />
      
      <main className="flex-1 container mx-auto px-8 py-12 relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-20 right-10 opacity-5 calligraphy text-[20rem] select-none">
            文言
          </div>
          <div className="absolute bottom-20 left-10 opacity-5 calligraphy text-[15rem] select-none">
            智慧
          </div>
        </div>

        <div className="flex flex-col items-center gap-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-ink"
            >
              {mode === 'compare' ? '词汇深度辨析' : mode === 'long-text' ? '长文一键解析' : (isAiMode ? '文言深度解析' : '博学古今，通晓文言')}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-ink/40 font-serif text-lg tracking-[0.2em]"
            >
              {mode === 'compare' ? '· 析微察异，明辨古今 ·' : mode === 'long-text' ? '· 剥茧抽丝，洞见微言 ·' : (isAiMode ? 'AI 深度解析，让每一粒方块字重焕生机' : '· 读书百遍，其义自见 ·')}
            </motion.p>
          </div>

          {/* Search Section */}
          <div className="w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
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
            
            <div className="hidden xl:block w-80 shrink-0 space-y-8">
              <StatusCard />
              {dailyWord && <DailyWordCard daily={dailyWord} />}
            </div>
          </div>

          {/* Results Section */}
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
                  <p className="font-serif text-cinnabar animate-pulse">正在研读古籍，请稍候...</p>
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
        <p className="font-serif text-ink/40 tracking-widest text-sm">雅言智选 · 文脉传承</p>
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
