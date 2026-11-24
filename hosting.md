# Hosting bstack on one Vultr instance

A log of every step taken to put bstack on the internet so friends can try it. Each step says
what was done, why, and how to check it worked.

## The setup

One Vultr instance runs everything:

| Part | How it runs | Reachable from |
|---|---|---|
| Postgres | Docker container, port bound to `127.0.0.1:5432` | the server only |
| Redis | Docker container, port bound to `127.0.0.1:6379` | the server only |
| API (`apps/api`) | Bun, systemd service, port 3000 | the server only |
| Worker (`apps/worker`) | Bun, systemd service | (no port) |
| Pusher (`apps/pusher`) | Bun, systemd service | (no port) |
| Web (`apps/web`) | `next start`, systemd service, port 3001 | the server only |
| Caddy | system package | the internet, ports 80 and 443 (HTTPS) |

Why this shape: the code connects to Postgres and Redis on `localhost` (`packages/redis` calls
`createClient()` with no URL), so running the apps directly on the server with the databases in
Docker on localhost needs no code changes. Only Caddy faces the internet; it gets an HTTPS
certificate for the domain automatically and forwards requests to the web app, which forwards
`/api/*` to the API (`apps/web/next.config.js`).

Server: Vultr Cloud Compute, Ubuntu, IP `107.191.40.90`.
Domain: `bstack.daszeichen.xyz` (Namecheap A record → `107.191.40.90`; checked with
`nslookup bstack.daszeichen.xyz 1.1.1.1`, which returns that IP).

---

## Step 0: SSH key and DNS

**Done by me (the owner):**
- Created a key pair with `ssh-keygen -t ed25519`. It was saved in the repo root by accident
  (a bare filename is saved in the current folder) and moved to `~/.ssh/claude-ssh` and
  `~/.ssh/claude-ssh.pub` before anything was committed. See P105 in the learning log.
- Added the public key (`claude-ssh.pub`) to Vultr under Account → SSH Keys.
- Added an A record at Namecheap pointing the domain at `107.191.40.90`.

**Problem hit: `Permission denied (publickey,password)`.**
- `ssh -v` showed the right key being offered, without a passphrase, and the server refusing it.
- Cause: Vultr copies account SSH keys into a server only when the server is *created*. The key
  was added to the account after this instance was deployed (or not ticked on the deploy
  page), so the server's `/root/.ssh/authorized_keys` doesn't contain it.
- Fix: log in once with the root password Vultr shows on the instance's Overview page, and
  append the public key to `authorized_keys` (command below). After that, key login works and
  password login can be turned off.

**Done:** ran the command below in my own terminal (it needs the root password, which only I have):

```bash
cat ~/.ssh/claude-ssh.pub | ssh root@107.191.40.90 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

- `cat` prints the **public** key; `|` feeds that text into `ssh`, which logs in with the password
  and runs the quoted command on the server, where `cat >> ~/.ssh/authorized_keys` appends it.
- The `chmod`s don't grant access, the line in `authorized_keys` does. They're required because
  SSH ignores `authorized_keys` if it or `~/.ssh` could be changed by other users (otherwise
  someone else could plant their own key).
- Check: `ssh -i ~/.ssh/claude-ssh root@107.191.40.90` logs in without a password.

**What the server is:** Ubuntu 26.10, 1 CPU, 1.6 GB RAM, 23 GB disk (16 GB free). Only `git` and
`ufw` were installed.

---

## Step 1: Updates, swap, firewall

```bash
apt-get update && apt-get upgrade -y

# only if `swapon --show` lists no /swapfile (it already existed here, so this was skipped):
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

**Updates:** install security fixes before putting the server on the internet.

**Swap (2 GB):**
- *What it is:* disk space the OS uses as overflow RAM. When memory runs short, Linux moves
  pages nobody is using right now onto disk, freeing real RAM for what's active.
- *Why here:* the server has 1.6 GB of RAM. `next build` alone can need more than that, on top
  of Postgres, Redis, the API, worker and pusher. Without swap, when RAM runs out Linux's **OOM
  killer** ("out of memory") kills a process, usually the biggest, and you'd just see `Killed`.
  With swap, the server slows down briefly instead.
- *Trade-off:* disk is much slower than RAM. Swap is a safety net for short peaks like the
  build, not extra RAM. If the server swaps constantly, it needs a bigger plan.
- *What actually happened:* Vultr's Ubuntu image had already created a 2.3 GB `/swapfile` on
  first boot (file dated one minute after boot, `/etc/fstab` line 12 already present). The
  script checks first, so it created nothing. The commands are kept for a server without swap.
