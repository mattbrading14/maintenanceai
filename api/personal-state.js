const PERSONAL_SUPABASE_URL = 'https://rhjssomlybvzjncekgbx.supabase.co';
const PERSONAL_TABLE = 'maintenanceai_data';
const PERSONAL_ROW_KEY = '146main';

function getPersonalSupabaseKey() {
  return process.env.MAINTENANCEAI_DATA_SUPABASE_KEY ||
    process.env.MAINTENANCEAI_DATA_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PERSONAL_KEY ||
    '';
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

function normalizePersonalData(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Personal Supabase row did not contain valid app data.');
  }

  if (rawData.properties && Object.keys(rawData.properties).length) {
    if (!rawData.activePropertyId || !rawData.properties[rawData.activePropertyId]) {
      rawData.activePropertyId = Object.keys(rawData.properties)[0];
    }
    return rawData;
  }

  const property = firstValue(rawData, ['PROPERTY', 'property', 'PROPERTY_INFO', 'propertyInfo', 'INFO', 'info']) || {};
  const address = firstValue(property, ['address', 'ADDRESS', 'property_address', 'PROPERTY_ADDRESS']) ||
    firstValue(rawData, ['ADDRESS', 'address', 'property_address', 'PROPERTY_ADDRESS']) ||
    '146 Main St';

  const id = 'prop_146_main_restored';
  return {
    properties: {
      [id]: {
        info: {
          address: String(address || '146 Main St'),
          manager: String(firstValue(property, ['manager', 'MANAGER', 'propertyManager', 'PROPERTY_MANAGER']) || firstValue(rawData, ['MANAGER', 'manager']) || ''),
          phone: String(firstValue(property, ['phone', 'PHONE', 'manager_phone', 'MANAGER_PHONE']) || firstValue(rawData, ['PHONE', 'phone']) || ''),
          email: String(firstValue(property, ['email', 'EMAIL', 'manager_email', 'MANAGER_EMAIL']) || firstValue(rawData, ['EMAIL', 'email']) || ''),
          company: String(firstValue(property, ['company', 'COMPANY']) || firstValue(rawData, ['COMPANY', 'company']) || '')
        },
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

async function readPersonalState() {
  const key = getPersonalSupabaseKey();
  if (!key) {
    const error = new Error('Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${PERSONAL_SUPABASE_URL}/rest/v1/${PERSONAL_TABLE}?key=eq.${encodeURIComponent(PERSONAL_ROW_KEY)}&select=data&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text.slice(0, 300) || 'Could not read personal Supabase row.');
    error.statusCode = response.status;
    throw error;
  }

  const rows = await response.json();
  if (!rows || !rows.length || !rows[0].data) {
    const error = new Error('No 146main row found in maintenanceai_data.');
    error.statusCode = 404;
    throw error;
  }

  return normalizePersonalData(rows[0].data);
}

async function savePersonalState(state) {
  const key = getPersonalSupabaseKey();
  if (!key) {
    const error = new Error('Missing MAINTENANCEAI_DATA_SUPABASE_KEY in Vercel.');
    error.statusCode = 503;
    throw error;
  }

  const normalized = normalizePersonalData(state);
  const response = await fetch(`${PERSONAL_SUPABASE_URL}/rest/v1/${PERSONAL_TABLE}?key=eq.${encodeURIComponent(PERSONAL_ROW_KEY)}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ data: normalized })
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text.slice(0, 300) || 'Could not save personal Supabase row.');
    error.statusCode = response.status;
    throw error;
  }

  return normalized;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const state = await readPersonalState();
      res.status(200).json({ ok: true, rowKey: PERSONAL_ROW_KEY, state });
      return;
    }

    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
      const state = await savePersonalState(body.state || body.data || body);
      res.status(200).json({ ok: true, rowKey: PERSONAL_ROW_KEY, state });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
};

module.exports.readPersonalState = readPersonalState;
module.exports.normalizePersonalData = normalizePersonalData;
