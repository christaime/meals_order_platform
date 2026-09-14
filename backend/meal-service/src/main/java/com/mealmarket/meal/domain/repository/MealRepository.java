package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link Meal}.
 * Meals are the core product being sold on the marketplace.
 */
public interface MealRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    Meal save(Meal meal);

    Optional<Meal> findById(UUID id);

    Optional<Meal> findByIdWithDetails(UUID id);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    void delete(Meal meal);

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness (business rule: name is unique per vendor)
    // ═══════════════════════════════════════════════════════════

    boolean existsByVendorIdAndName(UUID vendorId, String name);

    boolean existsByCategoryId(UUID categoryId);

    boolean existsByIngredientId(UUID ingredientId);
    // ═══════════════════════════════════════════════════════════
    //  Vendor-Scoped Queries
    // ═══════════════════════════════════════════════════════════

    List<Meal> findByVendorId(UUID vendorId);

    /**
     * Count all meals (regardless of availability) for a vendor.
     */
    long countByVendorId(UUID vendorId);

    /**
     * Count only available meals for a vendor.
     */
    long countAvailableByVendorId(UUID vendorId);

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (relationship assembly)
    // ═══════════════════════════════════════════════════════════

    List<Meal> findAllById(List<UUID> ids);

    // ═══════════════════════════════════════════════════════════
    //  Category Queries
    // ═══════════════════════════════════════════════════════════

    List<Category> findCategoriesByMealIdAndType(UUID mealId, CategoryType type);

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    DataPage<Meal> search(MealSearchRequest request);

    // ═══════════════════════════════════════════════════════════
    //  Updates
    // ═══════════════════════════════════════════════════════════

    void updateAverageRating(UUID mealId, Double newRating);

    void incrementTotalRatings(UUID mealId);

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    long count();
}