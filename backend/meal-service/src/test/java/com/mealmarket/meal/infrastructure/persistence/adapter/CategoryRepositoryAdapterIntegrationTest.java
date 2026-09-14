package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link CategoryRepositoryAdapter}.
 *
 * <p>Scope is intentionally limited to the 6 tests defined in the project
 * test plan. Uses a real PostgreSQL container (via {@link AbstractIntegrationTest}),
 * real Flyway migrations, and the real Spring context.</p>
 *
 * <p>Each test starts with a clean table to avoid cross-test pollution.</p>
 */
@DisplayName("CategoryRepositoryAdapter (integration)")
class CategoryRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    // ------------------------------------------------------------------
    // Test fixtures
    // ------------------------------------------------------------------

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    private static final UUID VENDOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    // ------------------------------------------------------------------
    // Dependencies
    // ------------------------------------------------------------------

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryJpaRepository categoryJpaRepository;

    @BeforeEach
    void cleanUp() {
        categoryJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Category newCuisine(String name) {
        return Category.create(
                name,
                "Cuisine: " + name,
                "https://cdn.mealmarket.com/icons/" + name.toLowerCase() + ".png",
                CategoryType.CUISINE,
                UserType.ADMIN,
                ADMIN_ID
        );
    }

    private Category newDishType(String name) {
        return Category.create(
                name,
                "Dish type: " + name,
                null,
                CategoryType.DISH_TYPE,
                UserType.VENDOR,
                VENDOR_ID
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. save() — basic round-trip
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("save() persists a Category to the database")
    void save_persistsCategoryToDatabase() {
        // Given
        final Category category = newCuisine("Cameroonian");

        // When
        final Category saved = categoryRepository.save(category);

        // Then
        assertThat(saved).isNotNull();
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Cameroonian");
        assertThat(saved.getType()).isEqualTo(CategoryType.CUISINE);
        assertThat(saved.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(categoryJpaRepository.count()).isEqualTo(1);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. findById() — read back
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findById() returns the persisted Category")
    void findById_returnsPersistedCategory() {
        // Given
        final Category saved = categoryRepository.save(newCuisine("Italian"));

        // When
        final Optional<Category> found = categoryRepository.findById(saved.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getName()).isEqualTo("Italian");
        assertThat(found.get().getType()).isEqualTo(CategoryType.CUISINE);
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. existsByNameAndType() — uniqueness rule
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("existsByNameAndType() returns true for a duplicate (name, type)")
    void existsByNameAndType_returnsTrueForDuplicate() {
        // Given
        categoryRepository.save(newCuisine("African"));

        // When
        final boolean exists = categoryRepository.existsByNameAndType(
                "African",
                CategoryType.CUISINE
        );

        // Then
        assertThat(exists).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. search() — Specification with type filter
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with type filter returns only matching categories")
    void findByType_returnsOnlyMatchingType() {
        // Given
        categoryRepository.save(newCuisine("Cameroonian"));
        categoryRepository.save(newCuisine("Italian"));
        categoryRepository.save(newDishType("Main Dish"));
        categoryRepository.save(newDishType("Dessert"));

        final CategorySearchRequest request = CategorySearchRequest.builder()
                .type(CategoryType.CUISINE)
                .pageRequest(PageRequest.of(0, 20))
                .build();

        // When
        final DataPage<Category> page = categoryRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent())
                .extracting(Category::getType)
                .containsOnly(CategoryType.CUISINE);
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. search() — Specification with keyword
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with keyword returns matching categories")
    void search_withKeyword_returnsMatchingCategories() {
        // Given
        categoryRepository.save(newCuisine("Cameroonian"));
        categoryRepository.save(newCuisine("Italian"));
        categoryRepository.save(newCuisine("Asian"));
        categoryRepository.save(newDishType("Main Dish"));

        final CategorySearchRequest request = CategorySearchRequest.builder()
                .keyword("cam")
                .pageRequest(PageRequest.of(0, 20))
                .build();

        // When
        final DataPage<Category> page = categoryRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getName())
                .isEqualTo("Cameroonian");
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. search() — pagination
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with pagination respects the page size")
    void search_withPagination_respectsPageSize() {
        // Given — 5 cuisines
        categoryRepository.save(newCuisine("Cameroonian"));
        categoryRepository.save(newCuisine("Italian"));
        categoryRepository.save(newCuisine("Asian"));
        categoryRepository.save(newCuisine("French"));
        categoryRepository.save(newCuisine("African"));

        final CategorySearchRequest request = CategorySearchRequest.builder()
                .pageRequest(PageRequest.of(0, 2))
                .build();

        // When
        final DataPage<Category> page = categoryRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(5);
        assertThat(page.getPage()).isEqualTo(0);
        assertThat(page.getSize()).isEqualTo(2);
    }
}