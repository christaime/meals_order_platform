# MealMarket — Deployment Guide

This document describes how MealMarket is deployed to production using free-tier infrastructure. The deployed stack has four components, each running on a separate provider:

| Component | Provider | Plan |
| :--- | :--- | :--- |
| Angular frontend | Cloudflare Pages | Free |
| Spring Boot backend | Render | Free (Docker) |
| PostgreSQL + Object Storage | Neon | Free |
| Keycloak (IAM) | Cloud-IAM | Free (one-month evaluation) |

**Total cost: $0.**

The trade-offs of this stack are documented at the bottom. Read them before assuming the deployment is production-ready — it is not. It is a portfolio deployment.

---

## 1. Prerequisites

Before deploying, ensure you have:

- A GitHub repository with the MealMarket source.
- Accounts on **Cloudflare**, **Render**, **Neon**, and **Cloud-IAM**. All four can be created without a credit card.
- A working Dockerfile at the repository root that builds your Spring Boot backend.

The Dockerfile used for Render is a multi-stage build: `gradle:8.14.2-jdk17` for compilation, `eclipse-temurin:17-jre-alpine` for runtime. The build runs `./gradlew :backend:meal-service:bootJar` and copies the resulting JAR to the runtime stage.

---

## 2. Neon — PostgreSQL and Object Storage

Neon provides two services in one project: a serverless PostgreSQL database and an S3-compatible object store.

### 2.1 Create the PostgreSQL database

