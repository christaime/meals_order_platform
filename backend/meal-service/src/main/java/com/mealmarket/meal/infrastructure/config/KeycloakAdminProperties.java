// infrastructure/iam/keycloak/KeycloakAdminProperties.java

package com.mealmarket.meal.infrastructure.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "keycloak.admin")
public class KeycloakAdminProperties {
    private String url;
    private String realm;
    private String username;
    private String password;
    private String clientId;
    private String clientSecret;
}