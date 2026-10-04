package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.DistributionLocation;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Named;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring",
        uses = { CityDtoMapper.class, CategoryDtoMapper.class, LocationDtoMapper.class })
public interface SharedSummaryMappings {

    @Named("mapCuisines")
    default List<CategorySummaryResponse> mapCuisines(List<Category> categories,
                                                      @Context CategoryDtoMapper mapper) {
        if (categories == null || categories.isEmpty()) return List.of();
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.CUISINE)
                .map(mapper::toSummary)
                .collect(Collectors.toList());
    }

    @Named("mapDishTypes")                                          // ← ADDED
    default List<CategorySummaryResponse> mapDishTypes(List<Category> categories,
                                                       @Context CategoryDtoMapper mapper) {
        if (categories == null || categories.isEmpty()) return List.of();
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.DISH_TYPE)
                .map(mapper::toSummary)
                .collect(Collectors.toList());
    }

    @Named("mapLocationSummaries")
    default List<LocationSummaryResponse> mapLocationSummaries(List<DistributionLocation> locations,
                                                               @Context LocationDtoMapper mapper) {
        if (locations == null || locations.isEmpty()) return List.of();
        return locations.stream()
                .map(mapper::toSummary)
                .collect(Collectors.toList());
    }
}