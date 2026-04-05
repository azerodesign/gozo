
import React, { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen,
  Zap,
  Target
} from 'lucide-react';
import { renderMarkdown } from '../utils/api';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('gozo_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        setHistory([]);
      }
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm("Hapus semua riwayat latihan?")) {
      localStorage.removeItem('gozo_history');
      setHistory([]);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusIcon = (status) => {
    if (status === 'correct') return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === 'partial') return <Lightbulb size={16} className="text-yellow-500" />;
    return <XCircle size={16} className="text-red-500" />;
  };

  return (
    <div className="animate-fade space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <History size={20} className="text-[#498FFF]" /> Riwayat Soal
        </h2>
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <BookOpen size={48} className="mb-4" />
          <p className="text-sm font-bold">Belum ada riwayat.<br/>Mulai latihan dulu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all"
            >
              {/* Header Card */}
              <div 
                className="p-4 cursor-pointer flex items-start gap-3"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="mt-1">{getStatusIcon(item.scoreStatus)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${item.mode === 'numerasi' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {item.mode}
                    </span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                      {item.soalStyle}
                    </span>
                    <span className="text-[8px] text-slate-400 font-medium ml-auto">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 line-clamp-2 leading-relaxed">
                    {item.question.replace(/<[^>]*>?/gm, '')}
                  </p>
                </div>
                <div className="text-slate-300 ml-1">
                  {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-slate-50 animate-fade">
                  <div className="py-3 space-y-4">
                    {/* Full Question */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Soal Lengkap</p>
                      <div className="text-xs font-bold text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.question) }} />
                    </div>

                    {/* Options & User Answer */}
                    {item.options && item.options.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Pilihan & Jawaban Kamu</p>
                        <div className="grid gap-1.5">
                          {item.options.map((opt, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 rounded-lg text-[10px] flex gap-2 border ${item.selectedAnswer?.label === opt.label ? 'border-[#498FFF] bg-blue-50 font-bold' : 'border-slate-100 text-slate-500'}`}
                            >
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${item.selectedAnswer?.label === opt.label ? 'bg-[#498FFF] text-white' : 'bg-slate-100'}`}>
                                {opt.label}
                              </span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pembahasan */}
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[9px] font-black text-[#FFBA49] uppercase mb-2 flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> Pembahasan
                      </p>
                      <div className="text-[10px] text-slate-600 leading-relaxed font-medium prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.result) }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;

