package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MealJpaRepository
        extends JpaRepository<MealEntity, UUID>,
        JpaSpecificationExecutor<MealEntity> {

    // ─── Uniqueness (per vendor, case-insensitive) ────────────

    boolean existsByVendorIdAndNameIgnoreCase(UUID vendorId, String name);

    @Query("SELECT COUNT(m) > 0 FROM MealEntity m WHERE :categoryId MEMBER OF m.categoryIds")
    boolean existsByCategoryId(@Param("categoryId") UUID categoryId);

    @Query("SELECT COUNT(m) > 0 FROM MealEntity m WHERE :ingredientId MEMBER OF m.ingredientIds")
    boolean existsByIngredientId(@Param("ingredientId") UUID ingredientId);
    // ─── Vendor Queries ───────────────────────────────────────

    List<MealEntity> findByVendorId(UUID vendorId);

    /**
     * Count all meals for a vendor (regardless of availability).
     */
    long countByVendorId(UUID vendorId);

    /**
     * Count only available meals for a vendor.
     */
    long countByVendorIdAndIsAvailable(UUID vendorId, Boolean isAvailable);

    // ─── Bulk Lookup (relationship assembly) ──────────────────

    List<MealEntity> findByIdIn(List<UUID> ids);

    // ─── Rating Queries ───────────────────────────────────────

    List<MealEntity> findTop10ByOrderByAverageRatingDesc();

    // ─── Updates ──────────────────────────────────────────────

    @Modifying
    @Query("UPDATE MealEntity m SET m.averageRating = :rating WHERE m.id = :mealId")
    void updateAverageRating(@Param("mealId") UUID mealId, @Param("rating") BigDecimal rating);

    @Modifying
    @Query("UPDATE MealEntity m SET m.totalRatings = m.totalRatings + 1 WHERE m.id = :mealId")
    void incrementTotalRatings(@Param("mealId") UUID mealId);
}