1. Log in to the Neon Console and create a project.
2. Select a region close to your users (Neon's US East region is a reasonable default).
3. Copy the connection string. It follows the format:
   ```
   postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require
   ```
   For Spring Boot, convert it to a JDBC URL by replacing `postgresql://` with `jdbc:postgresql://` and appending `?sslmode=require`.
4. Save the connection details. They become `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` on Render.

Neon supports connection pooling via a `-pooler` hostname suffix . Spring Boot uses HikariCP for pooling, so the pooler hostname is not required — the standard hostname works.

### 2.2 Create the object storage bucket

1. In the Neon Console, open your project and select a branch.
2. Navigate to the **Object storage** tab.
3. Click **New bucket**, enter `mealmarket-media` as the name, choose `public_read` as the access level, and click **Create** .

The `public_read` access level allows anonymous reads (so the frontend can display meal images without authentication) while still requiring valid credentials for writes . This is the correct configuration for a public-facing media bucket.

4. Note the storage endpoint. It follows the format:
   ```
   https://<branch-id>.storage.c-<N>.us-east-2.aws.neon.tech
   ```
5. Generate or retrieve the S3 access key and secret key from the same tab.

These become `MEDIA_ENDPOINT`, `MEDIA_ACCESS_KEY`, `MEDIA_SECRET_KEY`, and `MEDIA_BUCKET` on Render.

**Note:** Neon Object Storage requires path-style addressing (`forcePathStyle = true` in the S3 client). The MinIO Java SDK uses path-style by default, so no code change is needed — but verify this if you migrate to the AWS SDK.

---

## 3. Cloud-IAM — Keycloak

Cloud-IAM provides a managed Keycloak instance. The free tier is a one-month evaluation; after it expires, the realm is deactivated.

### 3.1 Create the realm

1. Sign up at Cloud-IAM and create an instance.
2. In the admin console, create a realm named `mealmarket`.
3. Import the `realm-export.json` file from `deploy_config/keycloak/` if you have one. Otherwise, create the realm manually with the clients, roles, and users your application needs.

### 3.2 Note the issuer URI

The critical detail: **Cloud-IAM's Keycloak instance uses the `/auth` prefix**. The issuer URI is:

```
https://<your-instance>.cloud-iam.com/auth/realms/mealmarket
```

This is different from a self-hosted Keycloak where `/auth` is often absent. Verify by opening `https://<your-instance>.cloud-iam.com/auth/realms/mealmarket/.well-known/openid-configuration` in a browser. The `issuer` field in the JSON response is the exact value you must use for `KEYCLOAK_ISSUER_URI` .

### 3.3 Configure the client

1. Create an OIDC client for the Angular frontend. Name it `meal-marketplace-frontend` (or whatever your code expects).
2. Set **Valid redirect URIs** to include:
    - `https://meals-order-platform.pages.dev/*`
    - `http://localhost:4200/*`
3. Set **Web origins** to the same two values (without the `/*`).
4. Save.

### 3.4 Disable the login iframe (important)

Modern browsers block third-party cookies, which breaks Keycloak's session-check iframe. In your Angular `keycloak.init()` call, add:

```typescript
await keycloak.init({
  onLoad: 'check-sso',
  checkLoginIframe: false,
  pkceMethod: 'S256',
});
```

This disables the hidden iframe check entirely. Login, logout, and token refresh still work; the only loss is cross-tab logout detection.

---

## 4. Render — Spring Boot Backend

Render runs the backend as a Docker web service on its free tier.

### 4.1 Create the web service

1. Log in to Render and click **New → Web Service**.
2. Connect your GitHub repository.
3. Configure:
    - **Name**: `mealmarket-backend`
    - **Runtime**: Docker
    - **Branch**: `main`
    - **Instance type**: Free
4. **Root Directory**: leave blank. The Dockerfile is at the repository root and references `backend/` paths internally.
5. Click **Create Web Service**.

### 4.2 Set environment variables

Render injects environment variables into the container. Add these in the **Environment** tab:

| Variable | Value |
| :--- | :--- |
| `DB_URL` | `jdbc:postgresql://<neon-host>/<dbname>?sslmode=require` |
| `DB_USERNAME` | Neon username |
| `DB_PASSWORD` | Neon password |
| `KEYCLOAK_ISSUER_URI` | `https://<cloud-iam-host>/auth/realms/mealmarket` |
| `KEYCLOAK_JWK_SET_URI` | `https://<cloud-iam-host>/auth/realms/mealmarket/protocol/openid-connect/certs` |
| `MEDIA_ENDPOINT` | Neon storage endpoint |
| `MEDIA_ACCESS_KEY` | Neon S3 access key |
| `MEDIA_SECRET_KEY` | Neon S3 secret key |
| `MEDIA_BUCKET` | `mealmarket-media` |
| `MEDIA_PUBLIC_BASE_URL` | `https://<branch-id>.storage.c-<N>.us-east-2.aws.neon.tech/mealmarket-media` |
| `APP_CUSTOM_CORS_ALLOWED_ORIGIN` | `https://meals-order-platform.pages.dev` |
| `OPENROUTER_API_KEY` | Your LLM provider key |

**Do not set `SERVER_PORT`.** Render sets the `PORT` environment variable automatically, and Spring Boot's embedded Tomcat picks it up. Your `application.yml` should have `server.port: ${PORT:8081}` or similar.

### 4.3 Cold starts

Render's free tier sleeps the service after 15 minutes of inactivity . The first request after a sleep takes 30–60 seconds for a Spring Boot application with Hibernate, Flyway, and Keycloak initialization.

**Mitigations:**

- **Uptime monitor**: Use UptimeRobot or Better Stack (both free) to ping `https://mealmarket-backend.onrender.com/actuator/health` every 5 minutes. This keeps the service awake.
- **Frontend warmup**: In `app.component.ts`, fire a background `GET /actuator/health` on application init. The first page load wakes the backend before the user opens the chat widget.

Both are cheap and together they eliminate the cold-start problem for most users.

### 4.4 CORS

CORS is configured in `SecurityConfig.java` via a `CorsConfigurationSource` bean. The allowlist reads from `app.cors.allowed-origins`, which is populated by the `APP_CUSTOM_CORS_ALLOWED_ORIGIN` environment variable.

**Critical:** `SecurityConfig` must use `setAllowedOriginPatterns(...)`, not `setAllowedOrigins(...)`, if the allowlist contains wildcards like `https://*.pages.dev`. `setAllowedOrigins` does not support wildcards and will throw at startup.

Also, the security chain must permit `OPTIONS` requests unauthenticated:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()  // ← MUST be first
    .requestMatchers("/api/v1/ai/**").permitAll()
    // ... rest of rules
)
```

Without this, preflight requests are rejected with 403 before the CORS filter runs.

---

## 5. Cloudflare Pages — Angular Frontend

Cloudflare Pages hosts the Angular app as a static site with automatic deployments on push.

### 5.1 Connect the repository

1. Log in to the Cloudflare dashboard and go to **Workers & Pages**.
2. Click **Create application** → **Pages** → **Import an existing Git repository** .
3. Select your GitHub repository and click **Begin setup**.

### 5.2 Configure the build

| Setting | Value |
| :--- | :--- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist/chopca/browser` |

