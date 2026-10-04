package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.infrastructure.persistence.entity.IngredientEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IngredientJpaRepository
        extends JpaRepository<IngredientEntity, UUID>,
        JpaSpecificationExecutor<IngredientEntity> {

    // ─── Uniqueness ───────────────────────────────────────────

    Optional<IngredientEntity> findByName(String name);

    boolean existsByName(String name);

    // ─── Bulk Lookup (relationship assembly) ──────────────────

    List<IngredientEntity> findByIdIn(List<UUID> ids);

    // ─── Moderation Queue ─────────────────────────────────────

    List<IngredientEntity> findByModerationStatusOrderByCreatedAtAsc(ModerationStatus status);

    @Query("""
            SELECT i FROM IngredientEntity i
            WHERE i.moderationStatus = :status
              AND i.isAllergen = :isAllergen
    """)
    List<IngredientEntity> findByModerationStatusAndIsAllergen(
            @Param("status") ModerationStatus status,
            @Param("isAllergen") boolean isAllergen
    );

    long countByModerationStatus(ModerationStatus status);
}