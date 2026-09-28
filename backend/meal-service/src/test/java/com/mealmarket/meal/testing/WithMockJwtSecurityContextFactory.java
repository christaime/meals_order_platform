package com.mealmarket.meal.testing;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class WithMockJwtSecurityContextFactory
        implements WithSecurityContextFactory<WithMockJwt> {

    @Override
    public org.springframework.security.core.context.SecurityContext
    createSecurityContext(WithMockJwt annotation) {

        Instant now = Instant.now();

        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(annotation.subject())
                .claim("email", annotation.email())
                .claim("realm_access", Map.of("roles", List.of(annotation.roles())))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .build();

        var authorities = Arrays.stream(annotation.roles())
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .toList();

        var auth = new JwtAuthenticationToken(jwt, authorities, annotation.email());

        var context = org.springframework.security.core.context.SecurityContextHolder
                .createEmptyContext();
        context.setAuthentication(auth);
        return context;
    }
}