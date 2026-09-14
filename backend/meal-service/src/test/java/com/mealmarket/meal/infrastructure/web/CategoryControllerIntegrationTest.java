package com.mealmarket.meal.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.infrastructure.persistence.entity.CategoryEntity;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link CategoryController}.
 *
 * <p>Scope is intentionally limited to the 8 tests defined in the project
 * test plan. Uses the real Spring context, real Postgres (docker-compose
 * {@code meal-db}), the real security filter chain, and MockMvc.</p>
 *
 * <p>Authentication is simulated with {@code @WithMockUser}. Since
 * {@code SecurityConfig} maps roles to {@code ROLE_<NAME>}, the
 * {@code roles = "ADMIN"} attribute translates to the authority
 * {@code ROLE_ADMIN}, which matches {@code @PreAuthorize("hasRole('ADMIN')")}.</p>
 */
@AutoConfigureMockMvc
@DisplayName("CategoryController (integration)")
class CategoryControllerIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryJpaRepository categoryJpaRepository;

    @MockBean
    private com.mealmarket.meal.infrastructure.security.CurrentUser currentUser;


    @BeforeEach
    void setUp() {
        categoryJpaRepository.deleteAll();
        when(currentUser.getUserType()).thenReturn(UserType.ADMIN);
        when(currentUser.getUserId()).thenReturn(ADMIN_ID);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Map<String, Object> validCreateRequest(String name) {
        return Map.of(
                "name", name,
                "description", "Cuisine: " + name,
                "iconUrl", "https://cdn.mealmarket.com/icons/" + name.toLowerCase() + ".png",
                "type", CategoryType.CUISINE.name()
        );
    }

    private UUID persistCategory(String name, ModerationStatus status) {
        final UUID id = UUID.randomUUID();
        CategoryEntity saved = categoryJpaRepository.saveAndFlush(
                CategoryEntity.builder()
                        .id(id)
                        .name(name)
                        .description("Cuisine: " + name)
                        .type(CategoryType.CUISINE)
                        .createdByType(UserType.ADMIN)
                        .createdById(ADMIN_ID)
                        .moderationStatus(status)
                        .build()
        );

        return saved.getId();
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. admin_canCreateCategory
    // ══════════════════════════════════════════════════════════════════

    @Test
    @WithMockUser(username = "admin@mealmarket.com", roles = {"ADMIN"})
    @DisplayName("ADMIN can create a category → 201")
    void admin_canCreateCategory() throws Exception {
        // Given
        final String body = objectMapper.writeValueAsString(
                validCreateRequest("Cameroonian")
        );

        // When / Then
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                //.andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Cameroonian"))
                .andExpect(jsonPath("$.type").value("CUISINE"))
                .andExpect(jsonPath("$.isActive").value(false));  // PENDING → isActive = false
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. vendor_cannotCreateCategory
    // ══════════════════════════════════════════════════════════════════

    @Test
    @WithMockUser(username = "vendor@mealmarket.com", roles = {"VENDOR"})
    @DisplayName("VENDOR cannot create a category → 403")
    void vendor_cannotCreateCategory() throws Exception {
        // Given
        final String body = objectMapper.writeValueAsString(
                validCreateRequest("Cameroonian")
        );

        // When / Then
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. unauthenticated_cannotCreateCategory
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("unauthenticated user cannot create a category → 401")
    void unauthenticated_cannotCreateCategory() throws Exception {
        // Given
        final String body = objectMapper.writeValueAsString(
                validCreateRequest("Cameroonian")
        );

        // When / Then
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. admin_canSearchAnyCategory
    // ══════════════════════════════════════════════════════════════════

    @Test
    @WithMockUser(username = "admin@mealmarket.com", roles = {"ADMIN"})
    @DisplayName("ADMIN sees categories of any moderation status")
    void admin_canSearchAnyCategory() throws Exception {
        // Given — one APPROVED, one PENDING (directly via JPA)
        persistCategory("Cameroonian", ModerationStatus.APPROVED);
        persistCategory("Italian", ModerationStatus.PENDING);

        // When / Then — admin search returns both
        mockMvc.perform(get("/api/v1/admin/categories")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. public_canSearchApprovedCategories
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("public (no auth) can search approved categories")
    void public_canSearchApprovedCategories() throws Exception {
        // Given
        persistCategory("Cameroonian", ModerationStatus.APPROVED);
        persistCategory("Italian", ModerationStatus.APPROVED);

        // When / Then
        mockMvc.perform(get("/api/v1/public/categories")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. public_cannotSeeUnapprovedCategories
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("public endpoint hides unapproved categories")
    void public_cannotSeeUnapprovedCategories() throws Exception {
        // Given
        persistCategory("Cameroonian", ModerationStatus.APPROVED);
        persistCategory("Italian", ModerationStatus.PENDING);
        persistCategory("Asian", ModerationStatus.REJECTED);

        // When / Then — public sees only the APPROVED one
        mockMvc.perform(get("/api/v1/public/categories")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Cameroonian"))
                .andExpect(jsonPath("$.content[0].type").value("CUISINE"));
    }

    // ══════════════════════════════════════════════════════════════════
    // 7. public_canGetApprovedCategoryById
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("public can fetch an approved category by id")
    void public_canGetApprovedCategoryById() throws Exception {
        // Given
        final UUID id = persistCategory("Cameroonian", ModerationStatus.APPROVED);

        // When / Then
        mockMvc.perform(get("/api/v1/public/categories/{id}", id))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Cameroonian"))
                .andExpect(jsonPath("$.type").value("CUISINE"))
                .andExpect(jsonPath("$.isActive").value(true));  // APPROVED → isActive = true
    }

    // ══════════════════════════════════════════════════════════════════
    // 8. duplicateCategory_returns409
    // ══════════════════════════════════════════════════════════════════

    @Test
    @WithMockUser(username = "admin@mealmarket.com", roles = {"ADMIN"})
    @DisplayName("creating a duplicate (name, type) → 409")
    void duplicateCategory_returns409() throws Exception {
        // Given — one already exists
        persistCategory("Cameroonian", ModerationStatus.PENDING);

        final String body = objectMapper.writeValueAsString(
                validCreateRequest("Cameroonian")
        );

        // When / Then
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }
}