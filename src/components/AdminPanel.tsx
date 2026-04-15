import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, Lock, LogOut } from 'lucide-react';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [character, setCharacter] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [type, setType] = useState('实词');
  const [definitions, setDefinitions] = useState(['']);
  const [examples, setExamples] = useState([{ text: '', source: '' }]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { success: boolean; token?: string; error?: string };
      if (data.success) {
        setToken(data.token || null);
        localStorage.setItem('admin_token', data.token || '');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/dictionary/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character,
          pinyin,
          type,
          definitions: definitions.filter(d => d.trim()),
          examples: examples.filter(ex => ex.text.trim())
        }),
      });
      if (res.ok) {
        alert('词条添加成功！');
        // Reset form
        setCharacter('');
        setPinyin('');
        setDefinitions(['']);
        setExamples([{ text: '', source: '' }]);
      } else {
        alert('添加失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-paper w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold/20 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-cinnabar p-6 flex justify-between items-center text-paper">
          <div className="flex items-center gap-2">
            <Lock size={20} />
            <h2 className="font-serif text-xl font-bold tracking-widest">管理员后台</h2>
          </div>
          <button onClick={onClose} className="hover:bg-paper/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!token ? (
            <form onSubmit={handleLogin} className="space-y-6 py-10">
              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl text-ink">身份验证</h3>
                <p className="text-ink/40 text-sm">请输入管理员密码以继续</p>
              </div>
              <div className="max-w-xs mx-auto space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="管理员密码"
                  className="w-full bg-white px-6 py-3 rounded-xl border border-gold/20 focus:border-cinnabar/50 outline-none transition-all text-center"
                  autoFocus
                />
                {error && <p className="text-cinnabar text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-cinnabar text-paper py-3 rounded-xl font-bold hover:bg-cinnabar-light transition-all shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? '验证中...' : '进入后台'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddEntry} className="space-y-8">
              <div className="flex justify-between items-center border-b border-gold/20 pb-4">
                <h3 className="font-serif text-xl text-cinnabar font-bold">新增词条</h3>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-ink/40 hover:text-cinnabar text-xs transition-colors"
                >
                  <LogOut size={14} /> 退出登录
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink/40 uppercase tracking-widest">汉字</label>
                  <input
                    required
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                    className="w-full bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none"
                    placeholder="如：之"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink/40 uppercase tracking-widest">拼音</label>
                  <input
                    required
                    value={pinyin}
                    onChange={(e) => setPinyin(e.target.value)}
                    className="w-full bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none"
                    placeholder="如：zhī"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink/40 uppercase tracking-widest">词性</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none"
                >
                  <option>实词</option>
                  <option>虚词</option>
                  <option>实词/虚词</option>
                  <option>通假字</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-ink/40 uppercase tracking-widest">词义解析</label>
                  <button
                    type="button"
                    onClick={() => setDefinitions([...definitions, ''])}
                    className="text-cinnabar hover:text-cinnabar-light p-1"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {definitions.map((def, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={def}
                      onChange={(e) => {
                        const newDefs = [...definitions];
                        newDefs[i] = e.target.value;
                        setDefinitions(newDefs);
                      }}
                      className="flex-1 bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none text-sm"
                      placeholder={`义项 ${i + 1}`}
                    />
                    {definitions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDefinitions(definitions.filter((_, idx) => idx !== i))}
                        className="text-ink/20 hover:text-cinnabar transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-ink/40 uppercase tracking-widest">经典例句</label>
                  <button
                    type="button"
                    onClick={() => setExamples([...examples, { text: '', source: '' }])}
                    className="text-cinnabar hover:text-cinnabar-light p-1"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {examples.map((ex, i) => (
                  <div key={i} className="space-y-2 p-4 bg-paper/50 rounded-xl border border-gold/10 relative">
                    <input
                      value={ex.text}
                      onChange={(e) => {
                        const newEx = [...examples];
                        newEx[i].text = e.target.value;
                        setExamples(newEx);
                      }}
                      className="w-full bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none text-sm"
                      placeholder="例句内容"
                    />
                    <input
                      value={ex.source}
                      onChange={(e) => {
                        const newEx = [...examples];
                        newEx[i].source = e.target.value;
                        setExamples(newEx);
                      }}
                      className="w-full bg-white px-4 py-2 rounded-lg border border-gold/20 focus:border-cinnabar/50 outline-none text-xs"
                      placeholder="出处（如：《论语》）"
                    />
                    {examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExamples(examples.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 text-ink/10 hover:text-cinnabar transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-cinnabar text-paper py-4 rounded-2xl font-bold hover:bg-cinnabar-light transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {isSubmitting ? '正在保存...' : '保存词条到 D1 数据库'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
