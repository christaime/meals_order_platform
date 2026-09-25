package com.mealmarket.meal.infrastructure.iam;

import com.mealmarket.meal.application.port.IamPort;
import com.mealmarket.meal.infrastructure.api.ExternalApiClient;
import com.mealmarket.meal.infrastructure.config.KeycloakAdminProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Slf4j
public class KeycloakIamAdapter implements IamPort {

    private final ExternalApiClient apiClient;
    private final KeycloakAdminProperties properties;

    public KeycloakIamAdapter(
            @Qualifier("keycloakApiClient") ExternalApiClient apiClient,
            KeycloakAdminProperties properties
    ) {
        this.apiClient = apiClient;
        this.properties = properties;
    }

    // ═══════════════════════════════════════════════════════════
    //  Role assignment / revocation
    // ═══════════════════════════════════════════════════════════

    @Override
    public void assignRealmRole(String userId, String roleName) {
        Map<String, Object> role = fetchRealmRole(roleName);
        String url = userRolesUrl(userId) + "/realm";
        apiClient.post(url, List.of(role), Void.class);
    }

    @Override
    public void revokeRealmRole(String userId, String roleName) {
        Map<String, Object> role = fetchRealmRole(roleName);
        String url = userRolesUrl(userId) + "/realm";

        // Keycloak DELETE with body requires the client to send the JSON payload.
        // ExternalApiClient must expose a delete-with-body method; if it doesn't,
        // see the note at the bottom of this file.
        apiClient.deleteWithBody(url, List.of(role), Void.class);
    }

    // ═══════════════════════════════════════════════════════════
    //  Role queries
    // ═══════════════════════════════════════════════════════════

    @Override
    @SuppressWarnings("unchecked")
    public Set<String> getRealmRoles(String userId) {
        String url = userRolesUrl(userId) + "/realm";
        List<Map<String, Object>> roles = apiClient.get(url, List.class);

        if (roles == null || roles.isEmpty()) {
            return Collections.emptySet();
        }

        return roles.stream()
                .map(r -> (String) r.get("name"))
                .filter(name -> name != null)
                .collect(Collectors.toSet());
    }

    // ═══════════════════════════════════════════════════════════
    //  Session revocation
    // ═══════════════════════════════════════════════════════════

    @Override
    public void revokeUserSessions(String userId) {
        String url = properties.getUrl()
                + "/admin/realms/" + properties.getRealm()
                + "/users/" + userId + "/logout";
        apiClient.post(url, null, Void.class);
        log.info("Revoked all Keycloak sessions for user {}", userId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    /**
     * Fetch the realm role representation from Keycloak.
     *
     * <p>Keycloak's role-mapping endpoints require the full role object
     * (with {@code id} and {@code name}), not just the name string. So we
     * look the role up first, then pass the object.</p>
     */
    private Map<String, Object> fetchRealmRole(String roleName) {
        String url = properties.getUrl()
                + "/admin/realms/" + properties.getRealm()
                + "/roles/" + roleName;
        return apiClient.get(url, Map.class);
    }

    private String userRolesUrl(String userId) {
        return properties.getUrl()
                + "/admin/realms/" + properties.getRealm()
                + "/users/" + userId + "/role-mappings";
    }
}