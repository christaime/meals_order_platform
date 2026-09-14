package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.infrastructure.persistence.entity.CategoryEntity;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link Category} (domain) and {@link CategoryEntity} (JPA).
 *
 * Category is a standalone entity — no relationships to load.
 * All fields are simple and map directly.
 */
@Mapper(componentModel = "spring")
public interface CategoryPersistenceMapper {

    CategoryPersistenceMapper INSTANCE = Mappers.getMapper(CategoryPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    CategoryEntity toEntity(Category category);

    List<CategoryEntity> toEntityList(List<Category> categories);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain
    // ═══════════════════════════════════════════════════════════

    Category toDomain(CategoryEntity entity);

    List<Category> toDomainList(List<CategoryEntity> entities);
}