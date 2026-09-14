package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link Ingredient}.
 * Ingredients are reference data — created by admins (auto-approved)
 * or vendors (pending moderation).
 */
public interface IngredientRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    Ingredient save(Ingredient ingredient);

    Optional<Ingredient> findById(UUID id);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    void delete(Ingredient ingredient);

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness (business rule: name is unique)
    // ═══════════════════════════════════════════════════════════

    Optional<Ingredient> findByName(String name);

    boolean existsByName(String name);

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (relationship assembly in other adapters)
    // ═══════════════════════════════════════════════════════════

    List<Ingredient> findAllById(List<UUID> ids);

    // ═══════════════════════════════════════════════════════════
    //  Moderation Queue (for admin dashboard)
    // ═══════════════════════════════════════════════════════════

    List<Ingredient> findByModerationStatus(ModerationStatus status);

    long countByModerationStatus(ModerationStatus status);

    // ═══════════════════════════════════════════════════════════
    //  Search (single entry point for all filters)
    // ═══════════════════════════════════════════════════════════

    DataPage<Ingredient> search(IngredientSearchRequest request);

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    long count();
}