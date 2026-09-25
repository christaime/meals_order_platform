# Garage Deployment & Configuration Guide

Complete setup guide for running Garage as a local S3-compatible object storage backend for the meal marketplace backend.

## Overview

Garage is a lightweight, self-hosted S3-compatible object storage system written in Rust. It replaces MinIO, whose Community Edition Docker images were discontinued in late 2025.

This guide documents the **exact setup** used in this project — the minimal, working configuration. No unused steps, no premature production concerns.

## Prerequisites

- Docker and Docker Compose installed
- ~1 GB free disk space (plus space for stored data)
- OpenSSL (to generate secrets)

## Project Structure

```
your-project/
├── docker-compose.yml
└── garage.toml
```

## Step 1: Generate Secrets

Garage needs a few secrets that must be generated before first use:

```bash
# RPC secret — shared between nodes (64-char hex string)
openssl rand -hex 32

# Admin API token (64-char hex string)
openssl rand -hex 32

# Access key — 26 chars, must start with GK
echo "GK$(openssl rand -hex 12)"

# Secret key — 64-char hex string
openssl rand -hex 32
```

Save these values — they go into the configuration files.

## Step 2: Create `garage.toml`

This is Garage's primary configuration file. It must be mounted into the container at `/etc/garage.toml`.

```toml
# ─── Storage Paths ──────────────────────────────────────────
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"

# ─── Database Engine ────────────────────────────────────────
db_engine = "sqlite"

# ─── Replication ────────────────────────────────────────────
replication_factor = 1

# ─── Compression ────────────────────────────────────────────
compression_level = 2

# ─── RPC (Node Communication) ───────────────────────────────
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "garage:3901"

# ─── S3 API ─────────────────────────────────────────────────
[s3_api]
# CRITICAL: must be "us-east-1" to match the MinIO Java SDK default.
s3_region = "us-east-1"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

# ─── Static Web Hosting ─────────────────────────────────────
[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

# ─── Admin API ──────────────────────────────────────────────
[admin]
api_bind_addr = "[::]:3903"
```

### Critical configuration notes

- **`s3_region = "us-east-1"`** — The MinIO Java SDK signs requests with `us-east-1` by default. If Garage is configured with anything else, every request fails with `Authorization header malformed, unexpected scope`.
- **`replication_factor = 1`** — Required for single-node. Without it, writes block waiting for replicas that don't exist.

## Step 3: Create `docker-compose.yml`

```yaml
services:
  garage:
    image: dxflrs/garage:v2.3.0
    container_name: garage
    command: /garage server --single-node --default-bucket
    ports:
      - "3900:3900"   # S3 API
      - "3902:3902"   # Static web hosting
      - "3903:3903"   # Admin API
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
      - garage_meta:/var/lib/garage/meta
      - garage_data:/var/lib/garage/data
    environment:
      GARAGE_RPC_SECRET: "YOUR_GENERATED_RPC_SECRET"
      GARAGE_ADMIN_TOKEN: "YOUR_GENERATED_ADMIN_TOKEN"
      GARAGE_DEFAULT_ACCESS_KEY: "GKxxxxxxxxxxxxxxxxxxxxxxxx"
      GARAGE_DEFAULT_SECRET_KEY: "YOUR_GENERATED_SECRET_KEY"
      GARAGE_DEFAULT_BUCKET: "mealmarket-media"
    networks:
      - meal-network
    restart: unless-stopped

volumes:
  garage_meta:
  garage_data:
```

### Why the flags matter

- **`--single-node`** — Tells Garage to configure a single-node cluster automatically. Without this, you must assign a layout manually via `garage layout assign` and `garage layout apply`.
- **`--default-bucket`** — Creates the bucket and access key from the `GARAGE_DEFAULT_*` environment variables on startup. No manual `garage key create` or `garage bucket create` needed.

**These flags require Garage v2.3.0 or newer.** Pin the version in the image tag.

## Step 4: Start Garage

```bash
docker compose up -d garage
docker logs garage --tail 20
```

Confirm the S3 API is up:

```bash
curl -I http://localhost:3900
# HTTP/1.1 403 Forbidden  ← Expected: no credentials in request
```

The `403` is normal — it means Garage is running and enforcing authentication.

