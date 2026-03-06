#!/bin/bash
# Script setup awal server (jalankan sekali setelah VPS baru)
# Usage: bash scripts/server-setup.sh
set -e

echo "==> Installing Docker"
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "==> Installing Git"
apt-get update -y && apt-get install -y git

echo "==> Cloning repo"
mkdir -p /opt/sale
cd /opt/sale
# git clone <YOUR_REPO_URL> .  # Uncomment dan isi URL repo

echo "==> Setting up environment"
cp .env.example .env
echo ""
echo "PENTING: Edit /opt/sale/.env dengan nilai production yang benar!"
echo "  - POSTGRES_PASSWORD=<strong-password>"
echo "  - JWT_SECRET=<long-random-string>"
echo "  - CORS_ORIGIN=https://yourdomain.com"
echo "  - NEXT_PUBLIC_API_URL=https://yourdomain.com"
echo "  - NEXT_PUBLIC_SSE_URL=https://yourdomain.com/api/sse"

echo ""
echo "==> Setup complete. Setelah edit .env, jalankan:"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo "  docker compose -f docker-compose.prod.yml exec api pnpm db:migrate"
echo "  docker compose -f docker-compose.prod.yml exec api pnpm db:seed"
