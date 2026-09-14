package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link Category}.
 * Categories are admin-managed reference data (CUISINE / DISH_TYPE).
 */
public interface CategoryRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    Category save(Category category);

    Optional<Category> findById(UUID id);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    void delete(Category category);

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness (business rule: (name, type) is unique)
    // ═══════════════════════════════════════════════════════════

    Optional<Category> findByNameAndType(String name, CategoryType type);

    boolean existsByNameAndType(String name, CategoryType type);

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (relationship assembly in other adapters)
    // ═══════════════════════════════════════════════════════════

    List<Category> findAllById(List<UUID> ids);

    // ═══════════════════════════════════════════════════════════
    //  Search (single entry point for all filters)
    // ═══════════════════════════════════════════════════════════

    DataPage<Category> search(CategorySearchRequest request);

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    long count();

    long countByType(CategoryType type);
}