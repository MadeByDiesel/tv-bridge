// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Env & Config ----
const BASE_URL = process.env.TRADOVATE_BASE_URL; // e.g. https://demo.tradovateapi.com
const CLIENT_ID = process.env.TRADOVATE_CLIENT_ID;
const CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET;
const USERNAME = process.env.TRADOVATE_USERNAME || '';   // optional
const PASSWORD = process.env.TRADOVATE_PASSWORD || '';   // optional
const APP_ID = process.env.TRADOVATE_APP_ID || 'tv-bridge';
const APP_VERSION = process.env.TRADOVATE_APP_VERSION || '1.0.0';
const ACCOUNT_ID = parseInt(process.env.TRADOVATE_ACCOUNT_ID || '0', 10);

// Basic validation on boot
if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET || !ACCOUNT_ID) {
  console.error('❌ Missing required env vars. Check .env file.');
  process.exit(1);
}

// Accept JSON or raw text (TV sometimes posts text)
app.use(express.json({ type: ['application/json', 'text/plain'] }));

// ---- Token cache ----
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt - now > 30_000) {
    return tokenCache.accessToken;
  }

  const url = `${BASE_URL}/v1/auth/accessToken`;
  const payload = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    appId: APP_ID,
    appVersion: APP_VERSION
  };
  // If you use user credentials with client creds, include them (Tradovate supports both flows)
  if (USERNAME && PASSWORD) {
    payload.name = USERNAME;
    payload.password = PASSWORD;
  }

  const { data } = await axios.post(url, payload, { timeout: 10_000 });
  if (!data || !data.accessToken || !data.expirationTime) {
    throw new Error('Bad token response from Tradovate');
  }

  tokenCache.accessToken = data.accessToken;
  tokenCache.expiresAt = new Date(data.expirationTime).getTime(); // server returns ISO date
  return tokenCache.accessToken;
}

// ---- Utils: normalize incoming webhook ----
function normalizeSignal(rawBody) {
  let payload = rawBody;

  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (_) {}
  }

  if (payload && typeof payload.message === 'string') {
    try {
      const inner = JSON.parse(payload.message);
      if (inner && typeof inner === 'object') payload = inner;
    } catch (_) {}
  }

  const symbol = String(payload.symbol || payload.ticker || '').trim().toUpperCase();
  const sideRaw = String(payload.side || payload.action || payload.signal || '').trim().toLowerCase();
  const qty = payload.qty != null ? Number(payload.qty) : null;

  const sideMap = {
    buy: 'buy', long: 'buy',
    sell: 'sell', short: 'sell',
    flat: 'flat', exit: 'flat', close: 'flat'
  };
  const side = sideMap[sideRaw] || null;

  if (!symbol || !side) {
    const err = new Error('Missing symbol or side');
    err.status = 400;
    throw err;
  }
  if ((side === 'buy' || side === 'sell') && (!Number.isFinite(qty) || qty <= 0)) {
    const err = new Error('Missing/invalid qty for buy/sell');
    err.status = 400;
    throw err;
  }

  return { symbol, side, qty: side === 'flat' ? 0 : Math.trunc(qty) };
}

// ---- Tradovate REST helpers ----
async function placeMarketOrder({ symbol, side, qty }) {
  const accessToken = await getAccessToken();

  // Tradovate expects Buy/Sell (capitalized)
  const action = side === 'buy' ? 'Buy' : 'Sell';

  const url = `${BASE_URL}/v1/order/placeOrder`;
  const body = {
    accountId: ACCOUNT_ID,
    action,
    symbol,            // Assumes symbol acceptable by your Tradovate setup
    orderQty: qty,
    orderType: 'Market',
  };

  const { data } = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10_000
  });

  return data;
}

async function getOpenNetPosition(symbol) {
  // Optional helper to implement FLAT by offsetting net position.
  // If you don’t need auto-flat from server, you can skip this.
  const accessToken = await getAccessToken();
  const url = `${BASE_URL}/v1/position/list`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10_000
  });

  // data is typically an array of positions; filter by symbol if provided
  const positions = Array.isArray(data) ? data : [];
  const p = positions.find(p => (p.symbol || '').toUpperCase() === symbol.toUpperCase());
  if (!p) return 0;

  // Tradovate returns netPos or netPosition fields depending on API version
  const net = Number(p.netPos ?? p.netPosition ?? 0);
  return Number.isFinite(net) ? net : 0;
}

async function closeToFlat(symbol) {
  // Query current net position, then offset with a market order
  const net = await getOpenNetPosition(symbol);
  if (net === 0) return { ok: true, info: 'Already flat' };
  const side = net > 0 ? 'sell' : 'buy';
  const qty = Math.abs(net);
  const result = await placeMarketOrder({ symbol, side, qty });
  return { ok: true, result };
}

// ---- Routes ----
app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'tv-bridge' });
});

app.post('/webhook', async (req, res) => {
  try {
    const signal = normalizeSignal(req.body);
    console.log('[Webhook]', new Date().toISOString(), signal);

    if (signal.side === 'flat') {
      const flatRes = await closeToFlat(signal.symbol);
      console.log('[Flat]', flatRes);
      return res.status(200).json({ ok: true, action: 'flat', detail: flatRes });
    }

    const apiRes = await placeMarketOrder(signal);
    console.log('[Order OK]', apiRes);
    res.status(200).json({ ok: true, placed: apiRes });
  } catch (e) {
    console.error('[Webhook Error]', e.response?.data || e.message);
    res.status(e.status || 500).json({ ok: false, error: e.response?.data || e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ tv-bridge listening on :${PORT}`);
  console.log(`   Webhook: http://0.0.0.0:${PORT}/webhook`);
});
