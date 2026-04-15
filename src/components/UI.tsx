import React from 'react';
import { BookOpen, Database, Sparkles } from 'lucide-react';

export const Navbar: React.FC<{ isAiMode: boolean; onToggleMode: () => void }> = ({ isAiMode, onToggleMode }) => {
  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 bg-paper/80 backdrop-blur-md sticky top-0 z-50 border-b border-gold/20">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cinnabar flex items-center justify-center rounded-lg shadow-lg">
          <span className="text-paper font-serif text-xl sm:text-2xl font-bold">雅</span>
        </div>
        <h1 className="text-lg sm:text-xl font-serif font-bold tracking-widest text-cinnabar">雅言智选</h1>
      </div>

      <button
        onClick={onToggleMode}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border ${
          isAiMode 
            ? 'bg-cinnabar text-paper border-cinnabar shadow-lg' 
            : 'bg-paper text-cinnabar border-cinnabar/30 hover:border-cinnabar'
        }`}
      >
        {isAiMode ? <Sparkles size={18} /> : <BookOpen size={18} />}
        <span className="text-sm font-medium">{isAiMode ? 'AI 深度模式' : '基础检索模式'}</span>
      </button>
    </nav>
  );
};

export const StatusCard: React.FC = () => {
  const [status, setStatus] = React.useState({ database: 'connecting', count: 0 });

  React.useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus({ database: 'error', count: 0 }));
  }, []);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xl border border-gold/10 w-full sm:w-64 animate-in fade-in slide-in-from-right duration-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cinnabar/10 rounded-xl">
          <Database className="text-cinnabar" size={20} />
        </div>
        <h3 className="text-cinnabar font-serif font-bold text-sm leading-tight">
          CLOUDFLARE D1<br />状态
        </h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-ink/50">数据库</span>
          <span className={`text-xs font-bold ${status.database === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
            {status.database === 'connected' ? '已连接' : status.database === 'connecting' ? '连接中...' : '连接失败'}
          </span>
        </div>
        <div className="h-px bg-gold/20 w-full" />
        <div className="flex justify-between items-center">
          <span className="text-xs text-ink/50">词条数</span>
          <span className="text-xs font-bold text-cinnabar bg-cinnabar/5 px-2 py-0.5 rounded">{status.count} 条</span>
        </div>
      </div>
    </div>
  );
};
