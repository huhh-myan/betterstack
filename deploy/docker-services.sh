#!/usr/bin/env bash
# Postgres and Redis for bstack, as run on the live server (see hosting.md, step 2).
# Ports are bound to 127.0.0.1 on purpose: Docker bypasses ufw (P107).
set -euo pipefail

mkdir -p /etc/bstack && chmod 700 /etc/bstack
[ -f /etc/bstack/pg_password ] || openssl rand -hex 24 > /etc/bstack/pg_password
chmod 600 /etc/bstack/pg_password

docker volume create bstack-pg >/dev/null
docker volume create bstack-redis >/dev/null

docker run -d --name bstack-postgres --restart unless-stopped \
  -e POSTGRES_PASSWORD="$(cat /etc/bstack/pg_password)" -e POSTGRES_DB=bstack \
  -v bstack-pg:/var/lib/postgresql -p 127.0.0.1:5432:5432 postgres:18

docker run -d --name bstack-redis --restart unless-stopped \
  -v bstack-redis:/data -p 127.0.0.1:6379:6379 redis:8 redis-server --appendonly yes
