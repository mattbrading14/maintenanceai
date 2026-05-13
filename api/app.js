function publicStorageIsolationScript() {
  return `<script>
(() => {
  const prefix = 'maintenanceai_public::';
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalKey = Storage.prototype.key;
  const shouldNamespace = (key) => typeof key === 'string' && key.toLowerCase().includes('maintenanceai');
  const mapKey = (key) => shouldNamespace(key) ? prefix + key : key;

  Storage.prototype.getItem = function(key) {
    return originalGetItem.call(this, mapKey(key));
  };

  Storage.prototype.setItem = function(key, value) {
    return originalSetItem.call(this, mapKey(key), value);
  };

  Storage.prototype.removeItem = function(key) {
    return originalRemoveItem.call(this, mapKey(key));
  };

  Storage.prototype.key = function(index) {
    const value = originalKey.call(this, index);
    return typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : value;
  };
})();
</script>`;
}

function personalAppScript() {
  return `<script>
(() => {
  document.title = '146 Main St | MaintenanceAI';
  const STORAGE_KEY = 'maintenanceai_v2';
  const SYNC_KEY = 'maintenanceai_sync_key';
  const SB_URL = 'https://muascqnlwwijmifsqdic.supabase.co';
  const SB_KEY = 'sb_publishable_2lHUemABajaLRmsE221E4Q_lyegGjkO';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function(char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function hasSavedData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.properties && Object.keys(parsed.properties).length);
    } catch (error) {
      return false;
    }
  }

  function keyCandidates(raw) {
    const trimmed = String(raw || '').trim();
    const lower = trimmed.toLowerCase();
    return Array.from(new Set([trimmed, lower, trimmed.replace(/\\s+/g, '-'), lower.replace(/\\s+/g, '-')].filter(Boolean)));
  }

  async function loadCloudData(key) {
    const res = await fetch(SB_URL + '/rest/v1/user_data?sync_key=eq.' + encodeURIComponent(key) + '&select=data,updated_at', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    if (!res.ok) throw new Error('Could not reach cloud sync.');
    const rows = await res.json();
    if (rows && rows.length && rows[0].data) return rows[0].data;
    return null;
  }

  function describeData(data) {
    const properties = data && data.properties ? Object.values(data.properties) : [];
    return properties.map(function(property) {
      const info = property.info || {};
      return escapeHtml(info.address || 'Unnamed property');
    }).join(', ');
  }

  function insertRecoveryCard() {
    if (hasSavedData() || document.getElementById('personal-recovery-card')) return;
    const target = document.getElementById('ostep-body-0') || document.querySelector('.onboarding-body');
    if (!target) return;

    const card = document.createElement('div');
    card.id = 'personal-recovery-card';
    card.style.cssText = 'border:1px solid #93c5fd;background:#eff6ff;border-radius:12px;padding:14px;margin:0 0 16px;color:#1e3a8a';
    card.innerHTML = '<div style="font-size:14px;font-weight:800;color:#1e3a8a;margin-bottom:4px">Restore your 146 Main St app</div>' +
      '<div style="font-size:12px;line-height:1.5;color:#1d4ed8;margin-bottom:10px">If your data was synced, enter the email or sync key you used. This restores your existing data before you set anything up again.</div>' +
      '<input id="personal-recovery-key" type="email" placeholder="you@email.com" style="width:100%;padding:10px 11px;font-size:13px;font-family:inherit;background:white;border:1px solid #93c5fd;border-radius:8px;color:#0f172a;margin-bottom:8px" />' +
      '<button id="personal-recovery-button" style="width:100%;padding:10px 14px;font-size:13px;font-weight:700;font-family:inherit;background:#1d4ed8;color:white;border:none;border-radius:8px;cursor:pointer">Restore from cloud</button>' +
      '<div id="personal-recovery-result" style="font-size:12px;line-height:1.5;margin-top:8px;color:#1d4ed8"></div>' +
      '<div style="font-size:11px;line-height:1.5;color:#475569;margin-top:10px;border-top:1px solid #bfdbfe;padding-top:9px">If you never synced, open the old app recovery page on the same phone: <a href="https://mattbrading14.github.io/maintenanceai_public/recover-146-main.html" style="color:#1d4ed8;font-weight:700">old app recovery</a>.</div>';

    target.insertBefore(card, target.firstChild);

    document.getElementById('personal-recovery-button').addEventListener('click', async function() {
      const input = document.getElementById('personal-recovery-key');
      const result = document.getElementById('personal-recovery-result');
      const button = document.getElementById('personal-recovery-button');
      const candidates = keyCandidates(input.value);
      if (!candidates.length) {
        result.style.color = '#b91c1c';
        result.textContent = 'Enter the email or sync key first.';
        return;
      }
      button.disabled = true;
      button.style.opacity = '.6';
      result.style.color = '#1d4ed8';
      result.textContent = 'Looking for saved data...';
      try {
        let data = null;
        let matchedKey = null;
        for (const candidate of candidates) {
          data = await loadCloudData(candidate);
          if (data) { matchedKey = candidate; break; }
        }
        if (!data || !data.properties || !Object.keys(data.properties).length) {
          result.style.color = '#b91c1c';
          result.innerHTML = 'No cloud data found for that email/key. Try the old app recovery link below on your phone.';
          return;
        }
        const summary = describeData(data);
        if (!window.confirm('Restore saved data for: ' + summary + '?')) {
          result.textContent = 'Restore canceled. Nothing was changed.';
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(SYNC_KEY, matchedKey);
        result.style.color = '#15803d';
        result.textContent = 'Restored. Reloading your app...';
        window.location.reload();
      } catch (error) {
        result.style.color = '#b91c1c';
        result.textContent = 'Restore failed. Try the old app recovery link or tell Codex this happened.';
      } finally {
        button.disabled = false;
        button.style.opacity = '1';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(insertRecoveryCard, 350);
    setTimeout(insertRecoveryCard, 1200);
  });
})();
</script>`;
}

function injectBeforeHeadClose(html, script) {
  return html.includes('</head>')
    ? html.replace('</head>', `${script}\n</head>`)
    : `${script}\n${html}`;
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'maintenanceai-nblc.vercel.app'}`);
    const mode = url.searchParams.get('mode') || 'personal';
    const response = await fetch('https://mattbrading14.github.io/maintenanceai_public/');
    let html = await response.text();

    if (mode === 'public') {
      html = injectBeforeHeadClose(html, publicStorageIsolationScript());
    } else {
      html = injectBeforeHeadClose(html, personalAppScript());
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.status(response.ok ? 200 : 502).send(html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(502).send(`<!doctype html><html><head><title>MaintenanceAI</title></head><body><h1>MaintenanceAI is loading</h1><p>Please refresh in a moment.</p></body></html>`);
  }
};
