
import React, { useState, useEffect } from 'react';
import { 
  Send, Lightbulb, Target, RefreshCcw, 
  Sparkles, Search, XCircle, CheckCircle2, RotateCcw, 
  Zap, Copy, Check, Loader2 
} from 'lucide-react';
import { callQwen, callGPT, renderMarkdown, parseScoreStatus } from '../utils/api';
import { 
  saveHistoryToDB, 
  saveSessionToDB, 
  loadSessionFromDB, 
  clearSessionFromDB 
} from '../utils/db';

const LearnPage = ({ mode, setMode }) => {
  // --- 1. STATE MANAGEMENT ---
  const [aiSubMode, setAiSubMode] = useState('analisis');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [phase, setPhase] = useState('idle'); 
  const [hints, setHints] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);

  const [parsedOptions, setParsedOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const [loadingStep, setLoadingStep] = useState(null);
  const [loadingTimer, setLoadingTimer] = useState(0);
  const [soalStyle, setSoalStyle] = useState('standard');

  const [scoreStatus, setScoreStatus] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, partial: 0, wrong: 0, total: 0 });

  // --- 2. PERSISTENCE & ERROR HANDLING ---
  useEffect(() => {
    const initSession = async () => {
      try {
        const dbSession = await loadSessionFromDB();
        const s = dbSession || JSON.parse(localStorage.getItem('gozo_active_session'));
        if (s && s.currentQuestion && s.phase !== 'idle') {
          setCurrentQuestion(s.currentQuestion);
          setParsedOptions(s.parsedOptions || []);
          setConcepts(s.concepts || []);
          setPhase(s.phase);
          setHints(s.hints || []);
          setHintLevel(s.hintLevel || 0);
          setScoreStatus(s.scoreStatus || null);
          setResult(s.result || '');
          setMode(s.mode || 'numerasi');
          setSoalStyle(s.soalStyle || 'standard');
          setSelectedAnswer(s.selectedAnswer || null);
          setAiSubMode('latihan');
        }
      } catch (e) {}
    };
    initSession();
  }, []);

  // PERBAIKAN: Error handling lebih ramah dan natural
  const handleError = (err) => {
    const status = err.status || (err.message?.includes('429') ? 429 : err.message?.includes('500') ? 500 : 0);
    
    if (status === 429) {
      setErrorMsg("Waduh, antrean Gozo lagi penuh banget nih. Tunggu sebentar ya biar lancar lagi!");
    } else if (status >= 500) {
      setErrorMsg("Database Neon lagi agak pusing, tapi tenang, progres kamu masih aman kok di memori lokal.");
    } else {
      setErrorMsg("Koneksi ke Gozo keputus. Coba cek sinyal atau paket data kamu bentar.");
    }
  };

  const saveSession = (overrides = {}) => {
    const sessionData = {
      currentQuestion: overrides.currentQuestion || currentQuestion,
      parsedOptions: overrides.parsedOptions || parsedOptions,
      concepts: overrides.concepts || concepts,
      phase: overrides.phase || phase,
      hints: overrides.hints || hints,
      hintLevel: overrides.hintLevel !== undefined ? overrides.hintLevel : hintLevel,
      scoreStatus: overrides.scoreStatus !== undefined ? overrides.scoreStatus : scoreStatus,
      result: overrides.result !== undefined ? overrides.result : result,
      mode: overrides.mode || mode,
      soalStyle: overrides.soalStyle || soalStyle,
      selectedAnswer: overrides.selectedAnswer !== undefined ? overrides.selectedAnswer : selectedAnswer
    };
    localStorage.setItem('gozo_active_session', JSON.stringify(sessionData));
    saveSessionToDB(sessionData).catch(() => {});
  };

  // --- 3. UTILITIES ---
  const parseOptionsFromText = (text) => {
    const lines = text.split('\n');
    const optionRegex = /^([A-E])\.\s+(.+)/;
    const options = [];
    const questionLines = [];

    const filteredLines = lines.filter(line => {
      const t = line.trim();
      return !t.match(/^soal tka/i) && !t.match(/^soal latihan/i) && !t.match(/^\*\*soal/i) && !t.match(/^---/);
    });

    filteredLines.forEach(line => {
      const match = line.trim().match(optionRegex);
      if (match) options.push({ label: match[1], text: match[2].trim() });
      else questionLines.push(line);
    });

    const seenLabels = new Set();
    const uniqueOptions = options.filter(opt => {
      if (seenLabels.has(opt.label)) return false;
      seenLabels.add(opt.label);
      return true;
    });

    return { cleanQuestion: questionLines.join('\n').trim(), options: uniqueOptions };
  };

  const copyToClipboard = () => {
    const el = document.createElement('textarea');
    el.value = currentQuestion;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- 4. CORE HANDLERS ---
  
  // PERBAIKAN: Tambah logic retry otomatis (max 2x) untuk error 429
  const handleMintaSoal = async (retryCount = 0) => {
    if (retryCount === 0) {
      localStorage.removeItem('gozo_active_session');
      clearSessionFromDB().catch(() => {});
      setResult('');
      setInput('');
      setHints([]);
      setHintLevel(0);
      setConcepts([]);
      setScoreStatus(null);
      setErrorMsg(null);
      setParsedOptions([]);
      setSelectedAnswer(null);
      setLoadingTimer(0);
    }

    setLoadingStep('connecting');
    setPhase('idle');

    const timerInterval = setInterval(() => setLoadingTimer(prev => prev + 1), 100);
    await new Promise(r => setTimeout(r, 600));
    
    setLoadingStep('generating');
    let system = `Kamu Gozo AI. Buat 1 soal TKA ${mode.toUpperCase()} level SMP kelas 9 yang ${soalStyle === 'challenging' ? 'menantang multi-langkah' : soalStyle === 'story' ? 'berbasis cerita naratif' : 'realistis'}. Tampilkan soal saja, jangan bocorkan jawaban. Sertakan pilihan A-E.`;
    
    try {
      const rawQuestion = await callQwen([{ role: 'user', content: "Berikan saya 1 soal latihan." }], system);

      if (rawQuestion) {
        const { cleanQuestion, options } = parseOptionsFromText(rawQuestion);
        setLoadingTimer(0);
        setLoadingStep('done');
        await new Promise(r => setTimeout(r, 400));
        
        clearInterval(timerInterval); 
        setCurrentQuestion(cleanQuestion);
        setParsedOptions(options);
        setPhase('menjawab');
        setLoadingStep(null);
        setLoadingTimer(0);

        const conceptSystem = "Sebutkan 1-3 konsep utama soal ini dalam JSON: {concepts: []}. Jawab JSON saja.";
        callQwen([{ role: 'user', content: cleanQuestion }], conceptSystem).then(res => {
          if (res) {
            try {
              const parsed = JSON.parse(res.replace(/```json|```/g, '').trim());
              setConcepts(parsed.concepts || []);
              saveSession({ currentQuestion: cleanQuestion, parsedOptions: options, concepts: parsed.concepts, phase: 'menjawab' });
            } catch (e) { setConcepts([]); }
          }
        });

        saveSession({ currentQuestion: cleanQuestion, parsedOptions: options, concepts: [], phase: 'menjawab', hints: [], hintLevel: 0, scoreStatus: null, result: '', mode, soalStyle, selectedAnswer: null });
      } else {
        throw new Error("Empty Response");
      }
    } catch (err) {
      clearInterval(timerInterval);
      const isRateLimit = err.status === 429 || err.message?.includes('429');
      
      if (isRateLimit && retryCount < 2) {
        await new Promise(r => setTimeout(r, 1500));
        return handleMintaSoal(retryCount + 1);
      }

      setLoadingStep(null);
      handleError(err);
    }
  };

  const handleAnalisisSoal = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult('');
    setErrorMsg(null);
    const system = "Kamu Gozo AI. User paste soal TKA SMP kelas 9. Jawab dengan benar lalu jelaskan langkah-langkah penyelesaiannya secara detail. Format Markdown, bahasa Indonesia santai.";
    try {
      const res = await callGPT([{ role: 'user', content: `[${mode.toUpperCase()}] Soal: ${input}` }], system);
      if (res) setResult(res);
      else throw new Error("Null res");
    } catch (err) {
      handleError(err);
    }
    setLoading(false);
  };

  const handleKoreksiJawaban = async () => {
    const finalAnswer = selectedAnswer ? `Jawaban saya: ${selectedAnswer.label}. ${selectedAnswer.text}` : input;
    if (!finalAnswer.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    const system = "Kamu Gozo AI. Di baris PERTAMA tulis salah satu: [CORRECT], [PARTIAL], atau [WRONG]. Lalu koreksi jawaban user dan berikan pembahasan lengkap untuk siswa SMP kelas 9. Format Markdown, bahasa Indonesia santai.";
    try {
      const res = await callGPT([
        { role: 'assistant', content: currentQuestion + (parsedOptions.length > 0 ? "\nPilihan:\n" + parsedOptions.map(o => `${o.label}. ${o.text}`).join('\n') : "") },
        { role: 'user', content: finalAnswer }
      ], system);

      if (res) {
        const { status, cleanText } = parseScoreStatus(res);
        setScoreStatus(status);
        setResult(cleanText);
        if (status) setSessionStats(prev => ({ ...prev, [status]: prev[status] + 1, total: prev.total + 1 }));
        setPhase('selesai');
        saveSession({ scoreStatus: status, result: cleanText, phase: 'selesai' });

        saveHistoryToDB({
          id: Date.now(),
          timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          mode, soalStyle, question: currentQuestion, options: parsedOptions,
          selectedAnswer, concepts, scoreStatus: status, result: cleanText
        }).catch(() => {});
      } else {
        throw new Error("Null res");
      }
    } catch (err) {
      handleError(err);
    }
    setLoading(false);
  };

  // PERBAIKAN: Tambahkan try-catch agar konsisten
  const handleMintaHint = async () => {
    if (hintLevel >= 3 || loadingHint) return;
    setLoadingHint(true);
    const system = `Kamu Gozo AI. Berikan hint level ${hintLevel + 1} (jangan sebut jawaban). 1-3 kalimat saja.`;
    try {
      const res = await callQwen([{ role: 'assistant', content: currentQuestion }, { role: 'user', content: "Minta hint." }], system);
      if (res) {
        const newHints = [...hints, res];
        const newLevel = hintLevel + 1;
        setHints(newHints);
        setHintLevel(newLevel);
        saveSession({ hints: newHints, hintLevel: newLevel });
      }
    } catch (e) {
      console.error("Hint failed", e);
    }
    setLoadingHint(false);
  };

  const selectOption = (opt) => {
    if (phase === 'selesai') return;
    setSelectedAnswer(opt);
    saveSession({ 
      selectedAnswer: opt, currentQuestion, parsedOptions,
      concepts, phase, hints, hintLevel, scoreStatus, result, mode, soalStyle
    });
  };

  const loadingSteps = [
    { key: 'connecting', icon: '⚙️', text: 'Menghubungi Gozo AI...' },
    { key: 'generating', icon: '🧠', text: `Qwen3.6 menyusun soal ${mode}...` },
    { key: 'done', icon: '✅', text: 'Soal siap!' }
  ];
  const progressMap = { connecting: 33, generating: 66, done: 100 };

  return (
    <div className="animate-fade space-y-4 pb-10">
      {/* Session Tracker */}
      {aiSubMode === 'latihan' && sessionStats.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-fade">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sesi Latihan</span>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-green-600">✅ {sessionStats.correct}</span>
              <span className="text-[10px] font-bold text-yellow-600">💪 {sessionStats.partial}</span>
              <span className="text-[10px] font-bold text-red-500">❌ {sessionStats.wrong}</span>
            </div>
          </div>
          <button onClick={() => setSessionStats({correct:0, partial:0, wrong:0, total:0})} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
            <RotateCcw size={12} className="text-slate-400" />
          </button>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        {['analisis', 'latihan'].map((m) => (
          <button key={m} onClick={() => { setAiSubMode(m); setResult(''); setPhase('idle'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${aiSubMode === m ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {m === 'analisis' ? <Search size={14} /> : <Sparkles size={14} />} {m}
          </button>
        ))}
      </div>

      {/* Category Toggle */}
      <div className="flex gap-1.5 p-1 bg-slate-200/40 rounded-xl">
        {['numerasi', 'literasi'].map((cat) => (
          <button key={cat} onClick={() => setMode(cat)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === cat ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Main Interaction Card */}
      <div className={`bg-white rounded-[2rem] shadow-sm border transition-all duration-300 overflow-hidden min-h-[240px] flex flex-col ${isFocused ? 'border-[#498FFF] ring-4 ring-blue-50' : 'border-slate-200'}`}>
        {aiSubMode === 'latihan' && phase === 'idle' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {loadingStep === null ? (
              <div className="w-full space-y-6 animate-fade">
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                    <Target size={28} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight italic">Siap Latihan {mode} Kelas 9?</h3>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Gaya Soal</p>
                  <div className="grid grid-cols-3 gap-2 px-2">
                    {[{id:'standard', icon:'🎯', l:'Standard'}, {id:'challenging', icon:'🔥', l:'Hard'}, {id:'story', icon:'📖', l:'Cerita'}].map(s => (
                      <button key={s.id} onClick={() => setSoalStyle(s.id)}
                        className={`py-3 rounded-2xl text-[10px] font-black flex flex-col items-center gap-1 transition-all ${soalStyle === s.id ? 'bg-[#498FFF] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                        <span>{s.icon}</span> {s.l}
                      </button>
                    ))}
                  </div>
                </div>
                {/* PERBAIKAN: Tombol Minta Soal yang disable saat loading */}
                <button 
                  onClick={() => handleMintaSoal()} 
                  disabled={loadingStep !== null}
                  className={`bg-[#498FFF] text-white px-10 py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all tracking-wider ${loadingStep !== null ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loadingStep !== null ? "Sedang Membuat Soal..." : "Minta Soal"}
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[240px] space-y-6 py-4 animate-fade">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-[#498FFF] uppercase tracking-tighter">Proses Gozo</span>
                    <span className="text-[10px] text-slate-400 font-mono">{(loadingTimer/10).toFixed(1)}s</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#498FFF] h-full rounded-full transition-all duration-300" style={{width: `${progressMap[loadingStep] || 0}%`}} />
                  </div>
                </div>
                <div className="space-y-3">
                  {loadingSteps.map((s, idx) => {
                    const stepIdx = loadingSteps.findIndex(ls => ls.key === loadingStep);
                    const isDone = idx < stepIdx;
                    const isActive = idx === stepIdx;
                    return (
                      <div key={s.key} className={`flex gap-3 items-center transition-all duration-300 ${isDone ? 'text-green-600' : isActive ? 'text-blue-600 animate-pulse' : 'opacity-20'}`}>
                        <span className="text-sm">{isDone ? '✅' : s.icon}</span>
                        <span className="text-[11px] font-bold">{s.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Answer Phase: Question Display */}
            {aiSubMode === 'latihan' && currentQuestion && (
              <div className="p-6 bg-slate-50 relative border-b border-slate-100 animate-fade">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[9px] font-black text-[#498FFF] uppercase tracking-widest flex items-center gap-1.5">
                    <Target size={12} /> Soal Aktif
                  </p>
                  <button onClick={copyToClipboard} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#498FFF] transition-colors shadow-sm">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentQuestion) }} />
                {concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {concepts.map((c, i) => <span key={i} className="bg-blue-100/50 text-blue-700 text-[9px] font-bold px-2.5 py-1 rounded-lg border border-blue-200/50">{c}</span>)}
                  </div>
                )}
              </div>
            )}

            {/* Hint Rendering */}
            {aiSubMode === 'latihan' && hints.length > 0 && (
              <div className="px-6 pt-4 space-y-2.5 animate-fade">
                {hints.map((h, i) => (
                  <div key={i} className={`p-3.5 rounded-2xl border text-[10px] leading-relaxed animate-fade ${['bg-blue-50/50 border-blue-200 text-blue-800', 'bg-orange-50/50 border-orange-200 text-orange-800', 'bg-red-50/50 border-red-200 text-red-800'][i]}`}>
                    <span className="font-black uppercase tracking-tight block mb-1">💡 Hint {i+1}</span>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(h) }} />
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="flex-1 p-6 flex flex-col gap-4">
              {aiSubMode === 'latihan' && parsedOptions.length > 0 ? (
                <div className={`grid gap-2.5 animate-fade ${parsedOptions.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {parsedOptions.map((opt, i) => (
                    <button key={i} disabled={phase === 'selesai'} onClick={() => selectOption(opt)}
                      className={`p-4 rounded-2xl border text-xs font-bold text-left flex gap-3 transition-all duration-300 ${selectedAnswer?.label === opt.label ? 'border-[#498FFF] bg-blue-50 shadow-md ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'} ${phase === 'selesai' ? 'opacity-70' : ''}`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-colors ${selectedAnswer?.label === opt.label ? 'bg-[#498FFF] text-white' : 'bg-slate-100 text-slate-500'}`}>{opt.label}</span>
                      <span className={selectedAnswer?.label === opt.label ? 'text-[#1e40af]' : 'text-slate-600'}>{opt.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <textarea value={input} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => setInput(e.target.value)}
                  placeholder={aiSubMode === 'analisis' ? "Tempel soal di sini..." : "Ketik jawaban kamu di sini..."}
                  className="flex-1 w-full text-sm bg-transparent outline-none resize-none placeholder:text-slate-300 min-h-[150px]" />
              )}
              <div className={`text-right text-[10px] font-bold transition-all duration-300 ${selectedAnswer ? 'text-green-500' : (input.length > 0 ? 'text-[#498FFF]' : 'text-slate-200')}`}>
                {selectedAnswer ? 'Jawaban dipilih ✓' : `${input.length} karakter`}
              </div>
            </div>

            {/* Footer Interaction */}
            <div className="p-5 flex flex-wrap gap-2.5 items-center justify-between bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {aiSubMode === 'latihan' && phase === 'menjawab' && (
                  <>
                    <button onClick={() => handleMintaSoal()} className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-400 hover:text-red-500 transition-all active:scale-95 shadow-sm">Soal Baru ↩</button>
                    {hintLevel < 3 ? (
                      <button onClick={handleMintaHint} disabled={loadingHint} className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-600 flex items-center gap-2 active:scale-95 transition-all shadow-sm">
                        {loadingHint ? <Loader2 size={10} className="animate-spin" /> : `Hint 💡 (${3 - hintLevel} sisa)`}
                      </button>
                    ) : <span className="text-[10px] font-bold text-slate-400 italic">No hints 💪</span>}
                  </>
                )}
              </div>
              <button onClick={aiSubMode === 'analisis' ? handleAnalisisSoal : handleKoreksiJawaban} 
                disabled={loading || (!input.trim() && !selectedAnswer) || (aiSubMode === 'latihan' && phase === 'selesai')}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all duration-300 active:scale-95 ${(!input.trim() && !selectedAnswer) || loading ? 'bg-slate-200 text-slate-400' : 'bg-[#498FFF] text-white shadow-xl shadow-blue-200 hover:shadow-blue-300'}`}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {aiSubMode === 'analisis' ? 'Analisis' : 'Koreksi'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Error Reporting */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[11px] font-bold animate-fade flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2"><XCircle size={16} /> {errorMsg}</div>
          <button onClick={() => handleMintaSoal()} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-200 transition-colors">Coba Lagi 🔄</button>
        </div>
      )}
      
      {/* Result Area */}
      {result && (
        <div className="animate-fade space-y-4 pt-2">
          {aiSubMode === 'latihan' && scoreStatus && (
            <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 animate-fade shadow-sm ${scoreStatus === 'correct' ? 'bg-green-50 border-green-200 text-green-700' : scoreStatus === 'partial' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="p-2 bg-white rounded-2xl shadow-sm">
                {scoreStatus === 'correct' ? <CheckCircle2 size={24} /> : scoreStatus === 'partial' ? <Lightbulb size={24} /> : <XCircle size={24} />}
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm">{scoreStatus === 'correct' ? "Jawaban Benar! 🎉" : scoreStatus === 'partial' ? "Hampir Benar! 💪" : "Belum Tepat 📚"}</span>
                <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-0.5">
                  {scoreStatus === 'correct' ? "Pertahankan!" : scoreStatus === 'partial' ? "Sedikit lagi!" : "Pelajari pembahasannya ya!"}
                </span>
              </div>
            </div>
          )}
          <div className="bg-white rounded-[2rem] p-7 border border-slate-200 shadow-sm relative group">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#FFBA49] uppercase tracking-[0.2em] mb-6">
              <Zap size={14} fill="currentColor" /> Pembahasan Detail
            </div>
            <div className="text-[13px] text-slate-700 leading-[1.8] font-medium prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
          </div>
          {aiSubMode === 'latihan' && phase === 'selesai' && (
            <button onClick={() => { localStorage.removeItem('gozo_active_session'); handleMintaSoal(); }} 
              className="w-full py-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-xs font-black text-slate-400 flex items-center justify-center gap-3 hover:border-[#498FFF] hover:text-[#498FFF] hover:bg-blue-50/30 transition-all group">
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              Tantangan Berikutnya
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LearnPage;


