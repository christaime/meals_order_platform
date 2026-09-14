package com.mealmarket.meal.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${app.openapi.server-url:http://localhost:8081}")
    private String serverUrl;

    @Value("${app.openapi.contact-email:support@mealmarket.com}")
    private String contactEmail;

    // ═══════════════════════════════════════════════════════════
    //  Main OpenAPI Bean
    // ═══════════════════════════════════════════════════════════

    @Bean
    public OpenAPI mealMarketOpenAPI() {
        return new OpenAPI()
                .info(buildInfo())
                .servers(buildServers())
                .tags(buildTags())
                .components(buildComponents())
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }

    // ═══════════════════════════════════════════════════════════
    //  Info — Title, description, contact, license
    // ═══════════════════════════════════════════════════════════

    private Info buildInfo() {
        return new Info()
                .title("Meal Marketplace API")
                .version("1.0.0")
                .description("""
                REST API for the Multi-Vendor Meal Marketplace platform.

                ## Overview

                The platform connects food vendors (restaurants, caterers, home chefs)
                with customers. It supports meal discovery, one-time orders, and
                scheduled meal batches.

                ## Key concepts

                - **Vendor** — a business offering meals. Must be activated by an admin.
                - **Meal** — a product offered by a vendor. Goes through moderation.
                - **Category** — unified classification (CUISINE or DISH_TYPE).
                - **Ingredient** — reference data, can be suggested by vendors.
                - **Distribution Location** — a physical point owned by a vendor.
                - **Moderation** — every piece of published content is reviewed
                  before reaching customers.

                ## Authentication

                All protected endpoints require a JWT Bearer token issued by Keycloak.

                **Roles:**
                - `ADMIN` — platform administrators
                - `VENDOR` — food vendors
                - `CUSTOMER` — end customers

                ## Namespaces

                - `/api/v1/public/**` — no authentication required
                - `/api/v1/vendor/**` — requires `ROLE_VENDOR`
                - `/api/v1/admin/**` — requires `ROLE_ADMIN`

                ## HTTP status codes

                | Code | Meaning |
                |------|---------|
                | 200 | Success |
                | 201 | Created |
                | 204 | Deleted (no content) |
                | 400 | Validation error |
                | 401 | Not authenticated |
                | 402 | Quota exceeded |
                | 403 | Forbidden (role / ownership) |
                | 404 | Not found |
                | 409 | Conflict (duplicate / invalid transition) |
                | 500 | Unexpected server error |
                """)
                .contact(new Contact()
                        .name("Meal Marketplace Team")
                        .email(contactEmail)
                        .url("https://mealmarket.com"))
                .license(new License()
                        .name("Proprietary")
                        .url("https://mealmarket.com/license"));
    }

    // ═══════════════════════════════════════════════════════════
    //  Servers
    // ═══════════════════════════════════════════════════════════

    private List<Server> buildServers() {
        return List.of(
                new Server().url(serverUrl).description("Current environment"),
                new Server().url("https://api.mealmarket.com").description("Production"),
                new Server().url("https://dev-api.mealmarket.com").description("Development")
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Tags — group operations in the UI
    // ═══════════════════════════════════════════════════════════

    private List<Tag> buildTags() {
        return List.of(
                new Tag().name("Categories")
                        .description("Manage categories — cuisines and dish types (admin + public)"),
                new Tag().name("Ingredients")
                        .description("Manage ingredients — admins and vendors (with moderation)"),
                new Tag().name("Distribution Locations")
                        .description("Manage vendor distribution locations (branches/kitchens)"),
                new Tag().name("Vendors")
                        .description("Registration, profile, search"),
                new Tag().name("Vendor State")
                        .description("Vendor lifecycle — state transitions, history, dashboard"),
                new Tag().name("Meals")
                        .description("Manage meals — vendor CRUD and public browsing"),
                new Tag().name("Moderation")
                        .description("Moderate content across all moderable entities (admin only)")
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Components — Security schemes, reusable responses, examples
    // ═══════════════════════════════════════════════════════════

    private Components buildComponents() {
        return new Components()
                .addSecuritySchemes("bearer-jwt", buildBearerJwtScheme())
                .addResponses("BadRequest", buildBadRequestResponse())
                .addResponses("Unauthorized", buildUnauthorizedResponse())
                .addResponses("Forbidden", buildForbiddenResponse())
                .addResponses("NotFound", buildNotFoundResponse())
                .addResponses("Conflict", buildConflictResponse())
                .addResponses("ServerError", buildServerErrorResponse())
                .addExamples("ErrorExample", buildErrorExample());
    }

    private SecurityScheme buildBearerJwtScheme() {
        return new SecurityScheme()
                .name("bearer-jwt")
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("""
                JWT Bearer token issued by Keycloak.

                **How to obtain:**
                1. Authenticate via Keycloak (or the frontend login flow)
                2. Copy the `access_token` from the response
                3. Click **Authorize** and paste it here
                """);
    }

    // ─── Reusable responses ───────────────────────────────────

    private ApiResponse buildBadRequestResponse() {
        return new ApiResponse()
                .description("Validation error or malformed request")
                .content(errorContent());
    }

    private ApiResponse buildUnauthorizedResponse() {
        return new ApiResponse()
                .description("Missing or invalid authentication token")
                .content(errorContent());
    }

    private ApiResponse buildForbiddenResponse() {
        return new ApiResponse()
                .description("Insufficient permissions or ownership violation")
                .content(errorContent());
    }

    private ApiResponse buildNotFoundResponse() {
        return new ApiResponse()
                .description("Resource not found")
                .content(errorContent());
    }

    private ApiResponse buildConflictResponse() {
        return new ApiResponse()
                .description("Duplicate resource or invalid state transition")
                .content(errorContent());
    }

    private ApiResponse buildServerErrorResponse() {
        return new ApiResponse()
                .description("Unexpected server error")
                .content(errorContent());
    }

    private Content errorContent() {
        return new Content().addMediaType(
                org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
                new MediaType().schema(new Schema<>().$ref("#/components/schemas/ErrorResponse"))
        );
    }

    private Example buildErrorExample() {
        return new Example()
                .summary("Example error response")
                .value("""
                {
                  "timestamp": "2026-09-12T10:30:00Z",
                  "status": 400,
                  "error": "Validation Failed",
                  "message": "One or more fields are invalid",
                  "path": "/api/v1/vendor/meals"
                }
                """);
    }

    // ═══════════════════════════════════════════════════════════
    //  Grouped OpenAPI — organize endpoints by namespace
    // ═══════════════════════════════════════════════════════════

    /**
     * Public API — no authentication required.
     * Used by customers (browsing) and during vendor registration.
     */
    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("1-public")
                .displayName("Public API")
                .pathsToMatch("/api/v1/public/**")
                .build();
    }

    /**
     * Vendor API — requires ROLE_VENDOR.
     * Used by vendors to manage their own resources.
     */
    @Bean
    public GroupedOpenApi vendorApi() {
        return GroupedOpenApi.builder()
                .group("2-vendor")
                .displayName("Vendor API")
                .pathsToMatch("/api/v1/vendor/**")
                .build();
    }

    /**
     * Admin API — requires ROLE_ADMIN.
     * Used by platform administrators and moderators.
     */
    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("3-admin")
                .displayName("Admin API")
                .pathsToMatch("/api/v1/admin/**")
                .build();
    }

    /**
     * Full API — all endpoints.
     * Useful for a single-page overview.
     */
    @Bean
    public GroupedOpenApi fullApi() {
        return GroupedOpenApi.builder()
                .group("0-full")
                .displayName("Full API (all endpoints)")
                .pathsToMatch("/api/v1/**")
                .build();
    }
}