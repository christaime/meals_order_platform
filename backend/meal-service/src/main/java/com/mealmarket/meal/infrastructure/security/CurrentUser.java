package com.mealmarket.meal.infrastructure.security;

import com.mealmarket.meal.domain.model.UserType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Extracts the currently authenticated user from the security context.
 * Assumes a Keycloak JWT is present.
 */
@Component
public class CurrentUser {

    /**
     * Returns the Keycloak user ID (JWT subject).
     */
    public UUID getUserId() {
        String userId = getJwt().getSubject();
        return UUID.fromString(userId);
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

    /**
     * Returns the JWT token itself for advanced use.
     */
    public Jwt getJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("No authenticated user found");
        }
        return jwt;
    }
}