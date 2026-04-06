
import React, { useState, useEffect } from 'react';
import { 
  Send, Lightbulb, Target, RefreshCcw, 
  Sparkles, Search, XCircle, CheckCircle2, RotateCcw, 
  Zap, Copy, Check, Loader2, ChevronRight, List, ArrowLeft
} from 'lucide-react';
import { renderMarkdown, parseScoreStatus } from '../utils/api';

// PERBAIKAN: Konfigurasi Cerebras AI & Model Terbaru
const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY;
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";

// PERBAIKAN: Fungsi callCerebras robust dengan retry 429 & JSON mode
const callCerebras = async (messages, systemPrompt, isJsonMode = false) => {
  try {
    const response = await fetch(CEREBRAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-3-235b-a22b-instruct-2507',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        response_format: isJsonMode ? { type: 'json_object' } : undefined,
        temperature: 0.7,
        max_completion_tokens: 8192 // Kapasitas besar untuk bulk 40 soal
      })
    });
    
    if (response.status === 429) throw new Error("429");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("Cerebras Engine Error:", err);
    throw err;
  }
};

const LearnPage = ({ mode, setMode }) => {
  // --- 1. STATE MANAGEMENT ---
  const [aiSubMode, setAiSubMode] = useState('analisis');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // States Latihan & Bulk
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'bulk_list' | 'menjawab' | 'selesai'
  const [hints, setHints] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const [parsedOptions, setParsedOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [bulkQuestions, setBulkQuestions] = useState([]);
  const [targetCount, setTargetCount] = useState(5);

  // UI Progress
  const [loadingStep, setLoadingStep] = useState(null);
  const [loadingTimer, setLoadingTimer] = useState(0);
  const [soalStyle, setSoalStyle] = useState('standard');
  const [scoreStatus, setScoreStatus] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, partial: 0, wrong: 0, total: 0 });

  // --- 2. PERSISTENCE (LocalStorage Only) ---
  useEffect(() => {
    // PERBAIKAN: Neon DB dinonaktifkan total sesuai instruksi Zero
    const saved = localStorage.getItem('gozo_active_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.phase && s.phase !== 'idle') {
          setCurrentQuestion(s.currentQuestion || '');
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
          setBulkQuestions(s.bulkQuestions || []);
          setAiSubMode('latihan');
        }
      } catch (e) { console.error("Restore session failed", e); }
    }
  }, []);

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
      selectedAnswer: overrides.selectedAnswer !== undefined ? overrides.selectedAnswer : selectedAnswer,
      bulkQuestions: overrides.bulkQuestions || bulkQuestions
    };
    localStorage.setItem('gozo_active_session', JSON.stringify(sessionData));
  };

  // --- 3. UTILITIES ---
  const handleError = (err) => {
    if (err.message === "429") {
      setErrorMsg("Cerebras lagi sibuk melayani user lain. Tunggu semenit ya!");
    } else {
      setErrorMsg("Gagal menghubungi otak AI. Cek sinyal atau API Key Cerebras kamu.");
    }
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text || currentQuestion;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- 4. CORE HANDLERS ---

  // PERBAIKAN: handleMintaSoal dengan retry logic otomatis
  const handleMintaSoal = async (retryCount = 0) => {
    if (retryCount === 0) {
      localStorage.removeItem('gozo_active_session');
      setResult(''); setHints([]); setHintLevel(0); setConcepts([]);
      setBulkQuestions([]); setScoreStatus(null); setErrorMsg(null);
      setParsedOptions([]); setSelectedAnswer(null);
    }

    setLoadingStep('connecting');
    setPhase('idle');
    const timerInterval = setInterval(() => setLoadingTimer(prev => prev + 1), 100);

    const system = `Kamu Gozo AI. Buat ${targetCount} soal TKA ${mode.toUpperCase()} SMP Kelas 9. 
    Gaya: ${soalStyle}. 
    Output HARUS JSON murni:
    { "questions": [{ "question": "...", "options": [{"label":"A", "text":"..."}, {"label":"B", "text":"..."}, {"label":"C", "text":"..."}, {"label":"D", "text":"..."}, {"label":"E", "text":"..."}], "concepts": ["..."] }] }`;

    try {
      setLoadingStep('generating');
      const res = await callCerebras([{ role: 'user', content: `Buatkan ${targetCount} soal.` }], system, true);
      
      if (res) {
        const cleanJson = res.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        const questions = parsed.questions || [];
        
        setLoadingStep('done');
        await new Promise(r => setTimeout(r, 400));
        clearInterval(timerInterval);

        if (questions.length > 1) {
          setBulkQuestions(questions);
          setPhase('bulk_list');
          saveSession({ bulkQuestions: questions, phase: 'bulk_list' });
        } else if (questions.length === 1) {
          const q = questions[0];
          setCurrentQuestion(q.question);
          setParsedOptions(q.options);
          setConcepts(q.concepts || []);
          setPhase('menjawab');
          saveSession({ currentQuestion: q.question, parsedOptions: q.options, concepts: q.concepts, phase: 'menjawab' });
        }

        setLoadingStep(null);
        setLoadingTimer(0);
      }
    } catch (err) {
      clearInterval(timerInterval);
      if (err.message === "429" && retryCount < 2) {
        await new Promise(r => setTimeout(r, 2000));
        return handleMintaSoal(retryCount + 1);
      }
      setLoadingStep(null);
      handleError(err);
    }
  };

  const activateBulkQuestion = (qObj) => {
    setCurrentQuestion(qObj.question);
    setParsedOptions(qObj.options);
    setConcepts(qObj.concepts || []);
    setPhase('menjawab');
    setHints([]); setHintLevel(0); setResult(''); setScoreStatus(null); setSelectedAnswer(null);
    saveSession({ phase: 'menjawab', currentQuestion: qObj.question, parsedOptions: qObj.options });
  };

  // PERBAIKAN: Analisis menggunakan Cerebras Qwen-3
  const handleAnalisisSoal = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(''); setErrorMsg(null);
    const system = "Kamu Gozo AI. Analisis soal SMP Kelas 9 ini. Jelaskan langkah demi langkah dengan logis. Format Markdown.";
    try {
      const res = await callCerebras([{ role: 'user', content: input }], system);
      if (res) setResult(res);
    } catch (err) { handleError(err); }
    setLoading(false);
  };

  // PERBAIKAN: Koreksi menggunakan Cerebras Qwen-3
  const handleKoreksiJawaban = async () => {
    const finalAnswer = selectedAnswer ? `${selectedAnswer.label}. ${selectedAnswer.text}` : input;
    if (!finalAnswer.trim()) return;

    setLoading(true);
    const system = "Kamu Gozo AI. Koreksi jawaban user. Baris 1: [CORRECT], [PARTIAL], atau [WRONG]. Lalu pembahasan mendalam. Format Markdown.";
    try {
      const res = await callCerebras([{ role: 'user', content: `Soal: ${currentQuestion}\nJawaban User: ${finalAnswer}` }], system);
      if (res) {
        const { status, cleanText } = parseScoreStatus(res);
        setScoreStatus(status);
        setResult(cleanText);
        if (status) setSessionStats(prev => ({ ...prev, [status]: prev[status] + 1, total: prev.total + 1 }));
        setPhase('selesai');
        saveSession({ scoreStatus: status, result: cleanText, phase: 'selesai' });
      }
    } catch (err) { handleError(err); }
    setLoading(false);
  };

  const handleMintaHint = async () => {
    if (hintLevel >= 3 || loadingHint) return;
    setLoadingHint(true);
    const system = "Berikan hint strategis tanpa jawaban. Balas JSON: {\"hint\": \"...\"}";
    try {
      const res = await callCerebras([{ role: 'user', content: currentQuestion }], system, true);
      if (res) {
        const cleanJson = res.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        const hText = parsed.hint || res;
        const newHints = [...hints, hText];
        setHints(newHints);
        setHintLevel(hintLevel + 1);
        saveSession({ hints: newHints, hintLevel: hintLevel + 1 });
      }
    } catch (e) {}
    setLoadingHint(false);
  };

  // --- 5. RENDER UI ---
  return (
    <div className="animate-fade space-y-4 pb-10">
      
      {/* Tracker Sesi */}
      {aiSubMode === 'latihan' && sessionStats.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Latihan</span>
            <div className="flex gap-2 font-bold text-[10px]">
              <span className="text-green-600">✅ {sessionStats.correct}</span>
              <span className="text-yellow-600">💪 {sessionStats.partial}</span>
              <span className="text-red-500">❌ {sessionStats.wrong}</span>
            </div>
          </div>
          <button onClick={() => setSessionStats({correct:0, partial:0, wrong:0, total:0})} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
            <RotateCcw size={12} className="text-slate-400"/>
          </button>
        </div>
      )}

      {/* Mode Switch */}
      <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        {['analisis', 'latihan'].map(m => (
          <button key={m} onClick={() => {setAiSubMode(m); setPhase('idle'); setErrorMsg(null); setResult('');}} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${aiSubMode === m ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>
            {m === 'analisis' ? <Search size={14}/> : <Sparkles size={14}/>} {m}
          </button>
        ))}
      </div>

      {/* Category Toggle */}
      <div className="flex gap-1.5 p-1 bg-slate-200/40 rounded-xl">
        {['numerasi', 'literasi'].map(cat => (
          <button key={cat} onClick={() => setMode(cat)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === cat ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>{cat}</button>
        ))}
      </div>

      {/* Main Container */}
      <div className={`bg-white rounded-[2rem] shadow-sm border transition-all duration-300 min-h-[260px] flex flex-col overflow-hidden ${isFocused ? 'border-[#498FFF] ring-4 ring-blue-50' : 'border-slate-200'}`}>
        
        {/* IDLE: Generator Settings */}
        {aiSubMode === 'latihan' && phase === 'idle' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade">
            {loadingStep === null ? (
              <div className="w-full space-y-6">
                <div className="space-y-1">
                  <div className="w-14 h-14 bg-[#498FFF]/10 rounded-2xl flex items-center justify-center text-[#498FFF] mx-auto mb-3"><Target size={28}/></div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic tracking-widest">Cerebras AI Engine</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Qwen-3-235B • Kelas 9 SMP</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] uppercase font-black text-slate-300 tracking-widest mb-2 text-center">Gaya Soal</p>
                    <div className="grid grid-cols-3 gap-2 px-2">
                      {[{id:'standard', i:'🎯', l:'Standard'}, {id:'challenging', i:'🔥', l:'Sulit'}, {id:'story', i:'📖', l:'Cerita'}].map(s => (
                        <button key={s.id} onClick={() => setSoalStyle(s.id)} className={`py-3 rounded-2xl text-[10px] font-black flex flex-col items-center gap-1 transition-all ${soalStyle === s.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><span>{s.i}</span> {s.l}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase font-black text-slate-300 tracking-widest mb-2 text-center">Jumlah Soal</p>
                    <div className="flex justify-center gap-2">
                      {[1, 5, 10, 20, 40].map(c => (
                        <button key={c} onClick={() => setTargetCount(c)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${targetCount === c ? 'bg-[#498FFF] text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => handleMintaSoal()} className="w-full bg-[#498FFF] text-white py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all">
                  Generate {targetCount} Soal
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[240px] space-y-6 py-4 animate-fade">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-[#498FFF] uppercase tracking-widest">Inference Speed</span>
                    <span className="text-[10px] text-slate-400 font-mono">{(loadingTimer/10).toFixed(1)}s</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#498FFF] h-full rounded-full transition-all duration-300" style={{width: `${loadingStep === 'connecting' ? 33 : loadingStep === 'generating' ? 66 : 100}%`}} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {k:'connecting', i:'⚙️', t:'Contacting Cerebras...'},
                    {k:'generating', i:'🧠', t: `Qwen-3 drafting ${targetCount} tasks...`},
                    {k:'done', i:'✅', t:'Packet Received!'}
                  ].map((s, idx) => {
                    const stepIdx = ['connecting', 'generating', 'done'].indexOf(loadingStep);
                    const isDone = idx < stepIdx;
                    const isActive = idx === stepIdx;
                    return (
                      <div key={s.k} className={`flex gap-3 items-center transition-all duration-300 text-left ${isDone ? 'text-green-600' : isActive ? 'text-blue-600 animate-pulse' : 'opacity-20'}`}>
                        <span className="text-sm">{isDone ? '✅' : s.i}</span>
                        <span className="text-[11px] font-bold">{s.t}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : phase === 'bulk_list' ? (
          /* BULK LIST: Koleksi Soal Ter-generate */
          <div className="flex-1 flex flex-col p-6 animate-fade max-h-[550px]">
             <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><List size={14}/> Koleksi Soal ({bulkQuestions.length})</h3>
                <button onClick={() => setPhase('idle')} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors"><RotateCcw size={14}/></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                {bulkQuestions.map((q, idx) => (
                  <button key={idx} onClick={() => activateBulkQuestion(q)} className="w-full text-left p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-[#498FFF] rounded-2xl transition-all group shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start gap-3">
                      <span className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[11px] font-black border border-slate-100 group-hover:text-[#498FFF] shadow-sm">{idx+1}</span>
                      <p className="flex-1 text-[11px] font-bold text-slate-600 line-clamp-2 leading-relaxed mt-1.5">{q.question}</p>
                      <ChevronRight size={16} className="text-slate-300 mt-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
             </div>
          </div>
        ) : (
          /* ACTIVE SOAL: Tampilan Menjawab */
          <>
            {aiSubMode === 'latihan' && currentQuestion && (
              <div className="p-6 bg-slate-50 relative border-b border-slate-100 animate-fade">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-black text-[#498FFF] uppercase tracking-widest flex items-center gap-1.5"><Target size={12}/> Soal Aktif</p>
                    {concepts.length > 0 && <div className="flex gap-1 mt-1">{concepts.map((c, i) => <span key={i} className="text-[8px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{c}</span>)}</div>}
                  </div>
                  <div className="flex gap-2">
                    {bulkQuestions.length > 1 && <button onClick={() => setPhase('bulk_list')} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#498FFF] shadow-sm"><ArrowLeft size={14}/></button>}
                    <button onClick={() => copyToClipboard()} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#498FFF] shadow-sm">{copied ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}</button>
                  </div>
                </div>
                <div className="text-[13px] font-bold text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentQuestion) }} />
              </div>
            )}

            {hints.length > 0 && (
              <div className="px-6 pt-4 space-y-2 animate-fade">
                {hints.map((h, i) => (
                  <div key={i} className={`p-3.5 rounded-2xl border border-blue-100 bg-blue-50/30 text-[10px] text-blue-800 font-medium leading-relaxed`}>
                    <span className="font-black uppercase tracking-tighter block mb-1 text-blue-400 italic">💡 Hint {i+1}</span>
                    {h}
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 p-6 flex flex-col gap-4">
              {aiSubMode === 'latihan' && parsedOptions.length > 0 ? (
                <div className={`grid gap-2.5 animate-fade ${parsedOptions.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                   {parsedOptions.map((opt, i) => (
                    <button key={i} disabled={phase === 'selesai'} onClick={() => {setSelectedAnswer(opt); saveSession({selectedAnswer: opt});}}
                      className={`p-4 rounded-2xl border text-xs font-bold text-left flex gap-3 transition-all duration-300 ${selectedAnswer?.label === opt.label ? 'border-[#498FFF] bg-blue-50 shadow-md ring-4 ring-blue-100/20' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${selectedAnswer?.label === opt.label ? 'bg-[#498FFF] text-white' : 'bg-slate-100 text-slate-500'}`}>{opt.label}</span>
                      <span className={selectedAnswer?.label === opt.label ? 'text-blue-900' : 'text-slate-600'}>{opt.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <textarea value={input} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => setInput(e.target.value)} 
                  placeholder={aiSubMode === 'analisis' ? "Tempel soal TKA di sini..." : "Ketik jawaban kamu di sini..."}
                  className="flex-1 w-full text-sm bg-transparent outline-none resize-none placeholder:text-slate-200 min-h-[150px]"/>
              )}
            </div>

            <div className="p-5 flex flex-wrap gap-2.5 items-center justify-between bg-slate-50/50 border-t border-slate-100">
               <div className="flex items-center gap-2">
                  {aiSubMode === 'latihan' && phase === 'menjawab' && (
                    <>
                      <button onClick={() => setPhase('idle')} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-400 hover:text-red-400">Batal ↩</button>
                      {hintLevel < 3 && <button onClick={handleMintaHint} disabled={loadingHint} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-600 flex items-center gap-2 hover:bg-blue-50">{loadingHint ? <Loader2 size={12} className="animate-spin"/> : `Hint 💡 (${3-hintLevel})`}</button>}
                    </>
                  )}
               </div>
               <button onClick={aiSubMode === 'analisis' ? handleAnalisisSoal : handleKoreksiJawaban} 
                 disabled={loading || (!input.trim() && !selectedAnswer) || phase === 'selesai'}
                 className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${(!input.trim() && !selectedAnswer) ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-xl active:scale-95'}`}>
                 {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} {aiSubMode === 'analisis' ? 'Analisis' : 'Koreksi'}
               </button>
            </div>
          </>
        )}
      </div>

      {/* ERROR FEEDBACK */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[11px] font-bold flex justify-between items-center animate-fade shadow-sm">
          <div className="flex items-center gap-2"><XCircle size={16}/> {errorMsg}</div>
          <button onClick={() => handleMintaSoal()} className="bg-red-100 text-red-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-200">Retry 🔄</button>
        </div>
      )}
      
      {/* FINAL RESULTS AREA */}
      {result && (
        <div className="animate-fade space-y-4 pt-2">
          {scoreStatus && (
            <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 shadow-sm ${scoreStatus === 'correct' ? 'bg-green-50 border-green-200 text-green-700' : scoreStatus === 'partial' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="p-2 bg-white rounded-2xl shadow-sm">{scoreStatus === 'correct' ? <CheckCircle2 size={24}/> : <Zap size={24}/>}</div>
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase tracking-tight tracking-widest">{scoreStatus === 'correct' ? "Luar Biasa! 🎉" : scoreStatus === 'partial' ? "Sedikit Lagi! 💪" : "Ayo Belajar! 📚"}</span>
                <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-0.5">Analisis Qwen-3 tersedia di bawah</span>
              </div>
            </div>
          )}
          <div className="bg-white rounded-[2rem] p-7 border border-slate-200 shadow-sm relative group">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#FFBA49] uppercase tracking-[0.2em] mb-6"><Zap size={14} fill="currentColor"/> Pembahasan AI</div>
            <div className="text-[13px] text-slate-700 leading-[1.8] font-medium prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
          </div>
          <button onClick={() => { if(bulkQuestions.length > 1) setPhase('bulk_list'); else setPhase('idle'); }} 
            className="w-full py-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-xs font-black text-slate-400 flex items-center justify-center gap-3 hover:border-[#498FFF] hover:text-[#498FFF] transition-all group">
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500"/> {bulkQuestions.length > 1 ? "Kembali ke Koleksi" : "Soal Berikutnya"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LearnPage;
