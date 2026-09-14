# Running the Meal Marketplace Backend

This guide walks you through starting the Meal Service locally for the first time.

---

## Prerequisites

Before you start, ensure you have:

| Tool | Version | Check |
|------|---------|-------|
| Java | 17 | `java -version` |
| Docker | Latest | `docker --version` |
| Docker Compose | Latest | `docker compose version` |
| Gradle Wrapper | (bundled) | `./gradlew --version` |

---

## Step 1: Verify `application.yml`

Open `backend/meal-service/src/main/resources/application.yml` and verify the following sections match your local setup.

### Database (PostgreSQL)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/meal_db
    username: mealuser
    password: mealpass123
```

### Flyway

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
```

### Kafka

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
```

### Redis

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

### Keycloak (Security)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/mealmarket
          jwk-set-uri: http://localhost:8080/realms/mealmarket/protocol/openid-connect/certs
```

### MinIO

```yaml
minio:
  enabled: true
  url: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin123
  bucket: meal-images
```

### Server Port

```yaml
server:
  port: 8081
```

---

## Step 2: Start Infrastructure

The infrastructure services (Postgres, Keycloak, MinIO, Kafka, Redis) are defined in Docker Compose.

### Start development infrastructure

```bash
cd ~/meal-marketplace/backend
docker-compose -f docker-compose.dev.yml up -d
```

### Verify all containers are running

```bash
docker-compose -f docker-compose.dev.yml ps
```

**Expected output:** 5 containers in `Up` state:
- `meal-db` (PostgreSQL – port 5432)
- `payment-db` (PostgreSQL – port 5433)
- `redis` (port 6379)
- `keycloak-db` (PostgreSQL – port 5434)
- `keycloak` (port 8080)

### Wait for Keycloak to be ready

Keycloak takes ~30 seconds to start. Check with:

```bash
curl http://localhost:8080/realms/master
```

**Expected:** JSON response (any status is fine, we just want to confirm it responds).

---

## Step 3: Configure Keycloak

### Access Keycloak Admin

Open: http://localhost:8080/auth

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

### Create Realm

1. Click the dropdown in the top-left (says "master")
2. Click **Create Realm**
3. Name: `mealmarket`
4. Click **Create**

### Create Roles

In the `mealmarket` realm:

1. Left menu → **Realm roles**
2. Click **Create role** three times for:
    - `ADMIN`
    - `VENDOR`
    - `CUSTOMER`

### Create Clients

**Client 1: Backend**

1. Left menu → **Clients**
2. Click **Create client**
3. Client ID: `meal-marketplace-backend`
4. Client type: `OpenID Connect`
5. Click **Next**
6. Enable **Client authentication** (ON)
7. Click **Save**

**Client 2: Frontend**

1. Left menu → **Clients**
2. Click **Create client**
3. Client ID: `meal-marketplace-frontend`
4. Client type: `OpenID Connect`
5. Click **Next**
6. Enable **Standard flow** (ON)
7. Enable **Direct access grants** (ON) – for testing
8. Valid redirect URIs: `http://localhost:4200/*`
9. Web origins: `http://localhost:4200`
10. Click **Save**

### Create a Test Admin User

1. Left menu → **Users**
2. Click **Add user**
3. Username: `admin@mealmarket.com`
4. Email: `admin@mealmarket.com`
5. Email verified: **ON**
6. Click **Create**
7. Go to **Credentials** tab
8. Click **Set password**
9. Password: `admin123`
10. Temporary: **OFF**
11. Click **Save**
12. Go to **Role mapping** tab
13. Click **Assign role**
14. Select `ADMIN`
15. Click **Assign**

### Create a Test Vendor User

Repeat the same steps but:
- Username: `vendor@mealmarket.com`
- Role: `VENDOR`

---

## Step 4: Run the Application

From the project root:

```bash
cd ~/meal-marketplace
./gradlew :meal-service:bootRun
```

**Expected output (abbreviated):**

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)

...
INFO  c.m.meal.MealServiceApplication : Started MealServiceApplication in 8.5 seconds
INFO  o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port(s): 8081 (http)
```

**Success indicators:**
- "Started MealServiceApplication"
- "Tomcat started on port(s): 8081"
- No exceptions in the last 30 lines

---

## Step 5: Verify Flyway Migration

Check that all tables were created:

```bash
docker exec -it meal-db psql -U mealuser -d meal_db -c "\dt"
```

**Expected tables (12):**

```
categories
distribution_locations
ingredients
meals
meals_categories
meals_distribution_locations
meals_ingredients
moderation_data
vendor_status_history
vendors
vendors_categories
vendors_distribution_locations
```

Check Flyway history:

```bash
docker exec -it meal-db psql -U mealuser -d meal_db -c "SELECT * FROM flyway_schema_history;"
```

**Expected:** One row for `V1__init_meal_schema.sql` with `success = t`.

---

## Step 6: Test the API

### 6.1 Verify the app is running

```bash
curl http://localhost:8081/actuator/health
```

**Expected:**
```json
{"status":"UP"}
```

### 6.2 Test a public endpoint (no auth)

```bash
curl http://localhost:8081/api/v1/public/categories
```

**Expected:** A JSON with `content: []`, `totalElements: 0`.

### 6.3 Get a JWT token from Keycloak

```bash
curl -X POST "http://localhost:8080/realms/mealmarket/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=meal-marketplace-frontend" \
  -d "username=admin@mealmarket.com" \
  -d "password=admin123" \
  -d "grant_type=password"
```

**Expected:** JSON with `access_token`, `expires_in`, `refresh_token`.

Copy the `access_token` value.

### 6.4 Test an admin endpoint

```bash
TOKEN="<paste-your-access-token-here>"