## Step 5: Configure hostname resolution for public URLs

Garage does **not** support anonymous access to the S3 API. Direct URL access like `http://localhost:3900/mealmarket-media/...` returns `Forbidden: Garage does not support anonymous access yet`.

The solution is to use **presigned URLs** (which carry authentication) — but the frontend still needs a stable hostname for cached or embedded URLs. We solve this by adding a host entry that maps a stable name to `localhost`.

### Linux / macOS

Edit `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add:

```
127.0.0.1  garage.mealmarket.local
```

### Windows

Open Notepad **as Administrator** (right-click → "Run as administrator").

Open the file:

```
C:\Windows\System32\drivers\etc\hosts
```

Add this line at the bottom (save with Ctrl+S):

```
127.0.0.1  garage.mealmarket.local
```

Alternatively, use PowerShell as Administrator:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1  garage.mealmarket.local"
```

### Verify

```bash
ping garage.mealmarket.local
# Should resolve to 127.0.0.1
```

## Step 6: Backend configuration

Update your Spring Boot `application.yml`:

```yaml
minio:
  enabled: true
  url: http://garage.mealmarket.local:3900
  access-key: ${GARAGE_ACCESS_KEY}
  secret-key: ${GARAGE_SECRET_KEY}
  bucket: mealmarket-media
  public-base-url: http://garage.mealmarket.local:3900/mealmarket-media
  presigned-expiry-seconds: 3600
```

### Presigned URLs and `public-base-url`

Because Garage doesn't allow anonymous access, every URL to an object must carry a signature. The MinIO Java SDK generates these automatically when `public-base-url` is blank. When it's set, the SDK skips signing and builds a raw URL — which will fail with `AccessDenied`.

**Recommended configuration:**

```yaml
minio:
  public-base-url: ""   # blank → presigned URLs
```

Presigned URLs expire after `presigned-expiry-seconds` (default 1 hour). When a URL expires, the frontend calls `GET /api/v1/media/url?ref=<storageRef>` to get a fresh one.

The hostname `garage.mealmarket.local` is used instead of `localhost` so that if you later move Garage to another host, only `/etc/hosts` needs to change — the database and API contracts stay the same.

## Step 7: Verify

### Upload test

Start the backend and try:

```bash
curl -X POST http://localhost:8081/api/v1/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -F "purpose=MEAL_IMAGE"
```

Expected response:

```json
{
  "storageRef": "meal_image/<uuid>.jpg",
  "purpose": "MEAL_IMAGE",
  "url": "http://garage.mealmarket.local:3900/mealmarket-media/meal_image/<uuid>.jpg?X-Amz-...",
  "mimeType": "image/jpeg",
  "size": 12345
}
```

### Download test

Open the `url` in a browser — the image should render. The URL contains `X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Signature` query parameters, which authenticate the request.

### Verify the bucket exists

```bash
docker exec garage /garage bucket list
# Should show: mealmarket-media
```

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Authorization header malformed, unexpected scope` | Region mismatch | Verify `s3_region = "us-east-1"` in `garage.toml`, recreate container (`docker compose rm -sf garage && docker compose up -d garage`) |
| `--single-node not recognized` | Garage version too old | Pin `dxflrs/garage:v2.3.0` or newer |
| `Access Denied` on direct URL | Anonymous access unsupported | Leave `public-base-url` blank; use presigned URLs |
| `Connection refused` | Garage not running or wrong port | Check `docker ps`; verify `3900:3900` mapping |
| `No license installed` | Using an AIStor image | Switch to `dxflrs/garage` (community edition) |

## Summary

| Component | Value |
|---|---|
| Image | `dxflrs/garage:v2.3.0` |
| Startup flags | `--single-node --default-bucket` |
| S3 API port | 3900 |
| Web endpoint port | 3902 |
| Admin API port | 3903 |
| Required env vars | `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN`, `GARAGE_DEFAULT_ACCESS_KEY`, `GARAGE_DEFAULT_SECRET_KEY`, `GARAGE_DEFAULT_BUCKET` |
| Critical config | `s3_region = "us-east-1"` |
| Backend access | Presigned URLs (`public-base-url: ""`) |
| Host entry | `garage.mealmarket.local` → `127.0.0.1` |