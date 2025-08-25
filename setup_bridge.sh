#!/bin/bash
# setup_bridge.sh - one-time VPS setup for trading-bot-server
set -e

echo "🚀 Setting up tv-tradovate-bridge..."

# System update
sudo apt-get update -y
sudo apt-get upgrade -y

# Node.js LTS (20.x)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# pm2
sudo npm install -g pm2

# Install deps
npm install

# Start with pm2
pm2 start server.js --name tv-tradovate-bridge
pm2 save
pm2 startup -u $USER --hp $HOME >/dev/null 2>&1 || true

echo "✅ Done. Service: tv-tradovate-bridge"
