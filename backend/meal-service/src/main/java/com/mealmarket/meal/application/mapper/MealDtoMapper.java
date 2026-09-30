package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.IngredientSummaryResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.MealSummaryResponse;
import com.mealmarket.meal.domain.model.*;
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
 * - {@code imageStorageRef} passes through untouched (the editor needs it for round-trip).
 * - {@code imageUrl} is computed via {@link MediaUrlResolver}, which delegates to
 *   the {@code MediaStoragePort}. Never persisted; always derived at read time.
 *
 * Handles:
 * - Vendor flattening (Vendor → vendorId + vendorBusinessName)
 * - Category splitting (categories → cuisines + dishTypes)
 * - Ingredient summarization
 * - Location summarization
 * - Derived isActive
 */
@Mapper(componentModel = "spring", uses = MediaUrlResolver.class)
public interface MealDtoMapper {

    MealDtoMapper INSTANCE = Mappers.getMapper(MealDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId", source = "vendor.id")
    @Mapping(target = "vendorBusinessName", source = "vendor.businessName")

    @Mapping(target = "imageUrl",        source = "imageStorageRef", qualifiedByName = "toUrl")
    @Mapping(target = "imageStorageRef", source = "imageStorageRef")

    @Mapping(target = "cuisines",              source = "categories",            qualifiedByName = "mapCuisines")
    @Mapping(target = "dishTypes",             source = "categories",            qualifiedByName = "mapDishTypes")
    @Mapping(target = "ingredients",           source = "ingredients",           qualifiedByName = "mapIngredientSummaries")
    @Mapping(target = "distributionLocations", source = "distributionLocations", qualifiedByName = "mapLocationSummaries")
    @Mapping(target = "isActive",              source = ".",                     qualifiedByName = "deriveIsActive")
    @Mapping(target = "ingredientCount", ignore = true)
    @Mapping(target = "distributionLocationCount", ignore = true)
    @Mapping(target = "allergenIngredientCount", ignore = true)
    MealResponse toResponse(Meal meal);

    List<MealResponse> toResponseList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId", source = "vendor.id")
    @Mapping(target = "vendorBusinessName", source = "vendor.businessName")

    @Mapping(target = "imageUrl", source = "imageStorageRef", qualifiedByName = "toUrl")

    @Mapping(target = "cuisines",  source = "categories", qualifiedByName = "mapCuisines")
    @Mapping(target = "dishTypes", source = "categories", qualifiedByName = "mapDishTypes")
    @Mapping(target = "ingredientCount", source = "ingredients",           qualifiedByName = "countIngredient")
    @Mapping(target = "distributionLocationCount", source = "distributionLocations",           qualifiedByName = "countLocation")
    @Mapping(target = "allergenIngredientCount", source = "ingredients",           qualifiedByName = "countAllergen")
    MealSummaryResponse toSummary(Meal meal);

    List<MealSummaryResponse> toSummaryList(List<Meal> meals);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════
    @Named("countIngredient")
    default Integer countIngredient(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return 0;
        }
        return ingredients.size();
    }

    @Named("countLocation")
    default Integer countLocation(List<DistributionLocation> distributionLocations) {
        if (distributionLocations == null || distributionLocations.isEmpty()) {
            return 0;
        }
        return distributionLocations.size();
    }

    @Named("countAllergen")
    default Integer countAllergen(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return 0;
        }
        Long count = ingredients.stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsAllergen())).count();
        return count.intValue();
    }


    @Named("mapCuisines")
    default List<CategorySummaryResponse> mapCuisines(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.CUISINE)
                .map(c -> new CategorySummaryResponse(
                        c.getId(),
                        c.getName(),
                        c.getIconUrl(),
                        c.getType()
                ))
                .collect(Collectors.toList());
    }

    @Named("mapDishTypes")
    default List<CategorySummaryResponse> mapDishTypes(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.DISH_TYPE)
                .map(c -> new CategorySummaryResponse(
                        c.getId(),
                        c.getName(),
                        c.getIconUrl(),
                        c.getType()
                ))
                .collect(Collectors.toList());
    }

    @Named("mapIngredientSummaries")
    default List<IngredientSummaryResponse> mapIngredientSummaries(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return List.of();
        }
        return ingredients.stream()
                .map(i -> new IngredientSummaryResponse(
                        i.getId(),
                        i.getName(),
                        i.getIsAllergen(),
                        i.getModerationStatus()
                ))
                .collect(Collectors.toList());
    }

    @Named("mapLocationSummaries")
    default List<LocationSummaryResponse> mapLocationSummaries(List<DistributionLocation> locations) {
        if (locations == null || locations.isEmpty()) {
            return List.of();
        }
        return locations.stream()
                .map(loc -> new LocationSummaryResponse(
                        loc.getId(),
                        loc.getName(),
                        loc.getAddress(),
                        loc.getModerationStatus()
                ))
                .collect(Collectors.toList());
    }

    @Named("deriveIsActive")
    default Boolean deriveIsActive(Meal meal) {
        return meal != null && meal.isActive();
    }
}