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

function personalRecoveryBrowser() {
  document.title = '146 Main St | MaintenanceAI';
  const STORAGE_KEY = 'maintenanceai_v2';
  const SYNC_KEY = 'maintenanceai_sync_key';
  const LEGACY_API_KEY_STORAGE = 'maintenanceai_146main_supabase_key';
  const LEGACY_SB_URL = 'https://rhjssomlybvzjncekgbx.supabase.co';
  const LEGACY_TABLE = 'maintenanceai_data';

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

  function parsePastedJson(rawText) {
    let text = String(rawText || '').trim();
    if (!text) throw new Error('Paste the Supabase data JSON first.');
    const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
    if (text.toLowerCase().startsWith(fence + 'json')) text = text.slice(7).trim();
    if (text.startsWith(fence)) text = text.slice(3).trim();
    if (text.endsWith(fence)) text = text.slice(0, -3).trim();
    let parsed = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (parsed && parsed.data) parsed = parsed.data;
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  }

  function firstValue(source, keys) {
    for (const key of keys) {
      if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
    }
    return '';
  }

  function arrayValue(source, keys) {
    const value = firstValue(source, keys);
    return Array.isArray(value) ? value : [];
  }

  function normalizeLegacyData(rawData) {
    if (!rawData || typeof rawData !== 'object') throw new Error('The pasted value was not valid app data.');
    if (rawData.properties && Object.keys(rawData.properties).length) return rawData;

    const property = firstValue(rawData, ['PROPERTY', 'property', 'PROPERTY_INFO', 'propertyInfo', 'INFO', 'info']) || {};
    const address = firstValue(property, ['address', 'ADDRESS', 'property_address', 'PROPERTY_ADDRESS']) || firstValue(rawData, ['ADDRESS', 'address', 'property_address', 'PROPERTY_ADDRESS']) || '146 Main St';
    const info = {
      address: String(address || '146 Main St'),
      manager: String(firstValue(property, ['manager', 'MANAGER', 'propertyManager', 'PROPERTY_MANAGER']) || firstValue(rawData, ['MANAGER', 'manager']) || ''),
      phone: String(firstValue(property, ['phone', 'PHONE', 'manager_phone', 'MANAGER_PHONE']) || firstValue(rawData, ['PHONE', 'phone']) || ''),
      email: String(firstValue(property, ['email', 'EMAIL', 'manager_email', 'MANAGER_EMAIL']) || firstValue(rawData, ['EMAIL', 'email']) || ''),
      company: String(firstValue(property, ['company', 'COMPANY']) || firstValue(rawData, ['COMPANY', 'company']) || '')
    };

    const id = 'prop_146_main_restored';
    return {
      properties: {
        [id]: {
          info,
          tenants: arrayValue(rawData, ['TENANTS', 'tenants']),
          vendors: arrayValue(rawData, ['VENDORS', 'vendors']),
          workOrders: arrayValue(rawData, ['WORK_ORDERS', 'WORKORDERS', 'WORKORDERS_DATA', 'workOrders', 'work_orders']),
          pmTasks: arrayValue(rawData, ['PM_TASKS', 'PMTASKS', 'pmTasks', 'preventiveMaintenance', 'preventive_maintenance']),
          maintenanceHistory: arrayValue(rawData, ['MAINTENANCE_HISTORY', 'maintenanceHistory', 'history']),
          bidProjects: arrayValue(rawData, ['BID_PROJECTS', 'bidProjects', 'bids'])
        }
      },
      activePropertyId: id
    };
  }

  function describeData(data) {
    const normalized = normalizeLegacyData(data);
    return Object.values(normalized.properties).map(function(property) {
      const info = property.info || {};
      const tenantCount = (property.tenants || []).length;
      const workOrderCount = (property.workOrders || []).length;
      return escapeHtml((info.address || 'Unnamed property') + ' - ' + tenantCount + ' tenants, ' + workOrderCount + ' work orders');
    }).join(', ');
  }

  function installState(data, key) {
    const normalized = normalizeLegacyData(data);
    if (!normalized.properties || !Object.keys(normalized.properties).length) throw new Error('No properties were found in that data.');
    if (!normalized.activePropertyId || !normalized.properties[normalized.activePropertyId]) {
      normalized.activePropertyId = Object.keys(normalized.properties)[0];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(SYNC_KEY, key || '146main');
    return normalized;
  }

  async function fetchLegacyRow(rowKey, apiKey) {
    const url = LEGACY_SB_URL + '/rest/v1/' + LEGACY_TABLE + '?key=eq.' + encodeURIComponent(rowKey) + '&select=data&limit=1';
    const response = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: 'Bearer ' + apiKey
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('That Supabase API key did not allow access. Use the anon/public or publishable key from the maintenanceai_data project.');
    }
    if (!response.ok) throw new Error('Supabase returned an error while reading maintenanceai_data.');

    const rows = await response.json();
    if (!rows || !rows.length || !rows[0].data) throw new Error('No row was found for key ' + rowKey + '.');
    return rows[0].data;
  }

  function setResult(message, isError) {
    const result = document.getElementById('personal-recovery-result');
    if (!result) return;
    result.style.color = isError ? '#b91c1c' : '#15803d';
    result.innerHTML = message;
  }

  function insertRecoveryCard() {
    if (hasSavedData() || document.getElementById('personal-recovery-card')) return;
    const target = document.getElementById('ostep-body-0') || document.querySelector('.onboarding-body');
    if (!target) return;

    const savedLegacyKey = localStorage.getItem(LEGACY_API_KEY_STORAGE) || '';
    const card = document.createElement('div');
    card.id = 'personal-recovery-card';
    card.style.cssText = 'border:1px solid #93c5fd;background:#eff6ff;border-radius:12px;padding:14px;margin:0 0 16px;color:#1e3a8a';
    card.innerHTML = '<div style="font-size:14px;font-weight:800;color:#1e3a8a;margin-bottom:4px">Restore your 146 Main St app</div>' +
      '<div style="font-size:12px;line-height:1.5;color:#1d4ed8;margin-bottom:10px">Your old app saved directly to Supabase, not email sync. This reads project <strong>maintenanceai_data</strong>, table <strong>maintenanceai_data</strong>, row key <strong>146main</strong>.</div>' +
      '<input id="legacy-row-key" type="text" value="146main" placeholder="Supabase row key" style="width:100%;padding:10px 11px;font-size:13px;font-family:inherit;background:white;border:1px solid #93c5fd;border-radius:8px;color:#0f172a;margin-bottom:8px" />' +
      '<input id="legacy-api-key" type="password" value="' + escapeHtml(savedLegacyKey) + '" placeholder="Paste Supabase anon / publishable API key" style="width:100%;padding:10px 11px;font-size:13px;font-family:inherit;background:white;border:1px solid #93c5fd;border-radius:8px;color:#0f172a;margin-bottom:8px" />' +
      '<button id="legacy-fetch-button" style="width:100%;padding:10px 14px;font-size:13px;font-weight:700;font-family:inherit;background:#1d4ed8;color:white;border:none;border-radius:8px;cursor:pointer">Restore directly from Supabase</button>' +
      '<div style="height:1px;background:#bfdbfe;margin:12px 0"></div>' +
      '<div style="font-size:12px;line-height:1.5;color:#1d4ed8;margin-bottom:8px">Fallback: copy the value from the <strong>data</strong> cell for key <strong>146main</strong>, paste it here, then restore.</div>' +
      '<textarea id="personal-legacy-json" placeholder="Paste the Supabase data JSON here" style="width:100%;min-height:90px;padding:10px 11px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:white;border:1px solid #93c5fd;border-radius:8px;color:#0f172a;margin-bottom:8px"></textarea>' +
      '<button id="personal-legacy-button" style="width:100%;padding:10px 14px;font-size:13px;font-weight:700;font-family:inherit;background:#0f172a;color:white;border:none;border-radius:8px;cursor:pointer">Restore pasted 146main data</button>' +
      '<div id="personal-recovery-result" style="font-size:12px;line-height:1.5;margin-top:8px;color:#1d4ed8"></div>' +
      '<div style="font-size:11px;line-height:1.5;color:#475569;margin-top:10px;border-top:1px solid #bfdbfe;padding-top:9px">This writes the restored app data to this phone browser. It does not delete or edit the Supabase row.</div>';

    target.insertBefore(card, target.firstChild);

    document.getElementById('legacy-fetch-button').addEventListener('click', async function() {
      const button = document.getElementById('legacy-fetch-button');
      const rowKey = (document.getElementById('legacy-row-key').value || '146main').trim();
      const apiKey = (document.getElementById('legacy-api-key').value || '').trim();
      if (!apiKey) {
        setResult('Paste the anon/public or publishable API key from the maintenanceai_data Supabase project first.', true);
        return;
      }

      button.disabled = true;
      button.style.opacity = '.6';
      setResult('Reading the 146main row from Supabase...', false);
      try {
        localStorage.setItem(LEGACY_API_KEY_STORAGE, apiKey);
        const data = await fetchLegacyRow(rowKey, apiKey);
        const summary = describeData(data);
        if (!window.confirm('Restore this saved app data? ' + summary)) {
          setResult('Restore canceled. Nothing was changed.', true);
          return;
        }
        installState(data, rowKey);
        setResult('Restored. Reloading your app...', false);
        window.location.reload();
      } catch (error) {
        setResult(escapeHtml(error && error.message ? error.message : 'Could not restore from Supabase.'), true);
      } finally {
        button.disabled = false;
        button.style.opacity = '1';
      }
    });

    document.getElementById('personal-legacy-button').addEventListener('click', function() {
      const textarea = document.getElementById('personal-legacy-json');
      const rowKey = (document.getElementById('legacy-row-key').value || '146main').trim();
      try {
        const rawData = parsePastedJson(textarea.value);
        const summary = describeData(rawData);
        if (!window.confirm('Restore pasted data? ' + summary)) {
          setResult('Restore canceled. Nothing was changed.', true);
          return;
        }
        installState(rawData, rowKey);
        setResult('Restored. Reloading your app...', false);
        window.location.reload();
      } catch (error) {
        setResult(escapeHtml(error && error.message ? error.message : 'Could not read that pasted data.'), true);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(insertRecoveryCard, 350);
    setTimeout(insertRecoveryCard, 1200);
  });
}

function scriptTag(fn) {
  return `<script>(${fn.toString()})();</script>`;
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

    html = injectBeforeHeadClose(
      html,
      mode === 'public' ? scriptTag(publicStorageIsolationBrowser) : scriptTag(personalRecoveryBrowser)
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.status(response.ok ? 200 : 502).send(html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(502).send(`<!doctype html><html><head><title>MaintenanceAI</title></head><body><h1>MaintenanceAI is loading</h1><p>Please refresh in a moment.</p></body></html>`);
  }
};
