#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
docker compose -f infra/docker/docker-compose.lan.yml up -d --build
docker compose -f infra/docker/docker-compose.lan.yml ps
echo
echo "RentSafeAI: http://localhost"
echo "For LAN access, find this PC's IP with: hostname -I"
