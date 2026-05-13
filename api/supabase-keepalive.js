const PROJECTS = [
  {
    name: 'maintenanceai_public',
    url: 'https://muascqnlwwijmifsqdic.supabase.co',
    path: '/rest/v1/user_data?sync_key=eq.__maintenanceai_keepalive__&select=updated_at&limit=1',
    key: 'sb_publishable_2lHUemABajaLRmsE221E4Q_lyegGjkO',
    okStatuses: [200]
  },
  {
    name: 'maintenanceai_data',
    url: 'https://rhjssomlybvzjncekgbx.supabase.co',
    path: '/rest/v1/',
    okStatuses: [200, 401]
  }
];

async function pingProject(project) {
  const headers = project.key
    ? { apikey: project.key, Authorization: `Bearer ${project.key}` }
    : {};

  const response = await fetch(`${project.url}${project.path}`, { headers });
  const text = await response.text();
  const ok = project.okStatuses.includes(response.status);

  return {
    name: project.name,
    ok,
    status: response.status,
    detail: ok ? undefined : text.slice(0, 300)
  };
}

module.exports = async function handler(req, res) {
  try {
    const results = await Promise.all(PROJECTS.map(pingProject));
    const ok = results.every((result) => result.ok);

    res.status(ok ? 200 : 502).json({
      ok,
      checkedAt: new Date().toISOString(),
      results
    });
  } catch (error) {
    res.status(500).json({ ok: false, detail: error.message });
  }
};
