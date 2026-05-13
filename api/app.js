const { readPersonalState } = require('./personal-state.js');

function publicStorageIsolationBrowser() {
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
}

function personalSaveOverrideBrowser() {
  document.title = '146 Main St | MaintenanceAI';

  function showPersonalConnectionError(message) {
    document.addEventListener('DOMContentLoaded', function() {
      const overlay = document.getElementById('onboarding-overlay');
      if (!overlay) return;
      overlay.style.display = 'flex';
      overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:560px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,sans-serif;color:#0f172a">' +
        '<div style="font-size:20px;font-weight:800;margin-bottom:6px">146 Main St data connection needed</div>' +
        '<div style="font-size:14px;line-height:1.55;color:#475569;margin-bottom:12px">This personal app is separate from the public app, but Vercel still needs the Supabase publishable key for your personal <strong>maintenanceai_data</strong> project before it can auto-load row <strong>146main</strong>.</div>' +
        '<div style="font-size:12px;line-height:1.5;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:10px">' + String(message || 'Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.').replace(/[&<>]/g, '') + '</div>' +
        '</div>';
    });
  }

  if (window.__maintenanceAiPersonalLoadError) {
    showPersonalConnectionError(window.__maintenanceAiPersonalLoadError);
    return;
  }

  window.addEventListener('load', function() {
    try {
      if (typeof getSyncKey === 'function') {
        window.getSyncKey = function() { return '146main'; };
      }
      if (typeof setSyncKey === 'function') {
        window.setSyncKey = function() { localStorage.setItem('maintenanceai_sync_key', '146main'); };
      }
      localStorage.setItem('maintenanceai_sync_key', '146main');

      window.syncToSupabase = async function() {
        if (typeof state === 'undefined') return;
        try {
          const response = await fetch('/api/personal-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
          });
          if (!response.ok) throw new Error(await response.text());
          if (typeof setSyncStatus === 'function') {
            setSyncStatus('saved', 'Saved to personal Supabase');
            setTimeout(function() { setSyncStatus('idle', ''); }, 2500);
          }
        } catch (error) {
          if (typeof setSyncStatus === 'function') setSyncStatus('error', 'Personal sync failed');
          console.error('Personal Supabase sync error:', error);
        }
      };
    } catch (error) {
      console.error('Personal app setup error:', error);
    }
  });
}

function scriptTag(fn) {
  return `<script>(${fn.toString()})();</script>`;
}

function personalStateScript(state) {
  const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
  return `<script>
(() => {
  try {
    const state = ${stateJson};
    localStorage.setItem('maintenanceai_v2', JSON.stringify(state));
    localStorage.setItem('maintenanceai_sync_key', '146main');
    document.title = '146 Main St | MaintenanceAI';
  } catch (error) {
    window.__maintenanceAiPersonalLoadError = 'Could not install 146 Main St data in this browser.';
  }
})();
</script>`;
}

function personalErrorScript(message) {
  const safeMessage = JSON.stringify(String(message || 'Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.'));
  return `<script>window.__maintenanceAiPersonalLoadError = ${safeMessage}; document.title = '146 Main St | MaintenanceAI';</script>`;
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
      html = injectBeforeHeadClose(html, scriptTag(publicStorageIsolationBrowser));
    } else {
      let stateScript;
      try {
        const personalState = await readPersonalState();
        stateScript = personalStateScript(personalState);
      } catch (error) {
        stateScript = personalErrorScript(error.message);
      }
      html = injectBeforeHeadClose(html, stateScript + '\n' + scriptTag(personalSaveOverrideBrowser));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.ok ? 200 : 502).send(html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(502).send(`<!doctype html><html><head><title>MaintenanceAI</title></head><body><h1>MaintenanceAI is loading</h1><p>Please refresh in a moment.</p></body></html>`);
  }
};
