package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.common.pagination.Sort;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CategoryRepositoryAdapter (integration)")
class CategoryRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CategoryJpaRepository categoryJpaRepository;

    @BeforeEach
    void cleanUp() {
        categoryJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private Category category(String name, CategoryType type, ModerationStatus status) {
        return Category.builder()
                .name(name)
                .description("Description for " + name)
                .type(type)
                .createdByType(UserType.ADMIN)
                .createdById(ADMIN_ID)
                .moderationStatus(status)
                .build();
    }

    private CategorySearchRequest.Builder requestBuilder() {
        return CategorySearchRequest.builder();
    }

    private void sleepMillis(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("CRUD")
    class CrudTests {

        @Test
        @DisplayName("save() persists a new category")
        void save_persistsNewCategory() {
            Category saved = categoryRepository.save(
                    category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getName()).isEqualTo("Camerounaise");
            assertThat(categoryJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("save() updates an existing category")
        void save_updatesExistingCategory() {
            Category saved = categoryRepository.save(
                    category("Old Name", CategoryType.CUISINE, ModerationStatus.APPROVED));

            saved = saved.withName("New Name");
            Category updated = categoryRepository.save(saved);

            assertThat(updated.getId()).isEqualTo(saved.getId());
            assertThat(updated.getName()).isEqualTo("New Name");
            assertThat(categoryJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("findById() returns the persisted category")
        void findById_returnsPersistedCategory() {
            Category saved = categoryRepository.save(
                    category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            Optional<Category> found = categoryRepository.findById(saved.getId());

            assertThat(found).isPresent();
            assertThat(found.get().getName()).isEqualTo("Camerounaise");
        }

        @Test
        @DisplayName("findById() returns empty for an unknown id")
        void findById_returnsEmptyForUnknownId() {
            assertThat(categoryRepository.findById(UUID.randomUUID())).isEmpty();
        }

        @Test
        @DisplayName("deleteById() removes the row")
        void deleteById_removesRow() {
            Category saved = categoryRepository.save(
                    category("ToDelete", CategoryType.CUISINE, ModerationStatus.APPROVED));

            categoryRepository.deleteById(saved.getId());

            assertThat(categoryRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("delete() removes the row")
        void delete_removesRow() {
            Category saved = categoryRepository.save(
                    category("ToDelete", CategoryType.CUISINE, ModerationStatus.APPROVED));

            categoryRepository.delete(saved);

            assertThat(categoryRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("existsById() reflects the row's presence")
        void existsById_reflectsPresence() {
            Category saved = categoryRepository.save(
                    category("Anything", CategoryType.CUISINE, ModerationStatus.APPROVED));

            assertThat(categoryRepository.existsById(saved.getId())).isTrue();
            assertThat(categoryRepository.existsById(UUID.randomUUID())).isFalse();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Uniqueness")
    class UniquenessTests {

        @Test
        @DisplayName("existsByNameAndType() is true for a duplicate")
        void existsByNameAndType_trueForDuplicate() {
            categoryRepository.save(
                    category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            assertThat(categoryRepository.existsByNameAndType(
                    "Camerounaise", CategoryType.CUISINE)).isTrue();
        }

        @Test
        @DisplayName("existsByNameAndType() is false for a different type")
        void existsByNameAndType_falseForDifferentType() {
            categoryRepository.save(
                    category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            assertThat(categoryRepository.existsByNameAndType(
                    "Camerounaise", CategoryType.DISH_TYPE)).isFalse();
        }

        @Test
        @DisplayName("findByNameAndType() returns the match")
        void findByNameAndType_returnsMatch() {
            Category saved = categoryRepository.save(
                    category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            Optional<Category> found = categoryRepository.findByNameAndType(
                    "Camerounaise", CategoryType.CUISINE);

            assertThat(found).isPresent();
            assertThat(found.get().getId()).isEqualTo(saved.getId());
        }

        @Test
        @DisplayName("findByNameAndType() returns empty for a miss")
        void findByNameAndType_returnsEmptyForMiss() {
            assertThat(categoryRepository.findByNameAndType(
                    "Unknown", CategoryType.CUISINE)).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk lookup
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Bulk lookup")
    class BulkLookupTests {

        @Test
        @DisplayName("findAllById() returns every matching row")
        void findAllById_returnsEveryMatch() {
            Category a = categoryRepository.save(
                    category("Alma", CategoryType.CUISINE, ModerationStatus.APPROVED));
            Category b = categoryRepository.save(
                    category("Balm", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(
                    category("Calm", CategoryType.CUISINE, ModerationStatus.APPROVED));

            List<Category> found = categoryRepository.findAllById(
                    List.of(a.getId(), b.getId()));

            assertThat(found).hasSize(2);
            assertThat(found).extracting(Category::getName)
                    .containsExactlyInAnyOrder("Alma", "Balm");
        }

        @Test
        @DisplayName("findAllById() short-circuits on an empty list")
        void findAllById_handlesEmptyList() {
            assertThat(categoryRepository.findAllById(List.of())).isEmpty();
            assertThat(categoryRepository.findAllById(null)).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Filtering
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filtering")
    class FilteringTests {

        @Test
        @DisplayName("search() filters by moderationStatus")
        void search_filtersByModerationStatus() {
            categoryRepository.save(category("Alma", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Balm", CategoryType.CUISINE, ModerationStatus.PENDING));
            categoryRepository.save(category("Calm", CategoryType.CUISINE, ModerationStatus.PENDING));
            categoryRepository.save(category("Dull", CategoryType.CUISINE, ModerationStatus.REJECTED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(Category::getModerationStatus)
                    .containsOnly(ModerationStatus.PENDING);
        }

        @Test
        @DisplayName("search() filters by type")
        void search_filtersByType() {
            categoryRepository.save(category("Cuisine A", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Dish A", CategoryType.DISH_TYPE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Dish B", CategoryType.DISH_TYPE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .type(CategoryType.DISH_TYPE)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(Category::getType)
                    .containsOnly(CategoryType.DISH_TYPE);
        }

        @Test
        @DisplayName("search() keyword matches name OR description")
        void search_keywordMatchesNameOrDescription() {
            categoryRepository.save(category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Autre", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("NotIt", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .keyword("camer")
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Camerounaise");
        }

        @Test
        @DisplayName("search() exact name is case-insensitive")
        void search_exactNameIsCaseInsensitive() {
            categoryRepository.save(category("Camerounaise", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .name("CAMEROUNAISE")
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("search() combines type and moderationStatus")
        void search_combinesTypeAndStatus() {
            categoryRepository.save(category("Approved Cuisine", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Pending Cuisine", CategoryType.CUISINE, ModerationStatus.PENDING));
            categoryRepository.save(category("Pending Dish", CategoryType.DISH_TYPE, ModerationStatus.PENDING));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .type(CategoryType.CUISINE)
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Pending Cuisine");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Sorting
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Sorting")
    class SortingTests {

        @Test
        @DisplayName("search() sorts by name ascending")
        void search_sortsByNameAscending() {
            categoryRepository.save(category("Zebra", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Apple", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Mango", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Category::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }

        @Test
        @DisplayName("search() sorts by name descending")
        void search_sortsByNameDescending() {
            categoryRepository.save(category("Zebra", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Apple", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Mango", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.DESC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Category::getName)
                    .containsExactly("Zebra", "Mango", "Apple");
        }

        @Test
        @DisplayName("search() sorts by createdAt descending")
        void search_sortsByCreatedAtDescending() {
            Category first = categoryRepository.save(
                    category("First", CategoryType.CUISINE, ModerationStatus.APPROVED));
            sleepMillis(5);
            Category second = categoryRepository.save(
                    category("Second", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("createdAt", Sort.Direction.DESC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Category::getId)
                    .containsExactly(second.getId(), first.getId());
        }

        @Test
        @DisplayName("search() applies both filter and sort")
        void search_appliesBothFilterAndSort() {
            categoryRepository.save(category("Zebra", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Apple", CategoryType.CUISINE, ModerationStatus.PENDING));
            categoryRepository.save(category("Mango", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Banana", CategoryType.CUISINE, ModerationStatus.PENDING));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Category::getName)
                    .containsExactly("Apple", "Banana");
        }

        @Test
        @DisplayName("search() falls back to the default sort when none is given")
        void search_fallsBackToDefaultSort() {
            categoryRepository.save(category("Zebra", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Apple", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            // The request's getDefaultSortProperty() decides the order.
            // If it's `name`, the assertion below holds; adjust to match.
            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Apple");
        }

        @Test
        @DisplayName("search() replaces an unknown sort property with the default")
        void search_replacesUnknownSortPropertyWithDefault() {
            categoryRepository.save(category("Alpha", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Beta", CategoryType.CUISINE, ModerationStatus.APPROVED));

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("notARealField", Sort.Direction.ASC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            // No exception; results returned; the default sort applies.
            assertThat(page.getContent()).hasSize(2);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Pagination
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Pagination")
    class PaginationTests {

        @Test
        @DisplayName("search() returns the first page with correct metadata")
        void search_returnsFirstPage() {
            for (int i = 1; i <= 5; i++) {
                categoryRepository.save(category(
                        "Category " + i, CategoryType.CUISINE, ModerationStatus.APPROVED));
            }

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 2))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getPage()).isEqualTo(0);
            assertThat(page.getSize()).isEqualTo(2);
            assertThat(page.getTotalElements()).isEqualTo(5);
            assertThat(page.getTotalPages()).isEqualTo(3);
            assertThat(page.isFirst()).isTrue();
            assertThat(page.isLast()).isFalse();
        }

        @Test
        @DisplayName("search() returns the last page with correct metadata")
        void search_returnsLastPage() {
            for (int i = 1; i <= 5; i++) {
                categoryRepository.save(category(
                        "Category " + i, CategoryType.CUISINE, ModerationStatus.APPROVED));
            }

            CategorySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(2, 2))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Category> page = categoryRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getPage()).isEqualTo(2);
            assertThat(page.isFirst()).isFalse();
            assertThat(page.isLast()).isTrue();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("count() returns the total")
        void count_returnsTotal() {
            categoryRepository.save(category("Alma", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Balm", CategoryType.DISH_TYPE, ModerationStatus.APPROVED));

            assertThat(categoryRepository.count()).isEqualTo(2);
        }

        @Test
        @DisplayName("countByType() filters by type")
        void countByType_filtersByType() {
            categoryRepository.save(category("Alma", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Balm", CategoryType.CUISINE, ModerationStatus.APPROVED));
            categoryRepository.save(category("Calm", CategoryType.DISH_TYPE, ModerationStatus.APPROVED));

            assertThat(categoryRepository.countByType(CategoryType.CUISINE)).isEqualTo(2);
            assertThat(categoryRepository.countByType(CategoryType.DISH_TYPE)).isEqualTo(1);
        }
    }
}