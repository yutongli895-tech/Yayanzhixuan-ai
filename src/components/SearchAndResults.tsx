import React from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DictionaryEntry, AIAnalysisResult } from '../types';

export const SearchBar: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  isAiMode: boolean;
}> = ({ value, onChange, onSearch, isLoading, isAiMode }) => {
  return (
    <div className="w-full max-w-2xl mx-auto relative group">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder={isAiMode ? "输入文言文语句进行深度解析..." : "输入单字或词语..."}
          className="w-full bg-white px-8 py-5 rounded-full shadow-2xl border border-gold/20 focus:outline-none focus:border-cinnabar/50 text-lg font-serif transition-all duration-300 pr-16"
        />
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="absolute right-3 p-3 bg-cinnabar text-paper rounded-full hover:bg-cinnabar-light transition-colors shadow-lg disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
        </button>
      </div>
      <div className="mt-2 text-center">
        <span className="text-ink/30 text-sm font-serif italic">· {value || '之'} ·</span>
      </div>
    </div>
  );
};

export const DictionaryCard: React.FC<{ entry: DictionaryEntry }> = ({ entry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold/10 max-w-xl w-full"
    >
      <div className="bg-cinnabar p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-8xl font-serif text-paper mb-2">{entry.character}</h2>
          <div className="flex items-center gap-4">
            <span className="text-paper/80 font-serif text-2xl">[{entry.pinyin}]</span>
            <span className="bg-paper/20 text-paper text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              {entry.type}
            </span>
          </div>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <BookOpenIcon size={200} />
        </div>
      </div>
      
      <div className="p-10 space-y-8">
        <div>
          <h3 className="text-cinnabar font-serif font-bold text-xl mb-4 border-b border-cinnabar/10 pb-2">词义解析</h3>
          <ul className="space-y-3">
            {entry.definitions.map((def, i) => (
              <li key={i} className="flex gap-3 text-ink/80 leading-relaxed">
                <span className="w-2 h-5 bg-gold/30 rounded-sm mt-1 shrink-0" />
                {def}
              </li>
            ))}
          </ul>
        </div>

        {entry.examples.length > 0 && (
          <div className="bg-paper/50 p-6 rounded-3xl border border-gold/20 relative">
            <div className="absolute top-4 left-4 text-cinnabar/20">
              <QuoteIcon size={32} />
            </div>
            <h4 className="text-cinnabar font-serif font-bold mb-3 ml-8">经典例句</h4>
            <div className="space-y-4 ml-8">
              {entry.examples.map((ex, i) => (
                <div key={i}>
                  <p className="text-lg font-serif italic text-ink/90 mb-1">“{ex.text}”</p>
                  <p className="text-xs text-ink/40">— {ex.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const AIAnalysisCard: React.FC<{ result: AIAnalysisResult }> = ({ result }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl space-y-8"
    >
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gold/10">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="text-cinnabar" size={28} />
          <h2 className="text-2xl font-serif font-bold text-cinnabar">AI 深度解析报告</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <section>
              <h3 className="text-sm uppercase tracking-widest text-ink/40 font-bold mb-4">现代汉语翻译</h3>
              <p className="text-xl font-serif leading-relaxed text-ink/90 bg-paper p-6 rounded-2xl border border-gold/10">
                {result.translation}
              </p>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest text-ink/40 font-bold mb-4">句法拆解</h3>
              <div className="space-y-4">
                {result.syntax.map((s, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-1 bg-cinnabar/20 group-hover:bg-cinnabar transition-colors rounded-full" />
                    <div>
                      <h4 className="font-bold text-cinnabar text-sm mb-1">{s.point}</h4>
                      <p className="text-sm text-ink/70">{s.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-sm uppercase tracking-widest text-ink/40 font-bold mb-4">重点词汇剖析</h3>
              <div className="grid gap-4">
                {result.keyWords.map((kw, i) => (
                  <div key={i} className="bg-paper/50 p-5 rounded-2xl border border-gold/10 hover:border-cinnabar/20 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-serif font-bold text-cinnabar">{kw.word}</span>
                      <span className="text-xs text-ink/40 italic">{kw.meaning}</span>
                    </div>
                    <p className="text-xs text-ink/60 leading-relaxed">{kw.usage}</p>
                  </div>
                ))}
              </div>
            </section>

            {result.culturalContext && (
              <section className="bg-cinnabar/5 p-6 rounded-2xl border border-cinnabar/10">
                <h3 className="text-xs uppercase tracking-widest text-cinnabar/60 font-bold mb-3">文化背景</h3>
                <p className="text-sm text-ink/80 leading-relaxed italic">
                  {result.culturalContext}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper Icons
const BookOpenIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const QuoteIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM14.017 11L14.017 8C14.017 6.89543 14.9124 6 16.017 6H19.017C20.1216 6 21.017 6.89543 21.017 8V11C21.017 12.1046 20.1216 13 19.017 13H16.017C14.9124 13 14.017 12.1046 14.017 11ZM3 21L3 18C3 16.8954 3.89543 16 5 16H8C9.10457 16 10 16.8954 10 18V21C10 22.1046 9.10457 23 8 23H5C3.89543 23 3 22.1046 3 21ZM3 11L3 8C3 6.89543 3.89543 6 5 6H8C9.10457 6 10 6.89543 10 8V11C10 12.1046 9.10457 13 8 13H5C3.89543 13 3 12.1046 3 11Z" />
  </svg>
);
