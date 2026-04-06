
import React, { useState, useEffect } from 'react';
import { 
  History, CheckCircle2, XCircle, Lightbulb, Trash2, 
  ChevronDown, ChevronUp, BookOpen, Zap, Copy, Check 
} from 'lucide-react';
import { renderMarkdown } from '../utils/api';
import { loadHistoryFromDB, clearHistoryFromDB, getToken } from '../utils/db';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const userToken = getToken();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      // Load from DB
      const dbData = await loadHistoryFromDB();
      if (dbData) {
        setHistory(dbData);
        localStorage.setItem('gozo_history', JSON.stringify(dbData)); // Sync local cache
      } else {
        // Fallback to local
        const localData = JSON.parse(localStorage.getItem('gozo_history') || '[]');
        setHistory(localData);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const copyToken = () => {
    const el = document.createElement('textarea');
    el.value = userToken;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const clearAll = async () => {
    if (window.confirm("Hapus semua riwayat?")) {
      await clearHistoryFromDB();
      localStorage.removeItem('gozo_history');
      setHistory([]);
    }
  };

  const maskedToken = `${userToken.slice(0, 4)}••••${userToken.slice(-4)}`;

  return (
    <div className="animate-fade space-y-4 pb-10">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <History size={20} className="text-[#498FFF]" /> Riwayat
          </h2>
          <div className="flex items-center gap-1.5 group cursor-pointer" onClick={copyToken}>
            <span className="text-[10px] font-mono text-slate-400">Token: {maskedToken}</span>
            {tokenCopied ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="text-slate-300 group-hover:text-[#498FFF]" />}
          </div>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" size={32} /></div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <BookOpen size={48} className="mb-4" />
          <p className="text-sm font-bold">Belum ada riwayat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 cursor-pointer flex items-start gap-3" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="mt-1">
                    {item.scoreStatus === 'correct' ? <CheckCircle2 size={16} className="text-green-500" /> : 
                     item.scoreStatus === 'partial' ? <Lightbulb size={16} className="text-yellow-500" /> : <XCircle size={16} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${item.mode === 'numerasi' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{item.mode}</span>
                    <span className="text-[8px] text-slate-400 font-medium ml-auto">{item.timestamp}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 line-clamp-2">{item.question}</p>
                </div>
              </div>
              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-slate-50 animate-fade">
                    <div className="py-3 bg-slate-50 rounded-xl p-3 mt-2">
                        <div className="text-[10px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.result) }} />
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
