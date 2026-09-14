package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.infrastructure.persistence.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryJpaRepository
        extends JpaRepository<CategoryEntity, UUID>,
        JpaSpecificationExecutor<CategoryEntity> {

    // ─── Uniqueness ───────────────────────────────────────────

    Optional<CategoryEntity> findByNameAndType(String name, CategoryType type);

    boolean existsByNameAndType(String name, CategoryType type);

    // ─── Bulk Lookup (relationship assembly) ──────────────────

    List<CategoryEntity> findByIdIn(List<UUID> ids);

    // ─── Statistics ───────────────────────────────────────────

    long countByType(CategoryType type);
}