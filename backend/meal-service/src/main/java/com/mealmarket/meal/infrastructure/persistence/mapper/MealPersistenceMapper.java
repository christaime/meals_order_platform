package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.UUID;

/**
 * Maps between {@link Meal} (domain) and {@link MealEntity} (JPA).
 *
 * Image handling:
 * - {@code imageStorageRef} is a plain String on both sides; MapStruct maps
 *   it 1:1 with no configuration. No URL logic here — URL derivation is a
 *   presentation concern handled in {@code MealDtoMapper}.
 *
 * Relationship handling:
 * - {@code vendor}               (domain object) → {@code vendorId}                (entity UUID)
 * - {@code categories}           (domain list)   → {@code categoryIds}             (entity list)
 * - {@code ingredients}          (domain list)   → {@code ingredientIds}           (entity list)
 * - {@code distributionLocations}(domain list)   → {@code distributionLocationIds} (entity list)
 *
 * On the entity → domain direction, ALL relationships are IGNORED.
 * The adapter loads them separately via their repositories and reassembles
 * the full domain object.
 */
@Mapper(
        componentModel = "spring",
        uses = { VendorPersistenceMapper.class }
)
public interface MealPersistenceMapper {

    MealPersistenceMapper INSTANCE = Mappers.getMapper(MealPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId",              source = "vendor",                 qualifiedByName = "extractVendorId")
    @Mapping(target = "categoryIds",           source = "categories",             qualifiedByName = "extractCategoryIds")
    @Mapping(target = "ingredientIds",         source = "ingredients",            qualifiedByName = "extractIngredientIds")
    @Mapping(target = "distributionLocationIds", source = "distributionLocations", qualifiedByName = "extractLocationIds")
    MealEntity toEntity(Meal meal);

    List<MealEntity> toEntityList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain (lightweight)
    //  All relationships are loaded separately by the adapter.
    //  imageStorageRef maps 1:1 (same name, same type).
    // ═══════════════════════════════════════════════════════════
    @Mapping(target = "id",                    source = "entity.id")
    @Mapping(target = "name",                  source = "entity.name")
    @Mapping(target = "description",           source = "entity.description")
    @Mapping(target = "price",                 source = "entity.price")
    @Mapping(target = "imageStorageRef",       source = "entity.imageStorageRef")
    @Mapping(target = "isAvailable",           source = "entity.isAvailable")
    @Mapping(target = "averageRating",         source = "entity.averageRating")
    @Mapping(target = "totalRatings",          source = "entity.totalRatings")
    @Mapping(target = "prepTimeMinutes",       source = "entity.prepTimeMinutes")
    @Mapping(target = "moderationStatus",      source = "entity.moderationStatus")
    @Mapping(target = "createdAt",             source = "entity.createdAt")
    @Mapping(target = "updatedAt",             source = "entity.updatedAt")
    @Mapping(target = "vendor",                source = "vendor", qualifiedByName = "toMinimalDomain")
    @Mapping(target = "categories",            ignore = true)
    @Mapping(target = "ingredients",           ignore = true)
    @Mapping(target = "distributionLocations", ignore = true)
    Meal toDomain(MealEntity entity, VendorEntity vendor);


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