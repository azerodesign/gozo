
import React, { useState, useEffect } from 'react';
import { 
  Send, Target, RefreshCcw, Sparkles, Search, XCircle, CheckCircle2, 
  Lightbulb, RotateCcw, Zap, Copy, Check, Loader2 
} from 'lucide-react';
import { callQwen, callGPT, renderMarkdown, parseScoreStatus } from '../utils/api';
import { saveHistoryToDB, saveSessionToDB, loadSessionFromDB, clearSessionFromDB } from '../utils/db';

const LearnPage = ({ mode, setMode }) => {
  // --- States ---
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

  // --- 1. LOAD SESSION (DB + Local Fallback) ---
  useEffect(() => {
    const initSession = async () => {
      try {
        // Coba load dari DB dulu
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
    // Save to Local for speed
    localStorage.setItem('gozo_active_session', JSON.stringify(sessionData));
    // Save to DB (Fire-and-forget)
    saveSessionToDB(sessionData);
  };

  const selectOption = (opt) => {
    if (phase === 'selesai') return;
    setSelectedAnswer(opt);
    saveSession({ selectedAnswer: opt });
  };

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

  const handleMintaSoal = async () => {
    localStorage.removeItem('gozo_active_session');
    clearSessionFromDB(); // Async clear

    setLoadingStep('connecting');
    setPhase('idle');
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

    const timerInterval = setInterval(() => setLoadingTimer(prev => prev + 1), 100);
    await new Promise(r => setTimeout(r, 600));
    
    setLoadingStep('generating');
    let system = `Kamu Gozo AI. Buat 1 soal TKA ${mode.toUpperCase()} level SMP kelas 9 yang ${soalStyle === 'challenging' ? 'menantang' : 'realistis'}. Tampilkan soal saja, jangan bocorkan jawaban. Sertakan pilihan A-E.`;
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

      const conceptSystem = "Sebutkan 1-3 konsep topik soal ini dalam format JSON: {concepts: []}.";
      callQwen([{ role: 'user', content: cleanQuestion }], conceptSystem).then(res => {
        if (res) {
          try {
            const parsed = JSON.parse(res.replace(/```json|```/g, '').trim());
            const detected = parsed.concepts || [];
            setConcepts(detected);
            saveSession({ currentQuestion: cleanQuestion, parsedOptions: options, concepts: detected, phase: 'menjawab' });
          } catch (e) { setConcepts([]); }
        }
      });

      saveSession({ currentQuestion: cleanQuestion, parsedOptions: options, concepts: [], phase: 'menjawab', hints: [], hintLevel: 0, scoreStatus: null, result: '', mode, soalStyle, selectedAnswer: null });
    } else {
      clearInterval(timerInterval); 
      setLoadingStep(null);
      setErrorMsg("Gagal generate soal. Coba lagi.");
    }
  };

  const handleKoreksiJawaban = async () => {
    const finalAnswer = selectedAnswer ? `Jawaban saya: ${selectedAnswer.label}. ${selectedAnswer.text}` : input;
    if (!finalAnswer.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    const system = "Kamu Gozo AI. Di baris PERTAMA tulis salah satu: [CORRECT], [PARTIAL], atau [WRONG]. Berikan pembahasan lengkap kelas 9. Format Markdown.";
    const res = await callGPT([{ role: 'user', content: finalAnswer }], system);

    if (res) {
      const { status, cleanText } = parseScoreStatus(res);
      setScoreStatus(status);
      setResult(cleanText);
      if (status) setSessionStats(prev => ({ ...prev, [status]: prev[status] + 1, total: prev.total + 1 }));
      setPhase('selesai');
      saveSession({ scoreStatus: status, result: cleanText, phase: 'selesai' });

      // Save History to DB
      saveHistoryToDB({
        id: Date.now(),
        timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        mode, soalStyle, question: currentQuestion, options: parsedOptions,
        selectedAnswer, concepts, scoreStatus: status, result: cleanText
      });
    } else { setErrorMsg("Analisis gagal."); }
    setLoading(false);
  };

  // Rendering logic skipped for brevity, same as previous revised JSX...
  return (
    <div className="animate-fade space-y-4 pb-10">
        {/* Same UI structure as before */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
            {phase === 'idle' ? (
                <button onClick={handleMintaSoal} className="w-full py-4 bg-[#498FFF] text-white rounded-xl font-black uppercase">Minta Soal</button>
            ) : (
                <div>
                   {/* Main Question & Interaction */}
                   <div className="text-sm font-bold mb-4">{currentQuestion}</div>
                   {parsedOptions.map(o => (
                       <button key={o.label} onClick={() => selectOption(o)} className={`block w-full p-3 mb-2 rounded-xl border ${selectedAnswer?.label === o.label ? 'border-[#498FFF] bg-blue-50' : 'border-slate-100'}`}>
                           {o.label}. {o.text}
                       </button>
                   ))}
                   <button onClick={handleKoreksiJawaban} disabled={loading} className="mt-4 w-full py-3 bg-[#498FFF] text-white rounded-xl flex items-center justify-center gap-2">
                       {loading ? <Loader2 className="animate-spin" /> : <Send size={16} />} Koreksi
                   </button>
                </div>
            )}
        </div>
        {result && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade">
                <div className="font-black text-[#FFBA49] mb-4 flex items-center gap-2"><Zap size={16} fill="currentColor"/> Pembahasan</div>
                <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
            </div>
        )}
    </div>
  );
};

export default LearnPage;
