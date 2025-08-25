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

cp .env.sample .env
npm install
npm start


curl http://localhost:3000/health

curl -sS http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{"symbol":"MNQ","side":"buy","qty":1}'
curl -sS http://localhost:3000/webhook -H 'Content-Type: application/json' -d '{"symbol":"MNQ","side":"flat"}'

bash setup_bridge.sh

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


dig +short tradovate.208junkremoval.com

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/tv-tradovate-bridge

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/tv-tradovate-bridge
server {
    listen 80;
    server_name tradovate.208junkremoval.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Websocket & headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Forward IP (useful if you log client IP)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/tv-tradovate-bridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d tradovate.208junkremoval.com
Choose redirect to HTTPS when prompted.

Certbot will update nginx to listen 443 ssl; and install the cert paths.

sudo certbot renew --dry-run

https://tradovate.208junkremoval.com/webhook