- *The commands:* `fallocate` makes an empty 2 GB file; `chmod 600` so only root can read it
  (swapped-out memory can contain secrets); `mkswap` formats it as swap; `swapon` starts using
  it; the `/etc/fstab` line turns it on again after every reboot.
- Check: `swapon --show` lists `/swapfile`; `free -h` shows `Swap: 2.3Gi`.

**Firewall (ufw):** blocks every incoming connection except SSH (22), HTTP (80) and HTTPS (443).
SSH is allowed *before* enabling, or the firewall would cut off the session that turned it on.
- Check: `ufw status` lists exactly those three (plus their IPv6 copies).
- **Gotcha: Docker bypasses ufw.** A container port published as `-p 5432:5432` is reachable
  from the internet even with ufw on, because Docker writes its own firewall rules. That's why
  step 2 publishes ports as `127.0.0.1:5432:5432`, which only listens on the server itself.

---

## Step 2: Docker, Postgres, Redis

```bash
apt-get install -y docker.io
systemctl enable --now docker

mkdir -p /etc/bstack && chmod 700 /etc/bstack
openssl rand -hex 24 > /etc/bstack/pg_password
chmod 600 /etc/bstack/*

docker volume create bstack-pg
docker volume create bstack-redis

docker run -d --name bstack-postgres --restart unless-stopped \
  -e POSTGRES_PASSWORD="$(cat /etc/bstack/pg_password)" -e POSTGRES_DB=bstack \
  -v bstack-pg:/var/lib/postgresql -p 127.0.0.1:5432:5432 postgres:18

docker run -d --name bstack-redis --restart unless-stopped \
  -v bstack-redis:/data -p 127.0.0.1:6379:6379 redis:8 redis-server --appendonly yes
```

- `docker.io` is Ubuntu's own Docker package; `enable --now` starts it and starts it on every boot.
- **Postgres password:** a random 48-character password, generated on the server and stored in
  `/etc/bstack/pg_password` (only root can read it). It never leaves the server and isn't in git.
- **Named volumes** (`bstack-pg`, `bstack-redis`): the data lives outside the containers, so
  removing or upgrading a container keeps the database. Postgres 18 images keep data under
  `/var/lib/postgresql`, so that's what is mounted.
- `--restart unless-stopped`: Docker restarts them after a crash or a reboot.
- `-p 127.0.0.1:…`: reachable only from the server itself (see the Docker/ufw gotcha above).
- **Redis `--appendonly yes`:** writes every change to a log on disk (AOF), so a restart doesn't
  lose the stream and the consumer groups (see P104).
- **Redis has no password.** `packages/redis` calls `createClient()` with no URL, so it couldn't
  send one. That's acceptable only because Redis listens on `127.0.0.1`. Adding a password needs
  `REDIS_URL` support in the code (TODO on `main`). A password file was generated by mistake and
  removed.
- Check: `docker ps` shows both `Up` with `127.0.0.1:` ports; `docker exec bstack-postgres
  pg_isready -U postgres` says "accepting connections"; `docker exec bstack-redis redis-cli ping`
  says `PONG`.

---

## Step 3: Bun, a service user, the code, the database schema

```bash
apt-get install -y unzip
curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v1.3.14"

useradd --system --create-home --shell /usr/sbin/nologin bstack
mkdir -p /opt/bstack && chown bstack:bstack /opt/bstack
```

