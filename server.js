// server.js (final, consistent)
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// --- Config ---
const PORT = process.env.PORT || 3000;
const ENV = (process.env.TRADOVATE_ENV || "demo").toLowerCase();
const BASE_URL =
  ENV === "live"
    ? "https://live.tradovateapi.com/v1"
    : "https://demo.tradovateapi.com/v1"; // demo or live

const CREDS = {
  name: process.env.TRADOVATE_USERNAME,
  password: process.env.TRADOVATE_PASSWORD,
  appId: process.env.TRADOVATE_APP_ID,
  appSecret: process.env.TRADOVATE_APP_SECRET
};

const ACCOUNT_ID = Number(process.env.TRADOVATE_ACCOUNT_ID);

// --- Auth cache ---
let accessToken = null;
let tokenExpiresAt = 0; // epoch ms

async function authenticate(force = false) {
  if (!force && accessToken && Date.now() < tokenExpiresAt - 15_000) return accessToken;

  const url = `${BASE_URL}/auth/accesstokenrequest`;
  const body = { ...CREDS };
  const { data } = await axios.post(url, body, { timeout: 15000 });

  // data: { accessToken, expiresIn (seconds), ... }
  accessToken = data.accessToken;
  tokenExpiresAt = Date.now() + (data?.expiresIn ? data.expiresIn * 1000 : 5 * 60 * 1000);
  console.log(`✅ Authenticated to Tradovate (${ENV})`);
  return accessToken;
}

async function tdRequest(method, path, payload) {
  try {
    const token = await authenticate();
    return await axios({
      method,
      url: `${BASE_URL}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
      timeout: 20000
    });
  } catch (err) {
    // If unauthorized, refresh once and retry
    if (err.response?.status === 401) {
      await authenticate(true);
      return axios({
        method,
        url: `${BASE_URL}${path}`,
        headers: { Authorization: `Bearer ${accessToken}` },
        data: payload,
        timeout: 20000
      });
    }
    throw err;
  }
}

// --- Place market order ---
async function placeMarketOrder(symbol, side, qty = 1) {
  // Normalize side from alert ("buy"/"sell" -> "Buy"/"Sell")
  const s = (side || "").toLowerCase();
  if (s === "flat") {
    // NOTE: Flattening is acknowledged but **not** executed here to keep
    // the app minimal & consistent. We can implement true flatten on request.
    console.log(`ℹ️ Received 'flat' for ${symbol}. (No-op placeholder)`);
    return { ok: true, note: "flat placeholder" };
  }
  if (s !== "buy" && s !== "sell") throw new Error(`Invalid side: ${side}`);

  const payload = {
    accountId: ACCOUNT_ID,
    action: s === "buy" ? "Buy" : "Sell",
    symbol,
    orderType: "Market",
    orderQty: Number(qty) || 1,
    timeInForce: "GTC"
  };

  const { data } = await tdRequest("post", "/order/placeorder", payload);
  console.log(`✅ Market ${payload.action} ${payload.orderQty} ${symbol}`, data?.orderId || "");
  return data;
}

// --- Routes ---
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    env: ENV,
    baseUrl: BASE_URL,
    accountId: ACCOUNT_ID || null
  });
});

app.post("/webhook", async (req, res) => {
  try {
    const { symbol, side, qty } = req.body || {};
    if (!symbol || !side) {
      return res.status(400).json({ ok: false, error: "Missing symbol or side" });
    }
    const result = await placeMarketOrder(symbol, side, qty);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: err.response?.data || err.message });
  }
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 tv-tradovate-bridge listening on ${PORT} (env=${ENV})`);
});
