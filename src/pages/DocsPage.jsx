import React from 'react';
import { 
  BookOpen, 
  Binary, 
  FileText, 
  Zap, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown 
} from 'lucide-react';

const DocsPage = () => {
  return (
    <div className="animate-fade space-y-6 pb-12">
      
      {/* 1. HEADER SECTION */}
      <header className="pt-2">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <BookOpen className="text-[#FFBA49]" size={24} /> Dokumentasi TKA
        </h1>
        <p className="text-[11px] text-slate-500 font-medium">
          Panduan lengkap memahami Tes Kemampuan Akademik SMP/MTs
        </p>
      </header>

      {/* 2. CARD "APA ITU TKA?" */}
      <section className="bg-[#498FFF] text-white rounded-3xl p-6 shadow-lg shadow-blue-100">
        <h2 className="text-lg font-black mb-2 flex items-center gap-2">
          <Zap size={18} fill="currentColor" /> Apa itu TKA?
        </h2>
        <p className="text-xs leading-relaxed opacity-90">
          TKA (Tes Kemampuan Akademik) adalah tes yang mengukur kemampuan berpikir logis dan bernalar kamu, bukan sekadar hafalan materi. Tes ini jadi standar masuk banyak sekolah unggulan karena pengen liat gimana cara kamu memecahkan masalah.
        </p>
        <div className="flex gap-2 mt-4">
          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">Numerasi</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">Literasi</span>
        </div>
      </section>

      {/* 3. CARD "STRUKTUR TES" */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Target size={14} /> Struktur Tes
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { t: "Total 40 Soal", d: "20 Numerasi + 20 Literasi", ic: Binary },
            { t: "Waktu 90 Menit", d: "Atur waktu biar nggak panik", ic: Clock },
            { t: "Format Variatif", d: "Pilihan ganda & Isian singkat", ic: FileText },
            { t: "No Penalty", d: "Nggak ada pengurangan nilai", ic: CheckCircle2 }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <item.ic size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">{item.t}</p>
                <p className="text-[10px] text-slate-400">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECTION NUMERASI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[#FFBA49] rounded-full" />
          <h2 className="text-sm font-black text-slate-800 uppercase">Fokus Numerasi</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed px-1">
          Mengukur kemampuan menggunakan angka dan simbol matematika untuk memecahkan masalah kehidupan nyata.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {["Perbandingan", "Persentase", "Pola Bilangan", "Grafik & Data", "Peluang", "Aritmatika"].map((t, i) => (
            <div key={i} className="p-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-2">
              <div className="w-1 h-1 bg-[#FFBA49] rounded-full" /> {t}
            </div>
          ))}
        </div>
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
          <p className="text-[10px] font-black text-orange-600 uppercase mb-2">Contoh Soal:</p>
          <p className="text-xs text-slate-700 italic leading-relaxed mb-2">
            "Sebuah peta memiliki skala 1:500.000. Jika jarak dua kota di peta 4 cm, berapa jarak sebenarnya?"
          </p>
          <div className="p-2 bg-white/50 rounded-lg text-xs font-bold text-orange-700">
            Jawaban: 20 km
          </div>
        </div>
      </section>

      {/* 5. SECTION LITERASI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[#498FFF] rounded-full" />
          <h2 className="text-sm font-black text-slate-800 uppercase">Fokus Literasi</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed px-1">
          Mengukur kemampuan memahami, menganalisis, dan mengevaluasi berbagai jenis teks/bacaan.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {["Ide Pokok", "Makna Kata", "Tujuan Penulis", "Fakta/Opini", "Simpulan", "Struktur Teks"].map((t, i) => (
            <div key={i} className="p-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-2">
              <div className="w-1 h-1 bg-[#498FFF] rounded-full" /> {t}
            </div>
          ))}
        </div>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Contoh Soal:</p>
          <p className="text-xs text-slate-700 italic leading-relaxed mb-2">
            "Apa maksud tersirat dari kalimat 'Udara pagi ini terasa lebih berat dari biasanya'?"
          </p>
          <div className="p-2 bg-white/50 rounded-lg text-xs font-bold text-blue-700">
            Analisis: Menggambarkan suasana hati/polusi.
          </div>
        </div>
      </section>

      {/* 6. STRATEGI MENGERJAKAN */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-black uppercase text-orange-400">Strategi Menang</h3>
        <ul className="space-y-4">
          {[
            "Baca soal dua kali sebelum menjawab.",
            "Eliminasi jawaban yang jelas salah.",
            "Kerjakan soal mudah dulu, tandai yang sulit.",
            "Jangan kelamaan di satu soal (max 2 mnt)."
          ].map((text, i) => (
            <li key={i} className="flex gap-3 text-xs leading-relaxed">
              <span className="text-orange-400 font-black">{i+1}.</span>
              <span className="opacity-90">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 7. TIPS GOZO AI */}
      <section className="bg-[#FFBA49]/10 border border-[#FFBA49]/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-orange-700 mb-3">
          <AlertCircle size={18} />
          <h3 className="text-xs font-black uppercase">Tips Pakai Gozo AI</h3>
        </div>
        <p className="text-[11px] text-orange-900/70 leading-relaxed">
          Gunakan fitur <strong>Analisis</strong> kalau kamu punya soal dari buku yang nggak ada pembahasannya. Pakai <strong>Latihan Soal</strong> buat simulasi *real-time* biar mental kamu siap pas hari H tes.
        </p>
      </section>

    </div>
  );
};

export default DocsPage;