- **Bun 1.3.14**, the version pinned in the root `package.json` (`devEngines`). `BUN_INSTALL=/usr/local`
  puts the binary at `/usr/local/bin/bun`, usable by every user (the default is root's home).
- **`bstack` user:** the apps run as this user, not root. If an app is ever exploited, the attacker
  gets a user that can't log in (`nologin`), can't use sudo, and owns nothing but `/opt/bstack`.

**Copying the code** (from my machine, in the repo root):

```bash
tar --exclude=node_modules --exclude=.next --exclude=.turbo --exclude='.env' --exclude='.env.*' \
    --exclude=.git --exclude=tolearn --exclude=learning --exclude=claude_tests --exclude=hosting.md \
    -czf - . | ssh -i ~/.ssh/claude-ssh root@107.191.40.90 \
    'tar -xzf - -C /opt/bstack && chown -R bstack:bstack /opt/bstack'
```

- This copies the **working tree as it is on my machine**, uncommitted changes included (the
  backend endpoints and the frontend changes weren't committed yet). It is *not* a git checkout.
  To deploy a specific commit later, push and `git clone`/`git pull` on the server instead.
- Excluded: `node_modules` (installed fresh on the server for Linux), build output, `.git`,
  notes, and **every `.env`** so local secrets never reach the server. 4.4 MB copied.

```bash
cd /opt/bstack && sudo -u bstack -H bun install --frozen-lockfile
```

- `--frozen-lockfile`: install exactly what `bun.lock` says and fail if it doesn't match, so the
  server runs the same versions as my machine. 1,664 packages.

**`.env` files** (`apps/api`, `apps/worker`, `apps/pusher`, `packages/db-prisma`), each:

```
DATABASE_URL="postgresql://postgres:<contents of /etc/bstack/pg_password>@127.0.0.1:5432/bstack"
```

- Owned by `bstack`, `chmod 600` (only that user can read them).
- Each app loads `.env` from the folder it runs in (`dotenv/config` reads the current directory),
  which is why every app folder has its own copy.
- `JWT_SECRET` isn't set: the code doesn't read it yet (the secret is hardcoded, TODO on `main`).

**Schema:**

```bash
cd /opt/bstack/packages/db-prisma && sudo -u bstack -H bun prisma db init --yes
```

- Prisma 8's `db init` creates everything the contract declares on an empty database: the four
  tables, the unique username, indexes and foreign keys. `Region.id` got its autoincrement
  default (`nextval('"Region_id_seq"')`).
- Check: `docker exec bstack-postgres psql -U postgres -d bstack -c '\dt'` lists `Region`,
  `User`, `Website`, `WebsiteTicks`.

**Region and consumer group:**

```bash
curl -s http://169.254.169.254/v1.json   # Vultr metadata: "region":{"countrycode":"US","regioncode":"EWR"}
docker exec bstack-postgres psql -U postgres -d bstack -c "insert into \"Region\" (name) values ('new-jersey');"
docker exec bstack-redis redis-cli XGROUP CREATE bstack:website 1 '$' MKSTREAM
```

- The server is in **New Jersey** (Vultr `EWR`, Newark), so region 1 is named `new-jersey`.
  `169.254.169.254` is Vultr's metadata service, reachable only from inside the instance.
- The worker hardcodes region 1 and consumer group `"1"`, so both must exist before it runs.
  The group is created before the pusher's first push (`$` = only messages added from now on).

---

## Step 4: Build the web app

```bash
cd /opt/bstack/apps/web && sudo -u bstack -H env NEXT_TELEMETRY_DISABLED=1 bun run build
```

- `next build` compiles the app for production into `.next/`; `next start` (step 5) serves that
  build. `next dev` (what runs locally) is slower and not meant to face users.
- Took ~25 s; RAM peaked high enough to use ~120 MB of swap (step 1 paying off).
- `NEXT_TELEMETRY_DISABLED=1` stops Next.js sending anonymous usage data to Vercel.
- `/api/*` → `http://localhost:3000` comes from `next.config.js` (`API_URL` unset = default).

---

## Step 5: systemd services

Four unit files, `/etc/systemd/system/bstack-{api,worker,pusher,web}.service`. The API one:

```ini
[Unit]
Description=bstack API (Express, port 3000)
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
User=bstack
Group=bstack
WorkingDirectory=/opt/bstack/apps/api
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/local/bin/bun index.ts
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

The others differ only in `WorkingDirectory` and `ExecStart`:

| Service | WorkingDirectory | ExecStart |
|---|---|---|
| `bstack-worker` | `apps/worker` | `bun index.ts` |
| `bstack-pusher` | `apps/pusher` | `bun index.ts` |
| `bstack-web` | `apps/web` | `bun run start -- --hostname 127.0.0.1` (port 3001 from the `start` script) |

```bash
systemctl daemon-reload
systemctl enable --now bstack-api bstack-worker bstack-pusher bstack-web
```

- **systemd** is Linux's service manager. It starts these at boot (`WantedBy=multi-user.target`
  + `enable`), restarts them 5 s after a crash (`Restart=always`), and collects their output
  (`journalctl`). It replaces the four terminals used locally.
- `After=`/`Requires=docker.service`: start only after Docker, so Postgres and Redis can come up.
  (Docker starts the containers itself, `--restart unless-stopped`; a few failed connections at
  boot are retried by `Restart=always`.)
- `WorkingDirectory` matters: it's where each app's `.env` is read from.
- Hardening: `NoNewPrivileges` (can't gain privileges, e.g. via sudo), `PrivateTmp` (own `/tmp`),
  `ProtectSystem=full` (`/usr`, `/boot`, `/etc` read-only for the service).
- Check: `systemctl is-active bstack-api bstack-worker bstack-pusher bstack-web` prints four
  `active`; `ss -tlnp` shows the web app on `127.0.0.1:3001` and the API on `*:3000`.
- The API listens on every interface (Express's default), but ufw blocks port 3000 from outside
  (the API isn't in Docker, so ufw does apply). Checked from my machine: port 3000 times out.

---

## Step 6: Caddy and HTTPS

```bash
apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
bstack.daszeichen.xyz {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3001
}
```

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
```

- **Reverse proxy:** Caddy is the only thing listening on ports 80/443. It takes each request for
  the domain and passes it to the web app on `127.0.0.1:3001`; the web app passes `/api/*` on to
  the API. So: browser → Caddy (HTTPS) → Next.js → Express.
- **Why Caddy and not nginx:** both are reverse proxies and either works. Caddy gets and renews
  the HTTPS certificate by itself from one line (the domain name); with nginx that's a separate
  tool (certbot) plus a renewal timer. Only one is needed: it's the single front door, and the
  "two ports" (3000, 3001) are internal: Caddy only talks to 3001, and Next.js talks to 3000.
- **Automatic HTTPS:** because the site address is a domain name, Caddy asks Let's Encrypt for a
  free certificate, proves it controls the domain (the `tls-alpn-01` challenge on port 443),
  installs it, and renews it before it expires (every ~60 days). It also redirects
  `http://` to `https://`. This is why the domain had to point at the server first.
- `encode zstd gzip`: compresses responses.
- Log lines confirming it: `"validations succeeded"` and `"certificate obtained successfully",
  "identifier":"bstack.daszeichen.xyz"` (`journalctl -u caddy`).

**Checks from my own machine:**

| Check | Result |
|---|---|
| `https://bstack.daszeichen.xyz/` | 200, certificate valid |
| `http://bstack.daszeichen.xyz/` | 308 redirect to `https://` |
| `https://bstack.daszeichen.xyz/api/region/list` (no token) | "Authorization Error!" from the API: proxy chain works |
| port 3000 / 5432 / 6379 on `107.191.40.90` | blocked |
| signup → signin → create website → list → get → delete | all 200 (test user deleted afterwards) |

**Why nobody can reach Postgres or Redis "by going to that port":** "localhost" means "this
machine itself". Postgres and Redis are published as `127.0.0.1:5432` and `127.0.0.1:6379`,
which only accepts connections that start on the server. A connection from the internet arrives
on the public address `107.191.40.90`, where nothing listens on those ports, so it's refused. The
firewall is a second layer on top. Checked from outside: both ports blocked.

---

## Step 7: SSH: keys only

`/etc/ssh/sshd_config.d/00-bstack-hardening.conf`:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
```

```bash
sshd -t && systemctl reload ssh
```

- Bots try passwords on every public IP all day. With passwords off, only someone holding the
  private key can log in. `prohibit-password` = root may log in, but only with a key.
- Why the `00-` name: Vultr's `50-cloud-init.conf` in the same folder sets
  `PasswordAuthentication yes`. sshd uses the **first** value it reads for each setting, and
  reads the folder in name order, so `00-…` wins over `50-…`.
- `sshd -t` checks the config before reloading; a broken config could otherwise lock everyone out.
  Reloaded while the existing session stayed open, then tested with a new connection.
- Check: key login works; `ssh -o PubkeyAuthentication=no root@107.191.40.90` gets
  `Permission denied (publickey)`.
- **Losing the key now means losing SSH access.** The way back in is Vultr's web console
  (View Console), which still accepts the root password because it's a local login, not SSH.

---

## Running it day to day

```bash
ssh -i ~/.ssh/claude-ssh root@107.191.40.90

systemctl status bstack-api            # is it running, last log lines
journalctl -u bstack-worker -f         # follow a service's logs (Ctrl+C to stop)
systemctl restart bstack-web           # restart one service
docker ps                              # Postgres and Redis containers
docker exec -it bstack-postgres psql -U postgres -d bstack    # database shell
```

**Deploying new code:**
1. Copy the code (the `tar … | ssh …` command from step 3).
2. `cd /opt/bstack && sudo -u bstack -H bun install --frozen-lockfile` (only if dependencies changed).
3. If the contract changed: apply the schema change (`prisma db update` / a migration, see P47).
4. Web changes: `cd apps/web && sudo -u bstack -H bun run build`.
5. `systemctl restart bstack-api bstack-worker bstack-pusher bstack-web`.

---

## Known issues on the live site

- **Passwords are stored in plain text, and `/signup` returns the password.** Friends should not
  use a password they use anywhere else until hashing is in.
- **The JWT secret is hardcoded and public on GitHub.** Anyone can forge a token for any user.
- **Error responses include stack traces with server paths** (e.g. a bad token returns jose's
  full stack with `/opt/bstack/...`). Visible to anyone on the internet now.
- **No database backups.** The data lives in the `bstack-pg` volume only.
- **First check of a new website takes up to 6 minutes** (pusher interval, see `TODO.md`).
- **Worker opens a new Redis connection per batch** (duplicate client created inside the loop).
- **Region is New Jersey only.** Response times are measured from the US east coast.
