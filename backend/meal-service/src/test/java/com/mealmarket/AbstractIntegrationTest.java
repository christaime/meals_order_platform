package com.mealmarket;

import com.mealmarket.meal.application.mapper.MediaUrlResolver;
import com.mealmarket.meal.application.port.IamPort;
import com.mealmarket.meal.infrastructure.minio.MinioMediaStorageAdapter;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for all integration tests.
 *
 * <p>The PostgreSQL container is started once per JVM (in a static initializer)
 * and never stopped explicitly — it's cleaned up by Testcontainers' Ryuk
 * reaper when the JVM exits. This lets all test classes share the same container
 * even when Spring creates multiple cached contexts.</p>
 *
 * <p>Test infrastructure brought in by this class:</p>
 * <ul>
 *   <li>{@link TestMediaStorageConfig} — provides a fake {@code MediaStoragePort}
 *       so mappers/services can be built without MinIO. Without this, the
 *       context fails because {@code minio.enabled=false} in the test profile
 *       means no adapter is registered.</li>
 *   <li>{@link MockBean} {@code JwtDecoder} — prevents Spring Security from
 *       trying to fetch JWKS from a Keycloak instance that isn't running in tests.
 *       Tests that need real auth use {@code @WithMockUser} or a custom
 *       {@code @WithMockJwt} annotation.</li>
 *   <li>Datasource properties — overridden here (not in {@code application-test.yml})
 *       so they always point at the Testcontainers-managed Postgres.</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@ComponentScan(
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {MinioMediaStorageAdapter.class, MediaUrlResolver.class}
        )
)
public abstract class AbstractIntegrationTest {

    /**
     * Shared Postgres container. Started once per JVM in the static initializer.
     * Ryuk reaps it at JVM exit.
     */
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:18-alpine")
                    .withDatabaseName("meal_db")
                    .withUsername("mealuser")
                    .withPassword("mealpass123");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");

        // Optional: silence Hibernate DDL warnings that clutter test output.
        // Uncomment if you want quieter logs:
        // registry.add("spring.jpa.properties.hibernate.show_sql", () -> "false");
    }

    /**
     * Stub JWT decoder. Replaces the real one, which would try to reach
     * Keycloak's JWKS endpoint at context startup and fail when Keycloak
     * isn't running (which it isn't, in tests).
     *
     * Individual tests inject authentication via {@code @WithMockUser} or
     * a custom {@code @WithMockJwt} meta-annotation. This mock only prevents
     * the eager JWKS fetch.
     */
    @MockBean
    protected JwtDecoder jwtDecoder;

    @MockBean
    protected IamPort iamPort;

}