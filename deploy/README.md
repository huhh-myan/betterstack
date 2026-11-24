# deploy/

Copies of the server configuration for the live site (bstack.daszeichen.xyz). The live files are
in `/etc`; these are copies so the setup is versioned. If you change one on the server, copy it
back here. Full walkthrough: `../hosting.md`.

| File here | Live location on the server |
|---|---|
| `caddy/Caddyfile` | `/etc/caddy/Caddyfile` |
| `systemd/bstack-*.service` | `/etc/systemd/system/` |
| `ssh/00-bstack-hardening.conf` | `/etc/ssh/sshd_config.d/` |
| `docker-services.sh` | (run once) creates the Postgres and Redis containers |

Not in git (secrets, stay on the server only): `/etc/bstack/pg_password`, and the `.env` files
in `apps/api`, `apps/worker`, `apps/pusher`, `packages/db-prisma`.
