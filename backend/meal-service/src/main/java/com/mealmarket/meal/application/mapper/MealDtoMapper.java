package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.IngredientSummaryResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.MealSummaryResponse;
import com.mealmarket.meal.domain.model.*;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps between {@link Meal} (domain) and its DTOs.
 *
 * Image handling:
 * - {@code imageStorageRef} passes through untouched.
 * - {@code imageUrl} is computed via {@link MediaUrlResolver}.
 *
 * Category / location collections are mapped by the shared helpers in
 * {@link SharedSummaryMappings}, which delegate to {@link CategoryDtoMapper}
 * and {@link LocationDtoMapper} — so a new field on those response records
 * only needs adding in one place.
 *
 * Ingredient summarization and count helpers stay local to this mapper:
 * they are Meal-only concerns.
 */
@Mapper(
        componentModel = "spring",
        uses = { MediaUrlResolver.class, SharedSummaryMappings.class }
)
public interface MealDtoMapper {

    MealDtoMapper INSTANCE = Mappers.getMapper(MealDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId",            source = "vendor.id")
    @Mapping(target = "vendorBusinessName",  source = "vendor.businessName")

    @Mapping(target = "imageUrl",            source = "imageStorageRef", qualifiedByName = "toUrl")
    @Mapping(target = "imageStorageRef",     source = "imageStorageRef")

    @Mapping(target = "cuisines",              source = "categories",            qualifiedByName = "mapCuisines")
    @Mapping(target = "dishTypes",             source = "categories",            qualifiedByName = "mapDishTypes")
    @Mapping(target = "ingredients",           source = "ingredients",           qualifiedByName = "mapIngredientSummaries")
    @Mapping(target = "distributionLocations", source = "distributionLocations", qualifiedByName = "mapLocationSummaries")
    @Mapping(target = "isActive",              source = ".",                     qualifiedByName = "deriveIsActive")

    @Mapping(target = "ingredientCount",           source = "ingredients",           qualifiedByName = "countIngredient")
    @Mapping(target = "distributionLocationCount", source = "distributionLocations", qualifiedByName = "countLocation")
    @Mapping(target = "allergenIngredientCount",   source = "ingredients",           qualifiedByName = "countAllergen")
    MealResponse toResponse(
            Meal meal,
            @Context CategoryDtoMapper categoryMapper,
            @Context LocationDtoMapper locationMapper
    );

    List<MealResponse> toResponseList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId",            source = "vendor.id")
    @Mapping(target = "vendorBusinessName",  source = "vendor.businessName")

    @Mapping(target = "imageUrl",            source = "imageStorageRef", qualifiedByName = "toUrl")

    @Mapping(target = "cuisines",                  source = "categories",            qualifiedByName = "mapCuisines")
    @Mapping(target = "dishTypes",                 source = "categories",            qualifiedByName = "mapDishTypes")
    @Mapping(target = "ingredientCount",           source = "ingredients",           qualifiedByName = "countIngredient")
    @Mapping(target = "distributionLocationCount", source = "distributionLocations", qualifiedByName = "countLocation")
    @Mapping(target = "allergenIngredientCount",   source = "ingredients",           qualifiedByName = "countAllergen")
    MealSummaryResponse toSummary(
            Meal meal,
            @Context CategoryDtoMapper categoryMapper
    );

    List<MealSummaryResponse> toSummaryList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Helpers — Meal-specific only
    // ═══════════════════════════════════════════════════════════

    @Named("countIngredient")
    default Integer countIngredient(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) return 0;
        return ingredients.size();
    }

    @Named("countLocation")
    default Integer countLocation(List<DistributionLocation> distributionLocations) {
        if (distributionLocations == null || distributionLocations.isEmpty()) return 0;
        return distributionLocations.size();
    }

    @Named("countAllergen")
    default Integer countAllergen(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) return 0;
        return (int) ingredients.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsAllergen()))
                .count();
    }

    @Named("mapIngredientSummaries")
    default List<IngredientSummaryResponse> mapIngredientSummaries(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) return List.of();
        return ingredients.stream()
                .map(i -> new IngredientSummaryResponse(
                        i.getId(),
                        i.getName(),
                        i.getIsAllergen(),
                        i.getModerationStatus()
                ))
                .collect(Collectors.toList());
    }

    @Named("deriveIsActive")
    default Boolean deriveIsActive(Meal meal) {
        return meal != null && meal.isActive();
    }
}