import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar, StatusCard } from './components/UI';
import { SearchBar, DictionaryCard, AIAnalysisCard } from './components/SearchAndResults';
import { MOCK_DICTIONARY } from './constants';
import { analyzeClassicalChinese } from './services/geminiService';
import { DictionaryEntry, AIAnalysisResult } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryEntry | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setDictionaryResult(null);
    setAiResult(null);

    try {
      if (isAiMode) {
        const result = await analyzeClassicalChinese(query);
        setAiResult(result);
      } else {
        // 1. Try D1 lookup via backend
        const response = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const entry = await response.json();
          setDictionaryResult(entry);
        } else {
          // 2. Fallback to AI Analysis if not in DB
          const fallbackResult = await analyzeClassicalChinese(query);
          setAiResult(fallbackResult);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
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
              {isAiMode ? '文言深度解析' : '博学古今，通晓文言'}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-ink/40 font-serif text-lg tracking-[0.2em]"
            >
              {isAiMode ? 'AI 深度解析，让每一粒方块字重焕生机' : '· 读书百遍，其义自见 ·'}
            </motion.p>
          </div>

          {/* Search Section */}
          <div className="w-full flex flex-col md:flex-row gap-8 items-start justify-center">
            <div className="flex-1 w-full max-w-2xl">
              <SearchBar 
                value={query} 
                onChange={setQuery} 
                onSearch={handleSearch} 
                isLoading={isLoading}
                isAiMode={isAiMode}
              />
            </div>
            
            <div className="hidden lg:block">
              <StatusCard />
            </div>
          </div>

          {/* Results Section */}
          <div className="w-full flex justify-center pb-20">
            <AnimatePresence mode="wait">
              {isLoading ? (
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

      <footer className="py-12 border-t border-gold/10 text-center space-y-2">
        <p className="font-serif text-ink/40 tracking-widest text-sm">雅言智选 · 文脉传承</p>
        <p className="text-[10px] text-ink/20 uppercase tracking-tighter">
          © 2026 Digitally Preserved & Cloudflare Native
        </p>
      </footer>
    </div>
  );
}
