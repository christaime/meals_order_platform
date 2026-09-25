package com.mealmarket.meal.infrastructure.config;

import com.mealmarket.meal.infrastructure.api.ExternalApiClient;
import com.mealmarket.meal.infrastructure.iam.CustomOAuth2ClientInterceptor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.client.*;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.client.RestClient;

@Configuration
public class ExternalApiConfig {

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientService authorizedClientService
    ) {
        // Configure support specifically for client_credentials (service-to-service)
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

    // 1. Keycloak specific RestClient
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

    // 2. Keycloak specific ExternalApiClient wrapper
    @Bean
    public ExternalApiClient keycloakApiClient(@Qualifier("keycloakRestClient") RestClient restClient) {
        return new ExternalApiClient(restClient);
    }

    // 3. Example: Another service's RestClient and ExternalApiClient
    @Bean
    public ExternalApiClient genericApiClient() {
        return new ExternalApiClient(RestClient.create());
    }
}