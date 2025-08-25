# trading-bot-server

Bridge for **TradingView → Tradovate** market orders.

## Webhook Payload (from TradingView)

- Buy: `{"symbol":"MNQ","side":"buy","qty":1}`
- Sell: `{"symbol":"MNQ","side":"sell","qty":1}`
- Flat: `{"symbol":"MNQ","side":"flat"}`

> **Convention:** `side` is lowercase. `qty` is only present for buy/sell. Strategy sets the size.

## Configure

1. Copy `.env.sample` to `.env` and fill values.
   - Choose **one** base URL:
     - Demo: `https://demo.tradovateapi.com`
     - Live: `https://live.tradovateapi.com`
2. Ensure `TRADOVATE_ACCOUNT_ID` is your account id.

## Run (local)

```bash
cp .env.sample .env
npm install
npm start


curl http://localhost:3000/health

curl -sS http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{"symbol":"MNQ","side":"buy","qty":1}'
curl -sS http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{"symbol":"MNQ","side":"flat"}'

bash setup_bridge.sh
