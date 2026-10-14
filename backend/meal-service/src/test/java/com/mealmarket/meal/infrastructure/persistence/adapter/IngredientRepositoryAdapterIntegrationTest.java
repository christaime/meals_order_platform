package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.common.pagination.Sort;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.IngredientJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IngredientRepositoryAdapter (integration)")
class IngredientRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Autowired private IngredientRepository ingredientRepository;
    @Autowired private IngredientJpaRepository ingredientJpaRepository;

    @BeforeEach
    void cleanUp() {
        ingredientJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private Ingredient ingredient(String name, boolean isAllergen, ModerationStatus status) {
        return Ingredient.builder()
                .name(name)
                .isAllergen(isAllergen)
                .createdByType(UserType.ADMIN)
                .createdById(ADMIN_ID)
                .moderationStatus(status)
                .build();
    }

    private IngredientSearchRequest.Builder requestBuilder() {
        return IngredientSearchRequest.builder();
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
        @DisplayName("save() persists a new ingredient")
        void save_persistsNewIngredient() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("Tomato", false, ModerationStatus.APPROVED));

            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getName()).isEqualTo("Tomato");
            assertThat(ingredientJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("save() updates an existing ingredient")
        void save_updatesExistingIngredient() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("Old", false, ModerationStatus.APPROVED));

            saved = saved.withName("New");
            Ingredient updated = ingredientRepository.save(saved);

            assertThat(updated.getId()).isEqualTo(saved.getId());
            assertThat(updated.getName()).isEqualTo("New");
            assertThat(ingredientJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("findById() returns the persisted ingredient")
        void findById_returnsPersistedIngredient() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("Tomato", false, ModerationStatus.APPROVED));

            Optional<Ingredient> found = ingredientRepository.findById(saved.getId());

            assertThat(found).isPresent();
            assertThat(found.get().getName()).isEqualTo("Tomato");
        }

        @Test
        @DisplayName("findById() returns empty for an unknown id")
        void findById_returnsEmptyForUnknownId() {
            assertThat(ingredientRepository.findById(UUID.randomUUID())).isEmpty();
        }

        @Test
        @DisplayName("deleteById() removes the row")
        void deleteById_removesRow() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("ToDelete", false, ModerationStatus.APPROVED));

            ingredientRepository.deleteById(saved.getId());

            assertThat(ingredientRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("delete() removes the row")
        void delete_removesRow() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("ToDelete", false, ModerationStatus.APPROVED));

            ingredientRepository.delete(saved);

            assertThat(ingredientRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("existsById() reflects the row's presence")
        void existsById_reflectsPresence() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("Anything", false, ModerationStatus.APPROVED));

            assertThat(ingredientRepository.existsById(saved.getId())).isTrue();
            assertThat(ingredientRepository.existsById(UUID.randomUUID())).isFalse();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Uniqueness")
    class UniquenessTests {

        @Test
        @DisplayName("existsByName() is true for a duplicate")
        void existsByName_trueForDuplicate() {
            ingredientRepository.save(ingredient("Tomato", false, ModerationStatus.APPROVED));

            assertThat(ingredientRepository.existsByName("Tomato")).isTrue();
        }

        @Test
        @DisplayName("existsByName() is false for a miss")
        void existsByName_falseForMiss() {
            assertThat(ingredientRepository.existsByName("Unknown")).isFalse();
        }

        @Test
        @DisplayName("findByName() returns the match")
        void findByName_returnsMatch() {
            Ingredient saved = ingredientRepository.save(
                    ingredient("Tomato", false, ModerationStatus.APPROVED));

            Optional<Ingredient> found = ingredientRepository.findByName("Tomato");

            assertThat(found).isPresent();
            assertThat(found.get().getId()).isEqualTo(saved.getId());
        }

        @Test
        @DisplayName("findByName() returns empty for a miss")
        void findByName_returnsEmptyForMiss() {
            assertThat(ingredientRepository.findByName("Unknown")).isEmpty();
        }

        @Test
        @DisplayName("findByName() is case-sensitive (pins the contract)")
        void findByName_isCaseSensitive() {
            ingredientRepository.save(ingredient("Tomato", false, ModerationStatus.APPROVED));

            assertThat(ingredientRepository.findByName("tomato")).isEmpty();
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
            Ingredient a = ingredientRepository.save(
                    ingredient("Ab", false, ModerationStatus.APPROVED));
            Ingredient b = ingredientRepository.save(
                    ingredient("Bc", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Cd", false, ModerationStatus.APPROVED));

            List<Ingredient> found = ingredientRepository.findAllById(
                    List.of(a.getId(), b.getId()));

            assertThat(found).hasSize(2);
            assertThat(found).extracting(Ingredient::getName)
                    .containsExactlyInAnyOrder("Ab", "Bc");
        }

        @Test
        @DisplayName("findAllById() short-circuits on an empty list")
        void findAllById_handlesEmptyList() {
            assertThat(ingredientRepository.findAllById(List.of())).isEmpty();
            assertThat(ingredientRepository.findAllById(null)).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Filtering
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filtering")
    class FilteringTests {

        @Test
        @DisplayName("search() keyword matches name")
        void search_keywordMatchesName() {
            ingredientRepository.save(ingredient("Tomato", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Potato", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Carrot", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .keyword("tom")
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Tomato");
        }

        @Test
        @DisplayName("search() exact name is case-insensitive")
        void search_exactNameIsCaseInsensitive() {
            ingredientRepository.save(ingredient("Tomato", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .name("TOMATO")
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("search() filters by isAllergen")
        void search_filtersByIsAllergen() {
            ingredientRepository.save(ingredient("Peanut", true, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Milk", true, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Carrot", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .isAllergen(true)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(Ingredient::getIsAllergen)
                    .containsOnly(true);
        }

        @Test
        @DisplayName("search() filters by moderationStatus")
        void search_filtersByModerationStatus() {
            ingredientRepository.save(ingredient("Ab", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Bc", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Cd", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(Ingredient::getModerationStatus)
                    .containsOnly(ModerationStatus.PENDING);
        }

        @Test
        @DisplayName("search() combines moderationStatus and isAllergen")
        void search_combinesStatusAndAllergen() {
            ingredientRepository.save(ingredient("Approved allergen", true, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Pending allergen", true, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Pending safe", false, ModerationStatus.PENDING));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .isAllergen(true)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Pending allergen");
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
            ingredientRepository.save(ingredient("Zebra", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Apple", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Mango", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Ingredient::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }

        @Test
        @DisplayName("search() sorts by name descending")
        void search_sortsByNameDescending() {
            ingredientRepository.save(ingredient("Zebra", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Apple", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Mango", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.DESC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Ingredient::getName)
                    .containsExactly("Zebra", "Mango", "Apple");
        }

        @Test
        @DisplayName("search() sorts by createdAt descending")
        void search_sortsByCreatedAtDescending() {
            Ingredient first = ingredientRepository.save(
                    ingredient("First", false, ModerationStatus.APPROVED));
            sleepMillis(5);
            Ingredient second = ingredientRepository.save(
                    ingredient("Second", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("createdAt", Sort.Direction.DESC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Ingredient::getId)
                    .containsExactly(second.getId(), first.getId());
        }

        @Test
        @DisplayName("search() applies both filter and sort")
        void search_appliesBothFilterAndSort() {
            ingredientRepository.save(ingredient("Zebra", true, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Apple", true, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Mango", true, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Banana", true, ModerationStatus.PENDING));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent())
                    .extracting(Ingredient::getName)
                    .containsExactly("Apple", "Banana");
        }

        @Test
        @DisplayName("search() replaces an unknown sort property with the default")
        void search_replacesUnknownSortPropertyWithDefault() {
            ingredientRepository.save(ingredient("Alpha", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Beta", false, ModerationStatus.APPROVED));

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("notARealField", Sort.Direction.ASC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

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
                ingredientRepository.save(ingredient(
                        "Ingredient " + i, false, ModerationStatus.APPROVED));
            }

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 2))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getTotalElements()).isEqualTo(5);
            assertThat(page.getTotalPages()).isEqualTo(3);
            assertThat(page.isFirst()).isTrue();
            assertThat(page.isLast()).isFalse();
        }

        @Test
        @DisplayName("search() returns the last page with correct metadata")
        void search_returnsLastPage() {
            for (int i = 1; i <= 5; i++) {
                ingredientRepository.save(ingredient(
                        "Ingredient " + i, false, ModerationStatus.APPROVED));
            }

            IngredientSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(2, 2))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<Ingredient> page = ingredientRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.isFirst()).isFalse();
            assertThat(page.isLast()).isTrue();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Dedicated methods
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Dedicated JPA methods")
    class DedicatedMethodTests {

        @Test
        @DisplayName("findByModerationStatus() returns rows in createdAt ASC order")
        void findByModerationStatus_returnsInCreatedAtAscOrder() {
            Ingredient first = ingredientRepository.save(
                    ingredient("First", false, ModerationStatus.PENDING));
            sleepMillis(5);
            Ingredient second = ingredientRepository.save(
                    ingredient("Second", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Approved", false, ModerationStatus.APPROVED));

            List<Ingredient> pending = ingredientRepository.findByModerationStatus(ModerationStatus.PENDING);

            assertThat(pending)
                    .extracting(Ingredient::getId)
                    .containsExactly(first.getId(), second.getId());
        }

        @Test
        @DisplayName("countByModerationStatus() counts only the matching rows")
        void countByModerationStatus_countsMatching() {
            ingredientRepository.save(ingredient("Alba", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Balm", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Ca", false, ModerationStatus.APPROVED));

            assertThat(ingredientRepository.countByModerationStatus(ModerationStatus.PENDING))
                    .isEqualTo(2);
            assertThat(ingredientRepository.countByModerationStatus(ModerationStatus.APPROVED))
                    .isEqualTo(1);
        }

        @Test
        @DisplayName("findByModerationStatusAndIsAllergen() filters both fields")
        void findByModerationStatusAndIsAllergen_filtersBoth() {
            ingredientRepository.save(ingredient("Pending allergen", true, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Pending safe", false, ModerationStatus.PENDING));
            ingredientRepository.save(ingredient("Approved allergen", true, ModerationStatus.APPROVED));

            List<Ingredient> result = ingredientRepository
                    .findByModerationStatusAndIsAllergen(ModerationStatus.PENDING, true);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Pending allergen");
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
            ingredientRepository.save(ingredient("Alba", false, ModerationStatus.APPROVED));
            ingredientRepository.save(ingredient("Balm", true, ModerationStatus.PENDING));

            assertThat(ingredientRepository.count()).isEqualTo(2);
        }
    }
}