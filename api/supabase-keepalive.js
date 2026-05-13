const SUPABASE_URL = 'https://muascqnlwwijmifsqdic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2lHUemABajaLRmsE221E4Q_lyegGjkO';

module.exports = async function handler(req, res) {
  try {
    const pingUrl = `${SUPABASE_URL}/rest/v1/user_data?sync_key=eq.__maintenanceai_keepalive__&select=updated_at&limit=1`;
    const response = await fetch(pingUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(response.status).json({ ok: false, detail });
      return;
    }

    res.status(200).json({ ok: true, checkedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ ok: false, detail: error.message });
  }
};
