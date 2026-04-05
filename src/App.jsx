
import React, { useState, useEffect } from 'react';
import { Zap, BrainCircuit, BookOpen, History, Info } from 'lucide-react';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import DocsPage from './pages/DocsPage';
import HistoryPage from './pages/HistoryPage';

const App = () => {
  const [tab, setTab] = useState('home');
  const [mode, setMode] = useState('numerasi');
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const session = localStorage.getItem('gozo_active_session');
      setHasActiveSession(!!session);
    };
    checkSession();
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, []);

  const navigateToAi = (newMode) => {
    setMode(newMode);
    setTab('ai');
  };

  return (
    <div 
      style={{ 
        backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)', 
        backgroundSize: '24px 24px', 
        backgroundColor: '#f8fafc' 
      }}
      className="min-h-screen text-slate-900 font-sans pb-24 selection:bg-blue-100 selection:text-blue-900"
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Premium Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl h-14 border-b border-slate-200/60 flex items-center justify-between px-5 z-[100]">
        <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-all duration-300" onClick={() => setTab('home')}>
          <div className="w-8 h-8 bg-[#FFBA49] rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Zap className="text-white fill-white" size={16} />
          </div>
          <span className="text-xl font-black tracking-tighter italic uppercase text-slate-900">Gozo</span>
        </div>

        <div className="relative">
          <div 
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full text-[10px] font-black text-[#498FFF] cursor-pointer hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
          >
            SMP/MTs <Info size={10} />
          </div>
          
          {showTooltip && (
            <div className="absolute top-10 right-0 w-48 bg-slate-900 text-white text-[10px] p-3 rounded-2xl shadow-2xl animate-fade z-[110]">
              <div className="absolute -top-1 right-8 w-2 h-2 bg-slate-900 rotate-45" />
              Gozo dirancang khusus untuk nalar TKA siswa SMP/MTs kelas 9.
            </div>
          )}
        </div>
      </header>

      {/* Viewport */}
      <main className="pt-20 px-4 max-w-md mx-auto">
        {tab === 'home' && <HomePage mode={mode} setMode={setMode} navigateToAi={navigateToAi} />}
        {tab === 'ai' && <LearnPage mode={mode} setMode={setMode} />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'docs' && <DocsPage />}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200/60 h-16 flex justify-around items-center px-6 z-[100] pb-2">
        {[
          { id: 'home', ic: Zap, l: 'Home' },
          { id: 'ai', ic: BrainCircuit, l: 'Learn' },
          { id: 'history', ic: History, l: 'History' },
          { id: 'docs', ic: BookOpen, l: 'Docs' }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all relative w-12 ${tab === item.id ? 'text-[#498FFF]' : 'text-slate-300 hover:text-slate-400'}`}
          >
            {item.id === 'ai' && hasActiveSession && tab !== 'ai' && (
              <span className="absolute top-0 right-1 w-2 h-2 bg-[#FFBA49] border-2 border-white rounded-full z-10 animate-bounce" />
            )}
            
            <div className={`p-1 rounded-xl transition-all ${tab === item.id ? 'bg-blue-50' : ''}`}>
              <item.ic size={22} fill={tab === item.id ? 'currentColor' : 'none'} strokeWidth={tab === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${tab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.l}</span>
            {tab === item.id && (
              <div className="absolute -bottom-1 w-1 h-1 bg-[#498FFF] rounded-full shadow-[0_0_8px_#498FFF]" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
