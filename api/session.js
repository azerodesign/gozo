import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.NEON_DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS gozo_session (
      token VARCHAR(36) PRIMARY KEY,
      session_data JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const { token } = req.query;

  try {
    if (req.method === 'GET') {
      if (!token) return res.status(400).json({ error: 'Token required' });
      const rows = await sql`SELECT session_data FROM gozo_session WHERE token = ${token}`;
      return res.status(200).json(rows[0]?.session_data || null);
    }

    if (req.method === 'POST') {
      const { token: bodyToken, session_data } = req.body;
      if (!bodyToken) return res.status(400).json({ error: 'Token required' });
      
      await sql`
        INSERT INTO gozo_session (token, session_data, updated_at)
        VALUES (${bodyToken}, ${session_data}, NOW())
        ON CONFLICT (token) DO UPDATE 
        SET session_data = ${session_data}, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!token) return res.status(400).json({ error: 'Token required' });
      await sql`DELETE FROM gozo_session WHERE token = ${token}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}