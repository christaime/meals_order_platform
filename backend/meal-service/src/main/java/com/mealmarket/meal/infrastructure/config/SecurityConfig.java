package com.mealmarket.meal.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Value("${app.cors.allowed-origins:http://localhost:4200}")
    private List<String> allowedOrigins;

    // ═══════════════════════════════════════════════════════════
    //  Security Filter Chain
    // ═══════════════════════════════════════════════════════════

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF (stateless JWT API)
                .csrf(csrf -> csrf.disable())

                // CORS configuration
                .cors(withDefaults())

                // Stateless session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .requestMatchers("/api/v1/reference/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/ai/**").permitAll()
                        // Media
                        .requestMatchers(HttpMethod.POST,   "/api/v1/media").authenticated()
                        .requestMatchers(HttpMethod.GET,    "/api/v1/media/url").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/media").authenticated()

                        // Swagger
                        .requestMatchers(
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                "/swagger-resources/**", "/webjars/**"
                        ).permitAll()

                        // Actuator
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // Admin
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // ─── Vendor — carve out registration BEFORE the catch-all ───
                        .requestMatchers(HttpMethod.POST, "/api/v1/vendor/register").authenticated()
                        .requestMatchers("/api/v1/vendor/**").hasRole("VENDOR")

                        // Everything else
                        .anyRequest().authenticated()
                )

                // OAuth2 Resource Server (JWT validation via Keycloak)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return http.build();
    }

    // ═══════════════════════════════════════════════════════════
    //  JWT Decoder (Keycloak)
    // ═══════════════════════════════════════════════════════════

    /**
     * Automatically configures the JWT decoder by fetching the JWK set
     * from the Keycloak issuer URI.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        return JwtDecoders.fromIssuerLocation(issuerUri);
    }

    // ═══════════════════════════════════════════════════════════
    //  JWT Authentication Converter — Map Keycloak roles
    // ═══════════════════════════════════════════════════════════

    /**
     * Extracts roles from Keycloak's JWT and maps them to Spring Security authorities.
     *
     * Keycloak stores realm roles in `realm_access.roles` and client roles in
     * `resource_access.{client}.roles`.
     *
     * This converter extracts realm roles and prefixes them with `ROLE_`.
     * Example: Keycloak role "ADMIN" → Spring Security authority "ROLE_ADMIN".
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

        // We handle role extraction ourselves — disable default
        grantedAuthoritiesConverter.setAuthorityPrefix("");
        grantedAuthoritiesConverter.setAuthoritiesClaimName("realm_access.roles");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<org.springframework.security.core.GrantedAuthority> authorities = new ArrayList<>();

            // Extract realm roles from JWT claim "realm_access.roles"
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
                roles.stream()
                        .map(Object::toString)
                        .map(role -> (org.springframework.security.core.GrantedAuthority)
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role))
                        .forEach(authorities::add);
            }

            // Extract client roles if needed (uncomment and configure per client)
            // Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
            // ...

            return authorities;
        });

        return jwtConverter;
    }

    // ═══════════════════════════════════════════════════════════
    //  CORS Configuration
    // ═══════════════════════════════════════════════════════════

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // setAllowedOriginPatterns supports wildcards like https://*.pages.dev
        configuration.setAllowedOriginPatterns(allowedOrigins);

        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Total-Count"
        ));

        // Angular sends a Bearer token, not cookies. Keeping credentials off
        // lets the browser accept wildcard origins without complaint.
        configuration.setAllowCredentials(false);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;

    }
}