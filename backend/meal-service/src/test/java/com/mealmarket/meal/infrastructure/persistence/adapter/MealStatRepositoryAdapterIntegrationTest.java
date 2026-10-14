package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.meal.application.dto.MealStatFilter;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.repository.MealStatRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MealStatRepositoryAdapter (integration)")
@Transactional
class MealStatRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    @Autowired private MealStatRepository mealStatRepository;

    @PersistenceContext private EntityManager em;

    private UUID vendorId;

    @BeforeEach
    void setUp() {
        this.cleanUp();
        vendorId = seedVendor("Vendor", "vendor@test.com");
    }


    void cleanUp() {
        // Order matters: order_item references meals; meals_categories references both.
        //em.createNativeQuery("DELETE FROM order_item").executeUpdate();
        em.createNativeQuery("DELETE FROM meals_categories").executeUpdate();
        em.createNativeQuery("DELETE FROM meals").executeUpdate();
        em.createNativeQuery("DELETE FROM categories").executeUpdate();
        em.createNativeQuery("DELETE FROM vendors").executeUpdate();
        em.createNativeQuery("DELETE FROM city").executeUpdate();
    }

    UUID seedVendor(String businessName, String email) {
        UUID id = UUID.randomUUID();
        UUID cityId = seedCity("Douala", "Littoral", "CM");   // vendors reference a city too
        em.createNativeQuery("""
        INSERT INTO vendors (id, user_id, business_name, owner_name, address,
                             city_id, email, phone, status, created_at, updated_at)
        VALUES (:id, :user, :name, 'Owner', '1 Main St',
                :city, :email, '+237600000000', 'ACTIVE', :now, :now)
    """)
                .setParameter("id", id)
                .setParameter("user", UUID.randomUUID())
                .setParameter("name", businessName)
                .setParameter("city", cityId)
                .setParameter("email", email)
                .setParameter("now", Instant.now())
                .executeUpdate();
        return id;
    }

    UUID seedCity(String name, String region, String countryCode) {
        UUID id = UUID.randomUUID();
        em.createNativeQuery("""
        INSERT INTO city (id, name, region, country_code, created_at, updated_at)
        VALUES (:id, :name, :region, :cc, :now, :now)
    """)
                .setParameter("id", id)
                .setParameter("name", name)
                .setParameter("region", region)
                .setParameter("cc", countryCode)
                .setParameter("now", Instant.now())
                .executeUpdate();
        return id;
    }

    // ------------------------------------------------------------------
    // Fixtures — native inserts because the test only needs a handful of
    // columns and the JPA entities carry more than the SQL reads.
    // ------------------------------------------------------------------

    UUID seedMeal(String name, BigDecimal price, Integer prepTime, String status, boolean available) {
        UUID id = UUID.randomUUID();
        em.createNativeQuery("""
            INSERT INTO meals (id, vendor_id, name, price, prep_time_minutes,
                               is_available, moderation_status, created_at, updated_at)
            VALUES (:id, :vendor, :name, :price, :prep, :available, :status, :now, :now)
        """)
                .setParameter("id", id)
                .setParameter("vendor", vendorId)
                .setParameter("name", name)
                .setParameter("price", price)
                .setParameter("prep", prepTime)
                .setParameter("available", available)
                .setParameter("status", status)
                .setParameter("now", Instant.now())
                .executeUpdate();
        return id;
    }


    UUID seedCategory(String name, CategoryType type) {
        UUID id = UUID.randomUUID();
        em.createNativeQuery("""
            INSERT INTO categories (id, name, description, type, created_by_type,
                                    created_by_id, moderation_status, created_at, updated_at)
            VALUES (:id, :name, 'desc', :type, 'ADMIN', :admin,
                    'APPROVED', :now, :now)
        """)
                .setParameter("id", id)
                .setParameter("name", name)
                .setParameter("type", type.name())
                .setParameter("admin", UUID.randomUUID())
                .setParameter("now", Instant.now())
                .executeUpdate();
        return id;
    }

    void linkMealToCategory(UUID mealId, UUID categoryId) {
        em.createNativeQuery("""
            INSERT INTO meals_categories (meal_id, category_id)
            VALUES (:meal, :category)
        """)
                .setParameter("meal", mealId)
                .setParameter("category", categoryId)
                .executeUpdate();
    }

    void seedOrderItem(UUID mealId) {
        em.createNativeQuery("""
            INSERT INTO order_item (id, meal_id, quantity)
            VALUES (:id, :meal, 1)
        """)
                .setParameter("id", UUID.randomUUID())
                .setParameter("meal", mealId)
                .executeUpdate();
    }

    // ═══════════════════════════════════════════════════════════
    //  Top categories by orders
    // ═══════════════════════════════════════════════════════════

   /* @Nested
    @DisplayName("Top categories by orders")
    class TopByOrdersTests {

        @Test
        @DisplayName("returns categories ordered by order count DESC")
        void returnsOrderedByCountDesc() {
            UUID cuisineA = seedCategory("Cuisine A", CategoryType.CUISINE);
            UUID cuisineB = seedCategory("Cuisine B", CategoryType.CUISINE);

            UUID mealA = seedMeal("Meal A", BigDecimal.TEN, 10, "APPROVED", true);
            UUID mealB = seedMeal("Meal B", BigDecimal.TEN, 10, "APPROVED", true);

            linkMealToCategory(mealA, cuisineA);
            linkMealToCategory(mealB, cuisineB);

            seedOrderItem(mealA);
            seedOrderItem(mealA);
            seedOrderItem(mealB);

            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOrders(10, CategoryType.CUISINE);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).name()).isEqualTo("Cuisine A");
            assertThat(result.get(0).count()).isEqualTo(2);
            assertThat(result.get(1).name()).isEqualTo("Cuisine B");
            assertThat(result.get(1).count()).isEqualTo(1);
        }

        @Test
        @DisplayName("respects the limit")
        void respectsLimit() {
            for (int i = 0; i < 5; i++) {
                UUID category = seedCategory("Cuisine " + i, CategoryType.CUISINE);
                UUID meal = seedMeal("Meal " + i, BigDecimal.TEN, 10, "APPROVED", true);
                linkMealToCategory(meal, category);
                seedOrderItem(meal);
            }

            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOrders(2, CategoryType.CUISINE);

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("returns empty when there are no orders")
        void returnsEmptyWhenNoOrders() {
            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOrders(10, CategoryType.CUISINE);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("ignores categories of a different type")
        void ignoresOtherTypes() {
            UUID cuisine = seedCategory("Cuisine", CategoryType.CUISINE);
            UUID dish = seedCategory("Dish", CategoryType.DISH_TYPE);

            UUID mealA = seedMeal("Meal A", BigDecimal.TEN, 10, "APPROVED", true);
            UUID mealB = seedMeal("Meal B", BigDecimal.TEN, 10, "APPROVED", true);
            linkMealToCategory(mealA, cuisine);
            linkMealToCategory(mealB, dish);
            seedOrderItem(mealA);
            seedOrderItem(mealB);

            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOrders(10, CategoryType.CUISINE);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).name()).isEqualTo("Cuisine");
        }
    }*/

    // ═══════════════════════════════════════════════════════════
    //  Top categories by offered meals
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Top categories by offered meals")
    class TopByOfferedTests {

        @Test
        @DisplayName("counts only APPROVED and available meals")
        void countsOnlyApprovedAndAvailable() {
            UUID category = seedCategory("Cuisine", CategoryType.CUISINE);

            UUID approvedAvailable = seedMeal("Approved", BigDecimal.TEN, 10, "APPROVED", true);
            UUID approvedUnavailable = seedMeal("Approved off", BigDecimal.TEN, 10, "APPROVED", false);
            UUID pendingAvailable = seedMeal("Pending", BigDecimal.TEN, 10, "PENDING", true);

            linkMealToCategory(approvedAvailable, category);
            linkMealToCategory(approvedUnavailable, category);
            linkMealToCategory(pendingAvailable, category);

            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOfferedMeals(10, CategoryType.CUISINE);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).count()).isEqualTo(1);
        }

        @Test
        @DisplayName("returns empty when nothing qualifies")
        void returnsEmptyWhenNothingQualifies() {
            UUID category = seedCategory("Cuisine", CategoryType.CUISINE);
            UUID pending = seedMeal("Pending", BigDecimal.TEN, 10, "PENDING", true);
            linkMealToCategory(pending, category);

            List<MealStatFilter.StatEntry> result =
                    mealStatRepository.findTopCategoryTypeByOfferedMeals(10, CategoryType.CUISINE);

            assertThat(result).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Min prep time
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Min prep time")
    class MinPrepTimeTests {

        @Test
        @DisplayName("returns the minimum prep time and its count")
        void returnsMinPrepTime() {
            seedMeal("Fast", BigDecimal.TEN, 5, "APPROVED", true);
            seedMeal("Fast2", BigDecimal.TEN, 5, "APPROVED", true);
            seedMeal("Slow", BigDecimal.TEN, 60, "APPROVED", true);

            Optional<MealStatFilter.TimeStat> result = mealStatRepository.findMinPrepTime();

            assertThat(result).isPresent();
            assertThat(result.get().time()).isEqualTo(5);
            assertThat(result.get().count()).isEqualTo(2);
        }

        @Test
        @DisplayName("ignores unavailable and non-approved meals")
        void ignoresUnavailableAndNonApproved() {
            seedMeal("Pending fast", BigDecimal.TEN, 1, "PENDING", true);
            seedMeal("Unavailable fast", BigDecimal.TEN, 2, "APPROVED", false);
            seedMeal("Approved", BigDecimal.TEN, 30, "APPROVED", true);

            Optional<MealStatFilter.TimeStat> result = mealStatRepository.findMinPrepTime();

            assertThat(result).isPresent();
            assertThat(result.get().time()).isEqualTo(30);
        }

        @Test
        @DisplayName("returns empty when nothing qualifies")
        void returnsEmpty() {
            assertThat(mealStatRepository.findMinPrepTime()).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Min price
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Min price")
    class MinPriceTests {

        @Test
        @DisplayName("returns the minimum price and its count")
        void returnsMinPrice() {
            seedMeal("Cheap", new BigDecimal("5.00"), 10, "APPROVED", true);
            seedMeal("Cheap2", new BigDecimal("5.00"), 10, "APPROVED", true);
            seedMeal("Expensive", new BigDecimal("50.00"), 10, "APPROVED", true);

            Optional<MealStatFilter.PriceStat> result = mealStatRepository.findMinPrice();

            assertThat(result).isPresent();
            assertThat(result.get().price()).isEqualTo(5L);
            assertThat(result.get().count()).isEqualTo(2);
        }

        @Test
        @DisplayName("consider only approved meals")
        void ignoresUnavailableAndNonApproved() {
            seedMeal("Pending cheap", new BigDecimal("1.00"), 10, "PENDING", true);
            seedMeal("Unavailable cheap", new BigDecimal("2.00"), 10, "APPROVED", false);
            seedMeal("Approved", new BigDecimal("30.00"), 10, "APPROVED", true);

            Optional<MealStatFilter.PriceStat> result = mealStatRepository.findMinPrice();

            assertThat(result).isPresent();
            assertThat(result.get().price()).isEqualTo(30L);
        }

        @Test
        @DisplayName("returns empty when nothing qualifies")
        void returnsEmpty() {
            assertThat(mealStatRepository.findMinPrice()).isEmpty();
        }
    }
}