curl -X GET http://localhost:8081/api/v1/admin/vendors \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** A JSON with `content: []`, `totalElements: 0`.

### 6.5 Create your first category (admin)

```bash
TOKEN="<paste-your-access-token-here>"

curl -X POST http://localhost:8081/api/v1/admin/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cameroonian",
    "description": "Traditional Cameroonian cuisine",
    "iconUrl": null,
    "type": "CUISINE"
  }'
```

**Expected:** A JSON with the created category, `moderationStatus: "PENDING"`.

### 6.6 Approve the category (moderation)

```bash
curl -X POST http://localhost:8081/api/v1/admin/moderation/categories/{CATEGORY_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "APPROVE",
    "reason": "Initial category seed"
  }'
```

**Expected:** A JSON with `moderationStatus: "APPROVED"`.

### 6.7 Confirm it's visible publicly

```bash
curl http://localhost:8081/api/v1/public/categories
```

**Expected:** The approved category now appears in the list.

---

## Step 7: Open Swagger UI

Open in a browser:

```
http://localhost:8081/swagger-ui.html
```

You'll see:
- A dropdown to switch between **Full API**, **Public API**, **Vendor API**, **Admin API**
- All endpoints grouped by tag
- An **Authorize** button (for JWT)

### To authorize:

1. Click **Authorize**
2. Paste the `access_token` (without "Bearer ")
3. Click **Authorize** → **Close**
4. Now protected endpoints are callable from the UI

---

## Step 8: Stop the Application

### Stop the app

Press `Ctrl+C` in the terminal where `bootRun` is running.

### Stop infrastructure

```bash
cd ~/meal-marketplace/backend
docker-compose -f docker-compose.dev.yml down
```

### Stop and remove volumes (fresh start next time)

```bash
docker-compose -f docker-compose.dev.yml down -v
```

> ⚠️ **Warning:** `-v` will delete the database. Use only for a full reset.

---

## Troubleshooting

### "Path for java installation '/usr/lib/jvm/openjdk-21'..."

**Cause:** Gradle is searching a JDK location that doesn't exist. Harmless if the build succeeds.

**Fix (optional):** Add to `gradle.properties`:

```properties
org.gradle.java.installations.paths=/home/christelle/Documents/AppsForDev/jdk-17.0.15+6
```

### "Connection refused" on port 5432

**Cause:** PostgreSQL container isn't running.

**Fix:**
```bash
docker-compose -f docker-compose.dev.yml ps
docker-compose -f docker-compose.dev.yml up -d meal-db
```

### "Unable to find a suitable JWK set URL" / Keycloak not reachable

**Cause:** Keycloak isn't ready or the realm doesn't exist.

**Fix:** Wait 30-60 seconds, then verify:
```bash
curl http://localhost:8080/realms/mealmarket
```

If 404, create the realm (Step 3).

### "Flyway migration failed"

**Cause:** Schema conflicts, wrong DB credentials, or partial migration.

**Fix (fresh start):**
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
# Restart the app
```

### "401 Unauthorized" when calling protected endpoints

**Cause:** Missing or expired JWT.

**Fix:**
- Ensure `Authorization: Bearer <token>` header is set
- Get a fresh token (Step 6.3)
- Check the token hasn't expired (`expires_in` was 300s by default)

### "403 Forbidden" when calling admin endpoints

**Cause:** The user's role doesn't include `ADMIN`.

**Fix:** Ensure the Keycloak user has the `ADMIN` realm role assigned (Step 3).

### Application starts but Flyway doesn't run

**Cause:** `spring.flyway.enabled` is false, or migrations folder is empty.

**Fix:** Verify `src/main/resources/db/migration/V1__init_meal_schema.sql` exists and `application.yml` has:
```yaml
spring:
  flyway:
    enabled: true
```

---

## Quick Reference

### Application URLs

| URL | Purpose |
|-----|---------|
| http://localhost:8081 | Meal Service |
| http://localhost:8081/swagger-ui.html | Swagger UI |
| http://localhost:8081/actuator/health | Health check |
| http://localhost:8080/auth | Keycloak Admin |
| http://localhost:9001 | MinIO Console |
| http://localhost:9000 | MinIO API |

### Default Credentials

| Service | User | Password |
|---------|------|----------|
| PostgreSQL (meal_db) | `mealuser` | `mealpass123` |
| PostgreSQL (payment_db) | `paymentuser` | `paymentpass123` |
| Keycloak Admin | `admin` | `admin123` |
| MinIO | `minioadmin` | `minioadmin123` |

### Useful Commands

```bash
# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Stop infrastructure
docker-compose -f docker-compose.dev.yml down

# View app logs
./gradlew :meal-service:bootRun

# Compile without running
./gradlew :meal-service:compileJava

# Full build (compile + test)
./gradlew :meal-service:build

# Clean build
./gradlew clean build

# Run database shell
docker exec -it meal-db psql -U mealuser -d meal_db

# Tail infrastructure logs
docker-compose -f docker-compose.dev.yml logs -f
```

---

## Next Steps After First Run

Once the app starts and you've verified the API:

1. **Seed base data** – Create admin user + base categories (CUISINE + DISH_TYPE)
2. **Write integration tests** – Use Testcontainers for repository tests
3. **Set up the frontend** – Angular app consuming the API
4. **Add the AI moderation agent** – Hook into `/admin/moderation/**`
5. **Configure CI/CD** – GitHub Actions for build + test

---

## Support

If you hit issues not covered here:

1. Check the app logs (visible in the `bootRun` terminal)
2. Check Docker logs: `docker-compose logs <service-name>`
3. Check `/actuator/health` for a quick status
4. Verify all prerequisites are met

