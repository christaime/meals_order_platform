package com.mealmarket.meal.infrastructure.config;

import com.mealmarket.ai.infrastructure.config.AiProperties;
import com.mealmarket.meal.infrastructure.api.ExternalApiClient;
import com.mealmarket.meal.infrastructure.iam.CustomOAuth2ClientInterceptor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.client.*;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class ExternalApiConfig {

    // ═══════════════════════════════════════════════════════════
    //  OAuth2 (client_credentials) — Keycloak admin API
    // ═══════════════════════════════════════════════════════════

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientService authorizedClientService
    ) {
        OAuth2AuthorizedClientProvider authorizedClientProvider =
                OAuth2AuthorizedClientProviderBuilder.builder()
                        .clientCredentials()
                        .build();

        AuthorizedClientServiceOAuth2AuthorizedClientManager authorizedClientManager =
                new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                        clientRegistrationRepository,
                        authorizedClientService
                );

        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);

        return authorizedClientManager;
    }

    // ═══════════════════════════════════════════════════════════
    //  Keycloak admin API
    // ═══════════════════════════════════════════════════════════

    @Bean
    public RestClient keycloakRestClient(
            KeycloakAdminProperties properties,
            OAuth2AuthorizedClientManager authorizedClientManager
    ) {
        CustomOAuth2ClientInterceptor interceptor =
                new CustomOAuth2ClientInterceptor(authorizedClientManager, "keycloak-admin");

        return RestClient.builder()
                .baseUrl(properties.getUrl())
                .requestFactory(new JdkClientHttpRequestFactory())
                .requestInterceptor(interceptor)
                .build();
    }

    @Bean
    public ExternalApiClient keycloakApiClient(@Qualifier("keycloakRestClient") RestClient restClient) {
        return new ExternalApiClient(restClient);
    }

    // ═══════════════════════════════════════════════════════════
    //  OpenRouter — LLM provider
    //
    //  Deliberately its own RestClient:
    //    - Static API key in a header (no OAuth2 flow).
    //    - Longer timeouts than Keycloak (LLM calls are slow).
    //    - No retry — LLM calls are expensive and non-idempotent;
    //      a retry could duplicate an assistant turn or double the cost.
    //      Resilience will be added in Phase 7 with a dedicated
    //      circuit breaker config if traffic justifies it.
    // ═══════════════════════════════════════════════════════════

    @Bean
    public RestClient openRouterRestClient(AiProperties aiProperties) {
        AiProperties.OpenRouter cfg = aiProperties.getOpenrouter();

        var requestFactory = new JdkClientHttpRequestFactory();
        // JDK Http client timeout — total request duration
        requestFactory.setReadTimeout(Duration.ofSeconds(cfg.getTimeoutSeconds()));

        return RestClient.builder()
                .baseUrl(cfg.getBaseUrl())
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + cfg.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                // OpenRouter attribution headers — harmless for other providers
                .defaultHeader("HTTP-Referer", "http://localhost:4200")
                .defaultHeader("X-Title", "MealMarket")
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Generic — no auth, no specific base URL
    // ═══════════════════════════════════════════════════════════

    @Bean
    public ExternalApiClient genericApiClient() {
        return new ExternalApiClient(RestClient.create());
    }
}