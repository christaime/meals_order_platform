# Keycloak Configuration for `mealmarket` Realm — Frontend & Backend Clients

**Prerequisites:** Keycloak admin access, realm `mealmarket` exists. This guide assumes fresh setup.

---

## 1. Frontend Client (`meal-marketplace-frontend`)

### 1.1 Create Client

1. **Clients** → **Create client**
2. Configure:

| Setting | Value |
|---------|-------|
| Client type | OpenID Connect |
| Client ID | `meal-marketplace-frontend` |
| Name | Meal Marketplace Frontend |

3. **Capability config:**
    - **Client authentication:** **OFF** (public client — SPAs cannot store secrets)
    - **Standard flow:** **ON** (Authorization Code + PKCE)
    - **Direct access grants:** **OFF** (not needed for browser login)
    - **Service accounts roles:** **OFF**

4. **Login settings:**

| Setting | Value |
|---------|-------|
| Valid redirect URIs | `http://localhost:4200/*` |
| Web origins | `http://localhost:4200` |

> **Security note:** Be specific with redirect URIs. Avoid wildcards in production.

### 1.2 PKCE Enforcement

Keycloak enables PKCE automatically for public clients with Standard flow. No additional configuration required.

**Result:** Frontend gets `client_id: meal-marketplace-frontend`, uses PKCE with no secret.

---

## 2. Backend Client (`meal-marketplace-backend`)

You already created this client. Here's the complete reference:

### 2.1 Capability Config

| Setting | Value |
|---------|-------|
| Client authentication | **ON** (confidential) |
| Standard flow | **OFF** (service account only) |
| Service accounts roles | **ON** (enables `client_credentials` grant) |

### 2.2 Service Account Roles

**Service account roles** tab → Assign role → Filter by client → `realm-management`:

| Role | Purpose |
|------|---------|
| `view-realm` | Read realm role definitions |
| `manage-users` | Assign/revoke user roles, manage sessions |

These are **already documented in your keycloak doc** and match your current setup.

### 2.3 Backend Configuration

```yaml
security:
  oauth2:
    resourceserver:
      jwt:
        issuer-uri: http://localhost:8080/realms/mealmarket
        jwk-set-uri: http://localhost:8080/realms/mealmarket/protocol/openid-connect/certs
    client:
      registration:
        keycloak-admin:
          client-id: meal-marketplace-backend
          client-secret: ${KEYCLOAK_ADMIN_CLIENT_SECRET}
          authorization-grant-type: client_credentials
      provider:
        keycloak-admin:
          token-uri: http://localhost:8080/realms/mealmarket/protocol/openid-connect/token
```

---

## 3. Realm Roles

### 3.1 Create Roles

**Realm roles** → **Create role** → Create these three:

| Role Name | Purpose |
|-----------|---------|
| `CUSTOMER` | Default role for all users |
| `VENDOR` | Granted on vendor registration |
| `ADMIN` | Platform administrators |

### 3.2 CUSTOMER as Default Role

**Realm settings** → **User registration** → **Default roles** → Add `CUSTOMER`

> **Why:** Every new user (including social logins) automatically gets `CUSTOMER`. Your backend's `getContext` endpoint can then assume `customer` exists for every authenticated user.

### 3.3 Backend Role Extraction

Your Spring Boot JWT decoder already extracts roles from `realm_access.roles` by default. No code change needed.

---

## 4. Identity Provider (Google/Facebook/etc.)

### 4.1 Add Provider

1. **Identity providers** → **Add provider** → Select (e.g., Google)
2. Configure:
    - **Client ID:** from Google Cloud Console
    - **Client Secret:** from Google Cloud Console
    - **Default scopes:** `openid email profile`

3. **Redirect URI** (copy this into Google Console):
   ```
   http://localhost:8080/realms/mealmarket/broker/google/endpoint
   ```

### 4.2 First Login Flow

**Identity providers** → **Google** → **First login flow** → Set to `first broker login`

This flow:
1. Creates a Keycloak user from the IdP response
2. Assigns default roles (`CUSTOMER`)
3. Links the Keycloak user to the external IdP account

### 4.3 User Attribute Mapper (Optional)

To pass `preferredLanguage` from the IdP:

**Identity providers** → **Google** → **Mappers** → **Add mapper** → **Attribute Importer**

