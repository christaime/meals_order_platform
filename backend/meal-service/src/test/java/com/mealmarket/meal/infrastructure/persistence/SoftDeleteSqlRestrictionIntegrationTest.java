package com.mealmarket.meal.infrastructure.persistence;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.domain.model.*;
import com.mealmarket.meal.domain.repository.*;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.*;
import com.mealmarket.meal.testing.RawQueryProbe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves that {@code @SQLRestriction("moderation_status <> 'DISABLED'")}
 * on the four moderable entities actually hides disabled rows from JPA
 * queries — including {@code findById}, {@code search}, and associations.
 *
 * <p>Each test asserts on <b>three layers</b>:</p>
 * <ol>
 *   <li><b>Domain repository</b> — {@code findById}, {@code search} →
 *       must NOT see the DISABLED row.</li>
 *   <li><b>Hibernate count</b> — {@code xxxJpa.count()} → also filtered,
 *       because {@code @SQLRestriction} applies to every generated query.</li>
 *   <li><b>Raw DB</b> — {@link RawQueryProbe} via {@code JdbcTemplate},
 *       bypassing Hibernate entirely → the row must still be there.</li>
 * </ol>
 *
 * <p>Layer 3 is the key assertion: it proves the row was <i>hidden</i>,
 * not <i>deleted</i>. Without it, a hard-delete regression would pass the
 * other two layers silently.</p>
 *
 * <p>This file tests the JPA-level hiding only. The partial unique indexes
 * are covered by a separate test.</p>
 */
