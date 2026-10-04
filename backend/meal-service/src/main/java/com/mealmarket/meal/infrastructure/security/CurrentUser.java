package com.mealmarket.meal.infrastructure.security;

import com.mealmarket.meal.domain.model.UserType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class CurrentUser {

    /** Returns the Keycloak user ID (JWT subject). */
    public UUID getUserId() {
        String userId = getJwt().getSubject();
        return UUID.fromString(userId);
    }

    /** Returns the user's email from the JWT. */
    public String getEmail() {
        return getJwt().getClaimAsString("email");
    }

    /**
     * Returns the user type based on roles in the JWT.
     * Priority: ADMIN > VENDOR > CUSTOMER > SYSTEM
     */
    public UserType getUserType() {
        List<String> roles = getJwt().getClaimAsStringList("realm_access.roles");
        if (roles == null) {
            return UserType.CUSTOMER;
        }
        if (roles.contains("ADMIN")) return UserType.ADMIN;
        if (roles.contains("VENDOR")) return UserType.VENDOR;
        return UserType.CUSTOMER;
    }

    /** Returns the JWT token itself for advanced use. */
    public Jwt getJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("No authenticated user found");
        }
        return jwt;
    }

    // ═══════════════════════════════════════════════════════════
    //  Null-safe variants — for endpoints that accept anonymous access
    // ═══════════════════════════════════════════════════════════

    /** True if the current request is authenticated (not anonymous). */
    public boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken)
                && auth.getPrincipal() instanceof Jwt;
    }

    /**
     * The JWT if the current request is authenticated, otherwise empty.
     * Use this on endpoints that are public but enrich when a token is present.
     */
    public Optional<Jwt> getJwtIfPresent() {
        if (!isAuthenticated()) {
            return Optional.empty();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Optional.of((Jwt) auth.getPrincipal());
    }

    /**
     * The Keycloak user id (JWT `sub`) if the current request is
     * authenticated, otherwise empty.
     */
    public Optional<UUID> getUserIdIfPresent() {
        return getJwtIfPresent().map(jwt -> UUID.fromString(jwt.getSubject()));
    }

    /**
     * The user's role, if the current request is authenticated,
     * otherwise empty.
     */
    public Optional<UserType> getUserTypeIfPresent() {
        return getJwtIfPresent().map(jwt -> {
            List<String> roles = jwt.getClaimAsStringList("realm_access.roles");
            if (roles == null) return UserType.CUSTOMER;
            if (roles.contains("ADMIN")) return UserType.ADMIN;
            if (roles.contains("VENDOR")) return UserType.VENDOR;
            return UserType.CUSTOMER;
        });
    }
}