**Verify the output directory** by checking your `angular.json` file. The default Angular output path is `dist/<project-name>/browser`. If your project name is `chopca`, the path is `dist/chopca/browser`. A wrong path produces a "directory not found" error during the build .

### 5.3 SPA routing

Angular uses client-side routing. A direct navigation to `/meals/123` will hit Cloudflare's 404 handler unless a fallback is configured. Create a `_redirects` file in the project's `public/` folder:

```
/*    /index.html    200
```

This tells Cloudflare to serve `index.html` for any unmatched path, allowing the Angular router to handle the route.

**Known issue:** Cloudflare Pages does not support serving a `404.html` for missing JavaScript chunks. If the build deploys the new `index.html` before the new chunk files are available at the edge, the browser may request a `.js` file that returns `index.html` with a `text/html` MIME type. The fix is to move assets into a subfolder and place a `404.html` inside it, or to hard-refresh the page after a deployment. This is a Cloudflare Pages limitation, not a MealMarket bug.

### 5.4 Environment variables

If the Angular build reads any configuration from environment variables, add them in **Settings → Environment variables** before the first build. At minimum, ensure `NODE_VERSION` is set to a version compatible with Angular 19 (Node 20 or 22).

### 5.5 GitHub Actions (optional)

Cloudflare Pages auto-deploys on push, so a GitHub Action is not required. If you prefer explicit CI/CD, you can use the `cloudflare/wrangler-action` to deploy from GitHub Actions instead of the Git integration . This requires adding `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets.

---

## 6. Post-Deployment Verification

After all three components are live, verify the full flow:

### 6.1 Backend health

```bash
curl -sS https://mealmarket-backend.onrender.com/actuator/health
```

Expected: `{"status":"UP"}`.

### 6.2 Backend API

```bash
curl -X POST https://mealmarket-backend.onrender.com/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"salut","sessionId":null}'
```

Expected: a JSON response with `reply`, `sessionId`, and `structured`. If the response is a 500, check the Render logs for the specific exception.

### 6.3 CORS preflight

```bash
curl -i -X OPTIONS https://mealmarket-backend.onrender.com/api/v1/ai/chat \
  -H "Origin: https://meals-order-platform.pages.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected: `HTTP/2 200` with `access-control-allow-origin: https://meals-order-platform.pages.dev`.

### 6.4 Frontend

Open `https://meals-order-platform.pages.dev` in a browser. The chat widget should appear. Send a message and verify that meal cards render.

---

## 7. Known Limitations

This deployment is free-tier and has documented constraints. Reviewers and users should be aware of them:

**Cold starts.** The backend sleeps after 15 minutes of inactivity. The first request after a sleep takes up to 60 seconds. The frontend warmup and uptime monitor mitigate this but do not eliminate it .

**Keycloak trial expiry.** Cloud-IAM's free tier is a one-month evaluation. After it expires, the realm is deactivated and authentication stops working. The rest of the application remains functional.

**Cloudflare Pages MIME issue.** After a deployment, the browser may cache a stale `index.html` reference to old chunk files. A hard refresh resolves it. This is a known Cloudflare Pages behavior with SPAs.

**No automated tests in the pipeline.** CI/CD runs the build and deploy, but does not run the test suite. Test coverage is partial and being expanded.

**No database backups.** Neon's free tier includes point-in-time recovery for a limited window, but there is no automated export. For a portfolio deployment, this is acceptable. For production, it would not be.

---

## 8. Cost Summary

| Component | Provider | Plan | Cost |
| :--- | :--- | :--- | :--- |
| Frontend | Cloudflare Pages | Free | $0 |
| Backend | Render | Free | $0 |
| PostgreSQL | Neon | Free | $0 |
| Object Storage | Neon | Free | $0 |
| Keycloak | Cloud-IAM | Free (1 month) | $0 |
| **Total** | | | **$0** |

**After the Cloud-IAM trial ends**, the options are: recreate the realm (if Cloud-IAM allows it), migrate to a paid host, or run the deployment in a "demo mode" that disables authentication. The last option is the most pragmatic for a portfolio piece and is documented in the backend's `README.md`.