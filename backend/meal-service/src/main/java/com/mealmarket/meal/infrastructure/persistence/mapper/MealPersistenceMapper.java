package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.UUID;

/**
 * Maps between {@link Meal} (domain) and {@link MealEntity} (JPA).
 *
 * Relationship handling:
 * - {@code vendor}              (domain object)  → {@code vendorId}                 (entity string)
 * - {@code categories}          (domain list)    → {@code categoryIds}              (entity list)
 * - {@code ingredients}         (domain list)    → {@code ingredientIds}            (entity list)
 * - {@code distributionLocations}(domain list)   → {@code distributionLocationIds}  (entity list)
 *
 * On the entity → domain direction, ALL relationships are IGNORED.
 * The adapter loads them separately via their repositories and reassembles
 * the full domain object.
 */
@Mapper(componentModel = "spring")
public interface MealPersistenceMapper {

    MealPersistenceMapper INSTANCE = Mappers.getMapper(MealPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId", source = "vendor", qualifiedByName = "extractVendorId")
    @Mapping(target = "categoryIds", source = "categories", qualifiedByName = "extractCategoryIds")
    @Mapping(target = "ingredientIds", source = "ingredients", qualifiedByName = "extractIngredientIds")
    @Mapping(target = "distributionLocationIds", source = "distributionLocations", qualifiedByName = "extractLocationIds")
    MealEntity toEntity(Meal meal);

    List<MealEntity> toEntityList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain (lightweight)
    //  All relationships are loaded separately by the adapter
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendor", ignore = true)
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    @Mapping(target = "distributionLocations", ignore = true)
    Meal toDomain(MealEntity entity);

    List<Meal> toDomainList(List<MealEntity> entities);

    // ═══════════════════════════════════════════════════════════
    //  Helpers — extract IDs from domain objects
    // ═══════════════════════════════════════════════════════════

    @Named("extractVendorId")
    default UUID extractVendorId(Vendor vendor) {
        return vendor != null ? vendor.getId() : null;
    }

    @Named("extractCategoryIds")
    default List<UUID> extractCategoryIds(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .map(Category::getId)
                .toList();
    }

    @Named("extractIngredientIds")
    default List<UUID> extractIngredientIds(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return List.of();
        }
        return ingredients.stream()
                .map(Ingredient::getId)
                .toList();
    }

    @Named("extractLocationIds")
    default List<UUID> extractLocationIds(List<DistributionLocation> locations) {
        if (locations == null || locations.isEmpty()) {
            return List.of();
        }
        return locations.stream()
                .map(DistributionLocation::getId)
                .toList();
    }
}