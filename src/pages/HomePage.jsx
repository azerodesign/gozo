
import React, { useState } from 'react';
import { 
  Zap, 
  ArrowRight, 
  Binary, 
  FileText, 
  ChevronRight, 
  Target, 
  Clock, 
  CheckCircle2, 
  Lightbulb,
  BrainCircuit
} from 'lucide-react';

const HomePage = ({ mode, setMode, navigateToAi }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const dailyQuestion = {
    q: "Jika sebuah toko memberikan diskon 20% + 10%, berapakah total diskon yang sebenarnya diterima pembeli?",
    options: ["30%", "28%", "25%", "32%"],
    correct: 1,
    explanation: "Diskon ganda bukan dijumlah langsung. Sisa harga: 0.8 x 0.9 = 0.72. Jadi diskonnya 28%."
  };

  const tips = [
    { icon: Target, warna: 'text-blue-600', bg: 'bg-blue-50', judul: "Eliminasi", isi: "Buang jawaban paling tidak masuk akal dulu." },
    { icon: Clock, warna: 'text-orange-600', bg: 'bg-orange-50', judul: "Cek Waktu", isi: "Jangan stuck di 1 soal lebih dari 1 menit." },
    { icon: CheckCircle2, warna: 'text-green-600', bg: 'bg-green-50', judul: "Keyword", isi: "Cari kata 'Kecuali' atau 'Paling Tepat' dalam soal." }
  ];

  return (
    <div className="animate-fade space-y-5 pb-6">
      
      {/* 1. HERO CARD */}
      <section className="bg-[#498FFF] rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-1">Numerasi & Literasi</h1>
          <p className="text-xs opacity-80 mb-5 leading-relaxed max-w-[200px]">
            Pahami pola soal TKA paling sulit bareng Gozo AI Deep Learn.
          </p>
          <button 
            onClick={() => navigateToAi(mode)}
            className="bg-[#FFBA49] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-900/20"
          >
            Mulai Belajar <ArrowRight size={14} />
          </button>
        </div>
        <BrainCircuit className="absolute -right-6 -bottom-6 text-white/10 w-40 h-40 rotate-12" />
      </section>

      {/* 2. QUICK ACCESS CARDS */}
      <section className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => navigateToAi('numerasi')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-95 group"
        >
          <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#FFBA49] group-hover:text-white transition-colors">
            <Binary size={18} />
          </div>
          <h3 className="font-bold text-sm">Numerasi</h3>
          <p className="text-[10px] text-slate-400">Logika angka & data.</p>
        </div>

        <div 
          onClick={() => navigateToAi('literasi')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-95 group"
        >
          <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#498FFF] group-hover:text-white transition-colors">
            <FileText size={18} />
          </div>
          <h3 className="font-bold text-sm">Literasi</h3>
          <p className="text-[10px] text-slate-400">Nalar teks & bacaan.</p>
        </div>
      </section>

      {/* 3. INFO BANNER */}
      <section className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center group cursor-pointer active:scale-[0.98] transition-transform">
        <div>
          <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest mb-1">Pusat Informasi</p>
          <h4 className="text-sm font-bold text-orange-300">Kenapa Harus Belajar TKA?</h4>
        </div>
        <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
          <ChevronRight size={18} />
        </div>
      </section>

      {/* 4. SOAL HARI INI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-4 bg-[#FFBA49] rounded-full" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Soal Hari Ini</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-700 leading-relaxed mb-4">
            {dailyQuestion.q}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {dailyQuestion.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => setSelectedOption(i)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all duration-200 ${
                  selectedOption === i 
                    ? (i === dailyQuestion.correct 
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm shadow-green-100' 
                        : 'bg-red-50 border-red-500 text-red-700 shadow-sm shadow-red-100')
                    : 'bg-slate-50 border-slate-100 text-slate-600 active:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          
          {selectedOption !== null && (
            <div className="animate-fade mt-4 pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-[#498FFF] uppercase mb-1 flex items-center gap-1">
                <Lightbulb size={12} /> Penjelasan
              </p>
              <p className="text-[11px] text-slate-500 italic leading-relaxed">
                {dailyQuestion.explanation}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. TIPS TKA */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-4 bg-[#498FFF] rounded-full" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Tips TKA</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {tips.map((tip, i) => (
            <div key={i} className="min-w-[160px] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
              <div className={`w-8 h-8 ${tip.bg} ${tip.warna} rounded-lg flex items-center justify-center mb-3`}>
                <tip.icon size={16} />
              </div>
              <h4 className="text-xs font-bold mb-1 text-slate-800">{tip.judul}</h4>
              <p className="text-[10px] text-slate-500 leading-tight">
                {tip.isi}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomePage;


