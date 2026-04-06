// Token management
export const getToken = () => {
  let token = localStorage.getItem('gozo_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('gozo_token', token);
  }
  return token;
};

// History API
export const saveHistoryToDB = async (item) => {
  try {
    const token = getToken();
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, token })
    });
  } catch (e) {
    console.error("DB Save Error:", e);
  }
};

export const loadHistoryFromDB = async () => {
  try {
    const res = await fetch(`/api/history?token=${getToken()}`);
    if (!res.ok) throw new Error("DB Fetch failed");
    const data = await res.json();
    return data.map(row => ({
      ...row,
      soalStyle: row.soal_style,
      selectedAnswer: row.selected_answer,
      scoreStatus: row.score_status
    }));
  } catch (e) { 
    return null; 
  }
};

export const clearHistoryFromDB = async () => {
  try {
    await fetch(`/api/history?token=${getToken()}`, { method: 'DELETE' });
  } catch (e) {}
};

// Session API
export const saveSessionToDB = async (sessionData) => {
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getToken(), session_data: sessionData })
    });
  } catch (e) {}
};

export const loadSessionFromDB = async () => {
  try {
    const res = await fetch(`/api/session?token=${getToken()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
};

export const clearSessionFromDB = async () => {
  try {
    await fetch(`/api/session?token=${getToken()}`, { method: 'DELETE' });
  } catch (e) {}
};