@DisplayName("@SQLRestriction — DISABLED entities are hidden from JPA queries")
class SoftDeleteSqlRestrictionIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    // ─── Domain repositories ──────────────────────────────────
    @Autowired private CategoryRepository           categoryRepository;
    @Autowired private IngredientRepository         ingredientRepository;
    @Autowired private DistributionLocationRepository locationRepository;
    @Autowired private MealRepository               mealRepository;
    @Autowired private VendorRepository             vendorRepository;
    @Autowired private CityRepository               cityRepository;

    // ─── JPA repositories (Hibernate layer) ───────────────────
    @Autowired private CategoryJpaRepository            categoryJpa;
    @Autowired private IngredientJpaRepository          ingredientJpa;
    @Autowired private DistributionLocationJpaRepository locationJpa;
    @Autowired private MealJpaRepository                mealJpa;
    @Autowired private VendorJpaRepository              vendorJpa;
    @Autowired private CityJpaRepository                cityJpaRepository;

    // ─── Raw DB probe (bypasses Hibernate) ────────────────────
    @Autowired private RawQueryProbe raw;

    private City yaounde;

    @BeforeEach
    void cleanUp() {
        // TRUNCATE bypasses @SQLRestriction — the JPA deleteAll() does not.
        // Without this, DISABLED rows from previous tests survive and pollute counts.
        raw.truncate(
                "moderation_data",
                "meals",
                "distribution_locations",
                "ingredients",
                "categories",
                "vendors",
                "city"
        );
        yaounde = cityRepository.save(City.create("Yaoundé", "Centre", "CM"));
    }

    // ──────────────────────────────────────────────────────────
    //  Shared vendor fixture
    // ──────────────────────────────────────────────────────────

    private Vendor persistVendor(String businessName, String email) {
        return vendorRepository.save(Vendor.builder()
                .userId(UUID.randomUUID())
                .businessName(businessName)
                .city(yaounde)
                .ownerName("owner")
                .description("desc")
                .address("address")
                .email(email)
                .phone("+237612345678")
                .state(VendorState.active(ADMIN_ID))
                .build());
    }

    // ══════════════════════════════════════════════════════════════════
    //  CATEGORY
    // ══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Category")
    class CategoryTests {

        private static final String TABLE = "categories";

        private Category createCategory(String name, ModerationStatus status) {
            Category c = Category.create(
                    name,
                    "Description",
                    null,
                    CategoryType.CUISINE,
                    UserType.ADMIN,
                    ADMIN_ID
            );
            return status == ModerationStatus.PENDING
                    ? c
                    : c.withModerationStatus(status);
        }

        @Test
        @DisplayName("findById() does NOT return a DISABLED category")
        void findById_hidesDisabled() {
            final Category disabled = categoryRepository.save(
                    createCategory("Hidden", ModerationStatus.DISABLED)
            );

            // Layer 1 — domain repository
            assertThat(categoryRepository.findById(disabled.getId())).isEmpty();

            // Layer 2 — Hibernate count (also restricted)
            assertThat(categoryJpa.count()).isZero();

            // Layer 3 — raw DB (proves the row still exists)
            assertThat(raw.countById(TABLE, disabled.getId())).isEqualTo(1);
            assertThat(raw.readString(TABLE, "moderation_status", disabled.getId()))
                    .isEqualTo("DISABLED");
        }

        @Test
        @DisplayName("findById() still returns a PENDING or APPROVED category")
        void findById_returnsNonDisabled() {
            final Category pending = categoryRepository.save(
                    createCategory("Pending", ModerationStatus.PENDING)
            );
            final Category approved = categoryRepository.save(
                    createCategory("Approved", ModerationStatus.APPROVED)
            );

            assertThat(categoryRepository.findById(pending.getId())).isPresent();
            assertThat(categoryRepository.findById(approved.getId())).isPresent();
            assertThat(categoryJpa.count()).isEqualTo(2);
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }

        @Test
        @DisplayName("search() does NOT return DISABLED categories")
        void search_hidesDisabled() {
            categoryRepository.save(createCategory("Visible", ModerationStatus.APPROVED));
            categoryRepository.save(createCategory("Hidden", ModerationStatus.DISABLED));

            final CategorySearchRequest request = CategorySearchRequest.builder()
                    .pageRequest(PageRequest.of(0, 20))
                    .build();

            // Layer 1
            final DataPage<Category> page = categoryRepository.search(request);
            assertThat(page.getContent())
                    .extracting(Category::getName)
                    .containsExactly("Visible");
            assertThat(page.getTotalElements()).isEqualTo(1);

            // Layer 3 — both rows are physically present
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }

        @Test
        @DisplayName("existsByNameAndType() does NOT see a DISABLED duplicate")
        void existsByNameAndType_ignoresDisabled() {
            categoryRepository.save(createCategory("Arachide", ModerationStatus.DISABLED));

            // Layer 1 — the restriction makes the row invisible to unicity checks
            final boolean exists = categoryRepository.existsByNameAndType(
                    "Arachide", CategoryType.CUISINE
            );
            assertThat(exists).isFalse();

            // Layer 3 — the row still exists
            assertThat(raw.countAll(TABLE)).isEqualTo(1);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  INGREDIENT
    // ══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Ingredient")
    class IngredientTests {

        private static final String TABLE = "ingredients";

        private Ingredient createIngredient(String name, ModerationStatus status) {
            Ingredient i = Ingredient.create(
                    name,
                    false,
                    UserType.ADMIN,
                    ADMIN_ID
            );
            return status == ModerationStatus.PENDING
                    ? i
                    : i.withModerationStatus(status);
        }

        @Test
        @DisplayName("findById() does NOT return a DISABLED ingredient")
        void findById_hidesDisabled() {
            final Ingredient disabled = ingredientRepository.save(
                    createIngredient("Hidden", ModerationStatus.DISABLED)
            );

            // Layer 1
            assertThat(ingredientRepository.findById(disabled.getId())).isEmpty();

            // Layer 2
            assertThat(ingredientJpa.count()).isZero();

            // Layer 3
            assertThat(raw.countById(TABLE, disabled.getId())).isEqualTo(1);
            assertThat(raw.readString(TABLE, "moderation_status", disabled.getId()))
                    .isEqualTo("DISABLED");
        }

        @Test
        @DisplayName("search() does NOT return DISABLED ingredients")
        void search_hidesDisabled() {
            ingredientRepository.save(createIngredient("Visible", ModerationStatus.APPROVED));
            ingredientRepository.save(createIngredient("Hidden", ModerationStatus.DISABLED));

            final IngredientSearchRequest request = IngredientSearchRequest.builder()
                    .pageRequest(PageRequest.of(0, 20))
                    .build();

            // Layer 1
            final DataPage<Ingredient> page = ingredientRepository.search(request);
            assertThat(page.getContent())
                    .extracting(Ingredient::getName)
                    .containsExactly("Visible");

            // Layer 3
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  DISTRIBUTION LOCATION
    // ══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DistributionLocation")
    class LocationTests {

        private static final String TABLE = "distribution_locations";

        private DistributionLocation createLocation(
                Vendor vendor, String name, ModerationStatus status
        ) {
            DistributionLocation loc = DistributionLocation.create(
                    vendor, name, yaounde, "Address", "+237699999999",
                    3.8480, 11.5021, 10
            );
            return status == ModerationStatus.PENDING
                    ? loc
                    : loc.withModerationStatus(status);
        }

        @Test
        @DisplayName("findById() does NOT return a DISABLED location")
        void findById_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@l.com");
            final DistributionLocation disabled = locationRepository.save(
                    createLocation(vendor, "Hidden", ModerationStatus.DISABLED)
            );

            // Layer 1
            assertThat(locationRepository.findById(disabled.getId())).isEmpty();

            // Layer 2
            assertThat(locationJpa.count()).isZero();

            // Layer 3
            assertThat(raw.countById(TABLE, disabled.getId())).isEqualTo(1);
            assertThat(raw.readString(TABLE, "moderation_status", disabled.getId()))
                    .isEqualTo("DISABLED");
        }

        @Test
        @DisplayName("findByVendorId() does NOT return DISABLED locations")
        void findByVendorId_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@l.com");
            locationRepository.save(createLocation(vendor, "Visible", ModerationStatus.APPROVED));
            locationRepository.save(createLocation(vendor, "Hidden", ModerationStatus.DISABLED));

            // Layer 1
            final List<DistributionLocation> visible =
                    locationRepository.findByVendorId(vendor.getId());
            assertThat(visible)
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Visible");

            // Layer 3
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }

        @Test
        @DisplayName("findByModerationStatus(DISABLED) returns empty (the queue can't see them)")
        void findByModerationStatus_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@l.com");
            locationRepository.save(createLocation(vendor, "D1", ModerationStatus.DISABLED));
            locationRepository.save(createLocation(vendor, "D2", ModerationStatus.DISABLED));

            // Layer 1 — the admin "show disabled" query can't even see them
            final List<DistributionLocation> disabled =
                    locationRepository.findByModerationStatus(ModerationStatus.DISABLED);
            assertThat(disabled).isEmpty();

            // Layer 3 — but they're both physically there
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }

        @Test
        @DisplayName("search() does NOT return DISABLED locations")
        void search_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@l.com");
            locationRepository.save(createLocation(vendor, "Visible", ModerationStatus.APPROVED));
            locationRepository.save(createLocation(vendor, "Hidden", ModerationStatus.DISABLED));

            final DistributionLocationSearchRequest request =
                    DistributionLocationSearchRequest.builder()
                            .vendorId(vendor.getId())
                            .pageRequest(PageRequest.of(0, 20))
                            .build();

            // Layer 1
            final DataPage<DistributionLocation> page = locationRepository.search(request);
            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Visible");

            // Layer 3
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  MEAL
    // ══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Meal")
    class MealTests {

        private static final String TABLE = "meals";

        private Meal createMeal(Vendor vendor, String name, ModerationStatus status) {
            Meal meal = Meal.create(
                    vendor,
                    name,
                    "description",
                    BigDecimal.valueOf(4500),
                    null,
                    60,
                    List.of(),
                    List.of(),
                    List.of()
            );
            return status == ModerationStatus.PENDING
                    ? meal
                    : meal.withModerationStatus(status);
        }

        @Test
        @DisplayName("findById() does NOT return a DISABLED meal")
        void findById_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@m.com");
            final Meal disabled = mealRepository.save(
                    createMeal(vendor, "Hidden", ModerationStatus.DISABLED)
            );

            // Layer 1
            assertThat(mealRepository.findById(disabled.getId())).isEmpty();

            // Layer 2
            assertThat(mealJpa.count()).isZero();

            // Layer 3
            assertThat(raw.countById(TABLE, disabled.getId())).isEqualTo(1);
            assertThat(raw.readString(TABLE, "moderation_status", disabled.getId()))
                    .isEqualTo("DISABLED");
        }

        @Test
        @DisplayName("search() does NOT return DISABLED meals")
        void search_hidesDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@m.com");
            mealRepository.save(createMeal(vendor, "Visible", ModerationStatus.APPROVED));
            mealRepository.save(createMeal(vendor, "Hidden", ModerationStatus.DISABLED));

            final MealSearchRequest request = MealSearchRequest.builder()
                    .vendorId(vendor.getId())
                    .pageRequest(PageRequest.of(0, 20))
                    .build();

            // Layer 1
            final DataPage<Meal> page = mealRepository.search(request);
            assertThat(page.getContent())
                    .extracting(Meal::getName)
                    .containsExactly("Visible");

            // Layer 3
            assertThat(raw.countAll(TABLE)).isEqualTo(2);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  Association loading — the subtle part
    // ══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Association loading")
    class AssociationTests {

        @Test
        @DisplayName("a meal's ingredient list silently omits DISABLED ingredients")
        void meal_ingredients_omitDisabled() {
            final Vendor vendor = persistVendor("Vendor", "v@assoc.com");

            final Ingredient visible = ingredientRepository.save(
                    Ingredient.create("Visible", false, UserType.ADMIN, ADMIN_ID)
                            .withModerationStatus(ModerationStatus.APPROVED)
            );
            final Ingredient hidden = ingredientRepository.save(
                    Ingredient.create("Hidden", false, UserType.ADMIN, ADMIN_ID)
                            .withModerationStatus(ModerationStatus.DISABLED)
            );

            final Meal meal = mealRepository.save(
                    Meal.create(vendor, "With ingredients", "desc",
                                    BigDecimal.valueOf(1000), null, 30,
                                    List.of(),
                                    List.of(visible, hidden),
                                    List.of())
                            .withModerationStatus(ModerationStatus.APPROVED)
            );

            // Layer 1 — the meal's ingredient collection loads through Hibernate,
            // so the association respects @SQLRestriction.
            final Optional<Meal> loaded = mealRepository.findByIdWithDetails(meal.getId());
            assertThat(loaded).isPresent();
            assertThat(loaded.get().getIngredients())
                    .extracting(Ingredient::getName)
                    .containsExactly("Visible");

            // Layer 3 — both ingredient rows still exist in the DB.
            assertThat(raw.countAll("ingredients")).isEqualTo(2);
            assertThat(raw.countById("ingredients", hidden.getId())).isEqualTo(1);
            assertThat(raw.readString("ingredients", "moderation_status", hidden.getId()))
                    .isEqualTo("DISABLED");
        }
    }
}