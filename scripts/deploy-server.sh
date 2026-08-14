#!/usr/bin/env bash
set -e

echo "========================================================"
echo "🚀 Starting Automated CI/CD Deployment"
echo "Target: RKU Technoplanet API (https://api.techno.rku.ac.in/)"
echo "Time: $(date)"
echo "========================================================"

# Navigate to application root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

echo "📂 Working directory: $(pwd)"

# Fetch & Pull latest code from GitHub
echo "📦 Fetching and pulling latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

# Install dependencies cleanly
echo "📥 Installing NPM dependencies..."
npm ci

# Prisma Client Generation & Database Migration
echo "🗄️ Generating Prisma client and applying database migrations..."
npx prisma generate
npx prisma migrate deploy

# Restart Process Manager (PM2 / Docker / Node)
if command -v pm2 &> /dev/null; then
  echo "🔄 Reloading PM2 process..."
  pm2 reload rku-backend || pm2 start src/server.js --name rku-backend
  pm2 save
  echo "✅ PM2 process restarted successfully!"
elif command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
  echo "🐳 Rebuilding Docker container stack..."
  docker compose up -d --build
  echo "✅ Docker containers updated successfully!"
else
  echo "⚠️ PM2 or Docker not detected. Please restart server process manually or install PM2."
fi

echo "========================================================"
echo "🎉 Deployment Complete!"
echo "========================================================"
