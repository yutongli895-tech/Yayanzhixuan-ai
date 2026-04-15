import React, { useState } from 'react';
import { Search, Loader2, Sparkles, MessageSquare, ArrowRightLeft, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DictionaryEntry, AIAnalysisResult, ComparisonResult, DailyWord } from '../types';
import { StrokeOrder } from './StrokeOrder';
import { submitFeedback } from '../services/geminiService';

export const SearchBar: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  isAiMode: boolean;
  mode: 'search' | 'compare' | 'long-text';
  onModeChange: (mode: 'search' | 'compare' | 'long-text') => void;
}> = ({ value, onChange, onSearch, isLoading, isAiMode, mode, onModeChange }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex justify-center gap-4 mb-6">
        {[
          { id: 'search', label: '词典查询', icon: Search },
          { id: 'compare', label: '词汇辨析', icon: ArrowRightLeft },
          { id: 'long-text', label: '长文解析', icon: Sparkles },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id as any)}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-serif transition-all ${
              mode === m.id 
                ? 'bg-cinnabar text-paper shadow-lg scale-105' 
                : 'bg-paper text-ink/40 hover:text-cinnabar'
            }`}
          >
            <m.icon size={18} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative group">
        <div className="relative flex items-center">
          {mode === 'long-text' ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="粘贴整段文言文，AI 将为您深度剖析..."
              className="w-full bg-white px-8 py-6 rounded-[2rem] shadow-2xl border border-gold/20 focus:outline-none focus:border-cinnabar/50 text-lg font-serif transition-all duration-300 min-h-[200px] resize-none"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder={
                mode === 'compare' 
                  ? "输入两个词，如：之 其" 
                  : (isAiMode ? "输入文言语句进行深度解析..." : "输入单字或词语...")
              }
              className="w-full bg-white px-8 py-5 rounded-full shadow-2xl border border-gold/20 focus:outline-none focus:border-cinnabar/50 text-lg font-serif transition-all duration-300 pr-16"
            />
          )}
          <button
            onClick={onSearch}
            disabled={isLoading}
            className={`absolute ${mode === 'long-text' ? 'bottom-6 right-6' : 'right-3'} p-3 bg-cinnabar text-paper rounded-full hover:bg-cinnabar-light transition-colors shadow-lg disabled:opacity-50`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const THEMES: Record<string, { bg: string, text: string, accent: string }> = {
  '兵法': { bg: 'bg-[#4A0E0E]', text: 'text-paper', accent: 'border-cinnabar' },
  '中医': { bg: 'bg-[#2D4A22]', text: 'text-paper', accent: 'border-green-800' },
  '职官': { bg: 'bg-[#1A2A4A]', text: 'text-paper', accent: 'border-blue-900' },
  '法律': { bg: 'bg-[#2A2A2A]', text: 'text-paper', accent: 'border-gray-900' },
  'default': { bg: 'bg-cinnabar', text: 'text-paper', accent: 'border-cinnabar' }
};

export const DictionaryCard: React.FC<{ entry: DictionaryEntry }> = ({ entry }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const theme = THEMES[entry.type] || THEMES.default;

  const handleFeedback = async () => {
    await submitFeedback(entry.character, feedback, 'correction');
    setIsSubmitted(true);
    setTimeout(() => {
      setShowFeedback(false);
      setIsSubmitted(false);
      setFeedback('');
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold/10 max-w-4xl w-full flex flex-col md:flex-row"
    >
      <div className={`${theme.bg} p-10 relative overflow-hidden flex flex-col items-center justify-center md:w-1/3`}>
        <div className="relative z-10 text-center">
          <h2 className={`text-9xl font-serif ${theme.text} mb-4`}>{entry.character}</h2>
          <div className="flex flex-col items-center gap-2">
            <span className={`${theme.text}/80 font-serif text-2xl`}>[{entry.pinyin}]</span>
            <span className="bg-paper/20 text-paper text-xs px-4 py-1 rounded-full backdrop-blur-sm">
              {entry.type}
            </span>
          </div>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <BookOpenIcon size={200} />
        </div>
      </div>
      
      <div className="p-10 flex-1 space-y-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
          <div className="ml-8 hidden sm:block">
            <StrokeOrder character={entry.character} size={120} />
          </div>
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

        <div className="flex justify-end pt-4">
          <button 
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 text-ink/30 hover:text-cinnabar transition-colors text-sm font-serif"
          >
            <MessageSquare size={16} />
            纠错/补充
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-paper w-full max-w-md p-8 rounded-[2rem] shadow-2xl space-y-6">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-green-800">提交成功</h3>
                  <p className="text-ink/60">感谢您的反馈，我们将尽快核实！</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-serif font-bold text-cinnabar">提供反馈</h3>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="请输入您的纠错建议或补充例句..."
                    className="w-full h-32 bg-white border border-gold/20 rounded-2xl p-4 focus:outline-none focus:border-cinnabar/50 font-serif"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowFeedback(false)}
                      className="flex-1 py-3 border border-ink/10 rounded-full font-serif hover:bg-ink/5 transition-colors"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleFeedback}
                      className="flex-1 py-3 bg-cinnabar text-paper rounded-full font-serif shadow-lg hover:bg-cinnabar-light transition-colors"
                    >
                      提交
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const ComparisonCard: React.FC<{ result: ComparisonResult }> = ({ result }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl border border-gold/10 overflow-hidden"
    >
      <div className="bg-ink p-10 text-paper">
        <div className="flex items-center gap-4 mb-4">
          <ArrowRightLeft className="text-gold" size={32} />
          <h2 className="text-3xl font-serif font-bold">词汇深度辨析</h2>
        </div>
        <div className="flex gap-4">
          {result.words.map((w, i) => (
            <span key={i} className="text-5xl font-serif text-gold">{w}</span>
          ))}
        </div>
      </div>

      <div className="p-10 space-y-10">
        <section>
          <h3 className="text-cinnabar font-serif font-bold text-xl mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-cinnabar rounded-full" />
            共通之处
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {result.similarities.map((s, i) => (
              <div key={i} className="bg-paper p-4 rounded-2xl border border-gold/10 text-ink/80">
                {s}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-cinnabar font-serif font-bold text-xl mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-cinnabar rounded-full" />
            差异对比
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="py-4 px-6 text-left text-ink/40 font-serif font-normal">维度</th>
                  {result.words.map((w, i) => (
                    <th key={i} className="py-4 px-6 text-left text-cinnabar font-serif text-xl">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.differences.map((d, i) => (
                  <tr key={i} className="border-b border-gold/10 hover:bg-paper/30 transition-colors">
                    <td className="py-6 px-6 font-bold text-ink/60">{d.aspect}</td>
                    {d.explanations.map((exp, j) => (
                      <td key={j} className="py-6 px-6 text-ink/80 leading-relaxed">{exp}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-paper p-8 rounded-[2rem] border border-gold/20">
          <h3 className="text-sm uppercase tracking-widest text-ink/40 font-bold mb-3">辨析总结</h3>
          <p className="text-lg font-serif italic text-ink/90 leading-relaxed">
            {result.summary}
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export const DailyWordCard: React.FC<{ daily: DailyWord }> = ({ daily }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-[2.5rem] shadow-xl border border-gold/10 overflow-hidden max-w-sm w-full group"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={daily.imageUrl} 
          alt="Daily Word" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent flex items-end p-6">
          <div className="flex items-center gap-2 text-paper/60 text-xs uppercase tracking-widest">
            <ImageIcon size={14} />
            每日一雅
          </div>
        </div>
      </div>
      <div className="p-8 space-y-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-5xl font-serif text-cinnabar">{daily.entry.character}</h3>
          <span className="text-ink/40 font-serif">[{daily.entry.pinyin}]</span>
        </div>
        <p className="text-ink/70 line-clamp-2 text-sm leading-relaxed">
          {daily.entry.definitions[0]}
        </p>
        <div className="pt-4 border-t border-gold/10">
          <p className="text-xs text-ink/30 italic font-serif">“{daily.quote}”</p>
        </div>
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
