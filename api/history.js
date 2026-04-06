import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.NEON_DATABASE_URL);
  
  // Inisialisasi Tabel
  await sql`
    CREATE TABLE IF NOT EXISTS gozo_history (
      id BIGINT PRIMARY KEY,
      token VARCHAR(36) NOT NULL,
      timestamp TEXT,
      mode TEXT,
      soal_style TEXT,
      question TEXT,
      options JSONB,
      selected_answer JSONB,
      concepts JSONB,
      score_status TEXT,
      result TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const { token } = req.query;

  try {
    if (req.method === 'GET') {
      if (!token) return res.status(400).json({ error: 'Token required' });
      const rows = await sql`
        SELECT * FROM gozo_history 
        WHERE token = ${token} 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const item = req.body;
      if (!item.token) return res.status(400).json({ error: 'Token required' });
      
      await sql`
        INSERT INTO gozo_history (
          id, token, timestamp, mode, soal_style, question, 
          options, selected_answer, concepts, score_status, result
        )
        VALUES (
          ${item.id}, ${item.token}, ${item.timestamp}, ${item.mode}, ${item.soalStyle}, 
          ${item.question}, ${item.options}, ${item.selectedAnswer}, 
          ${item.concepts}, ${item.scoreStatus}, ${item.result}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!token) return res.status(400).json({ error: 'Token required' });
      await sql`DELETE FROM gozo_history WHERE token = ${token}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}