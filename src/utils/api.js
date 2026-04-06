const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Qwen3.6-plus via OpenRouter - Untuk tugas kreatif (soal & hint)
 */
export const callQwen = async (messages, systemPrompt) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-plus:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    return null;
  }
};

/**
 * GPT OSS 120B via Groq - Untuk tugas berat (analisis & koreksi)
 */
export const callGPT = async (messages, systemPrompt) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    return null;
  }
};

/**
 * Render Markdown ke HTML (Support: Bold, Italic, List, Table, Heading, LaTeX)
 */
export const renderMarkdown = (text) => {
  if (!text) return '';

  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-5 space-y-1 my-2">$1</ul>')
    // Heading Handlers
    .replace(/^#### (.+)/gm, '<h4 class="text-sm font-black text-slate-800 mt-4 mb-1">$1</h4>')
    .replace(/^### (.+)/gm, '<h3 class="text-base font-black text-slate-800 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)/gm, '<h2 class="text-lg font-black text-slate-800 mt-6 mb-2">$1</h2>')
    // LaTeX Block Handler
    .replace(/\\\[([\s\S]*?)\\\]/g, '<div class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 my-3 font-mono text-xs text-slate-700 overflow-x-auto">$1</div>')
    // LaTeX Inline Handler
    .replace(/\\\(([\s\S]*?)\\\)/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">$1</code>');

  // Table Processor
  const lines = html.split('\n');
  let tableHtml = '';
  let inTable = false;
  let hasHeader = false;
  let finalLines = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isRow = trimmed.startsWith('|') && trimmed.endsWith('|');
    const isSeparator = isRow && trimmed.match(/^\|[:\s-]*\|/);

    if (isRow && !isSeparator) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<div class="overflow-x-auto"><table class="w-full text-[10px] border-collapse my-2">';
        hasHeader = false;
      }
      
      const actualCells = trimmed.slice(1, -1).split('|'); 

      tableHtml += '<tr>';
      actualCells.forEach(cell => {
        if (!hasHeader) {
          tableHtml += `<th class="border border-slate-200 bg-slate-50 p-1.5 text-left font-bold">${cell.trim()}</th>`;
        } else {
          tableHtml += `<td class="border border-slate-200 p-1.5">${cell.trim()}</td>`;
        }
      });
      tableHtml += '</tr>';
      hasHeader = true;
    } else if (isSeparator) {
      // Skip separator lines
    } else {
      if (inTable) {
        tableHtml += '</table></div>';
        finalLines.push(tableHtml);
        tableHtml = '';
        inTable = false;
      }
      finalLines.push(line);
    }
  });

  if (inTable) {
    tableHtml += '</table></div>';
    finalLines.push(tableHtml);
  }

  return finalLines.join('<br/>');
};

/**
 * Ekstrak status [CORRECT], [PARTIAL], [WRONG] dari baris pertama
 */
export const parseScoreStatus = (text) => {
  if (!text) return { status: null, cleanText: '' };
  
  const lines = text.split('\n');
  const firstLine = lines[0].trim().toUpperCase();
  let status = null;

  if (firstLine.includes('CORRECT')) status = 'correct';
  else if (firstLine.includes('PARTIAL')) status = 'partial';
  else if (firstLine.includes('WRONG')) status = 'wrong';

  const cleanText = status ? lines.slice(1).join('\n').trim() : text;
  
  return { status, cleanText };
};