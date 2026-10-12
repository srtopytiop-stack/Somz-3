import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  HelpCircle,
  TrendingUp,
  Package,
  Users,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { assistantEngine, AssistantAnswer } from '../services/assistantEngine';
import { TabKey } from './Navigation';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabKey) => void;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    { sender: 'user' | 'assistant'; text: string; actionButton?: AssistantAnswer['actionButton'] }[]
  >([
    {
      sender: 'assistant',
      text: `مرحباً بك! أنا مساعد ميزان المحاسبي الذكي 🌟
أعمل محلياً بالكامل لمساعدتك في استخراج الأرقام، تفسير صافي الأرباح، فحص نواقص المخزون وشرح أي إجراء في البرنامج دون أي تكلفة أو اشتراك.`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'كم صافي أرباحنا الحقيقي وكيف تم حسابه؟',
    'ما هي المنتجات التي اقتربت من النفاد في المخزن؟',
    'من هم العملاء المدينون وما إجمالي ديونهم؟',
    'كيف أنشئ فاتورة مبيعات جديدة؟',
    'كيف أستخدم استوديو العرض 3D؟',
    'كيف أصمم إعلاناً تجارياً لمنتج؟',
  ];

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    if (!textToSend) setQuery('');
    setLoading(true);

    try {
      const response = await assistantEngine.ask(q);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: response.text,
          actionButton: response.actionButton,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: `عذراً، حدث خطأ: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">مساعد ميزان الذكي (Mizan Assistant)</h2>
              <p className="text-[10px] text-emerald-400 font-medium">مساعد محلي فوري · استخراج محاسبي دقيق</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {quickQuestions.map((qq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qq)}
              className="text-[11px] whitespace-nowrap bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 transition-colors"
            >
              {qq}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1 min-h-[260px] text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed whitespace-pre-line ${
                  m.sender === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium'
                    : 'bg-slate-950 border border-slate-800 text-slate-100'
                }`}
              >
                {m.text}

                {m.actionButton && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate(m.actionButton!.targetTab as TabKey);
                    }}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    <span>{m.actionButton.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-slate-400 text-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
              <span>جاري استخراج البيانات المحاسبية...</span>
            </div>
          )}
        </div>

        {/* Query Input */}
        <div className="pt-2 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder="اسأل عن أي حساب، رصيد، أو كيفية عمل ميزة..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!query.trim() || loading}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
