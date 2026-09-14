package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.infrastructure.persistence.entity.IngredientEntity;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link Ingredient} (domain) and {@link IngredientEntity} (JPA).
 *
 * Ingredient is a standalone entity — no relationships to load.
 * All fields map directly, including moderation metadata.
 */
@Mapper(componentModel = "spring")
public interface IngredientPersistenceMapper {

    IngredientPersistenceMapper INSTANCE = Mappers.getMapper(IngredientPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    IngredientEntity toEntity(Ingredient ingredient);

    List<IngredientEntity> toEntityList(List<Ingredient> ingredients);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain
    // ═══════════════════════════════════════════════════════════

    Ingredient toDomain(IngredientEntity entity);

    List<Ingredient> toDomainList(List<IngredientEntity> entities);
}