| Field | Value |
|-------|-------|
| Name | `preferredLanguage` |
| User Attribute | `preferredLanguage` |
| Claim | `locale` |

---

## 5. Token Claims — Add to Access Token

Keycloak includes roles in the access token by default. But some claims are **only in the ID token** and need explicit mapping.

### 5.1 Roles (Already Present)

The built-in `roles` client scope adds `realm_access.roles` to the access token. **No change needed**.

### 5.2 Email and Name (Verify)

**Client scopes** → **`email`** → **Mappers** → **Email** mapper → **Add to access token: ON**

**Client scopes** → **`profile`** → **Mappers** → **Full Name** mapper → **Add to access token: ON**

> **Why:** Your backend's `getContext` endpoint reads `email` and `name` from the JWT. Without this, they return `null`.

### 5.3 Preferred Language (Custom)

If you want `preferredLanguage` in the token:

1. **Client scopes** → **Create client scope**
2. Name: `preferred-language`, Type: `Default`
3. **Mappers** tab → **Add mapper** → **User Attribute**

| Field | Value |
|-------|-------|
| Name | `preferredLanguage` |
| User Attribute | `preferredLanguage` |
| Token Claim Name | `preferredLanguage` |
| Claim JSON Type | `String` |
| Add to access token | **ON** |

4. **Clients** → `meal-marketplace-frontend` → **Client scopes** → **Add client scope** → `preferred-language` → **Default**

---

## 6. Frontend Keycloak Configuration

### 6.1 Angular Service

```typescript
// keycloak.service.ts
private keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'mealmarket',
  clientId: 'meal-marketplace-frontend'
});

async init(): Promise<boolean> {
  return this.keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html'
  });
}
```

### 6.2 Silent Check SSO

Create `src/assets/silent-check-sso.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <script>
    parent.postMessage(location.href, location.origin);
  </script>
</body>
</html>
```

### 6.3 Login Methods

```typescript
async login(idpHint?: string): Promise<void> {
  await this.keycloak.login({
    idpHint,  // 'google', 'facebook', etc.
    redirectUri: window.location.origin + '/auth/callback'
  });
}
```

---

## 7. Backend Security Configuration

### 7.1 JWT Decoder

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/public/**", "/api/v1/media/**").permitAll()
                .requestMatchers("/api/v1/vendor/register").hasRole("CUSTOMER")  // any logged-in user can register
                .requestMatchers("/api/v1/vendor/**").hasRole("VENDOR")
                .anyRequest().authenticated()
            );
        return http.build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess == null) return List.of();
            List<String> roles = (List<String>) realmAccess.get("roles");
            return roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

### 7.2 CORS for Frontend

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:4200"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

## 8. Testing Checklist

| Step | Verify |
|------|--------|
| 1 | Frontend redirects to Keycloak login page |
| 2 | Google/Facebook button appears (if IdP configured) |
| 3 | After login, redirect to `/auth/callback` |
| 4 | `GET /api/v1/me/context` returns `customer` (not null) |
| 5 | JWT contains `realm_access.roles: ["CUSTOMER"]` |
| 6 | Backend `registerVendor` succeeds, JWT updated with `VENDOR` role after `updateToken(0)` |

### Debug JWT Claims

```bash
# Decode token (no verification)
echo "$TOKEN" | cut -d'.' -f2 | base64 -d | jq
```

---

## 9. Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid redirect_uri` | URI not in client config | Add exact `http://localhost:4200/*` |
| No roles in JWT | Role not assigned to user | Assign realm role to user |
| `email` is null | Mapper not adding to access token | Enable "Add to access token" in `email` scope |
| `401` on backend | Issuer mismatch | Ensure `issuer-uri` matches Keycloak realm URL |
| CORS error | Web origins missing | Add `http://localhost:4200` to frontend client |

---

## Summary of Clients

| Client | Type | Auth | Flow | Purpose |
|--------|------|------|------|---------|
| `meal-marketplace-frontend` | Public | OFF | Standard + PKCE | Angular SPA login |
| `meal-marketplace-backend` | Confidential | ON | Client credentials | Admin API + service account |

**Result:** Frontend authenticates users via PKCE. Backend validates JWTs and calls Keycloak Admin API with a service account token. Social logins create users with `CUSTOMER` role automatically. Vendor registration adds `VENDOR` role.