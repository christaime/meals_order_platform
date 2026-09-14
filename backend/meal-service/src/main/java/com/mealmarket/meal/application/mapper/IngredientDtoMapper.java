package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.IngredientResponse;
import com.mealmarket.meal.application.dto.IngredientSummaryResponse;
import com.mealmarket.meal.domain.model.Ingredient;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link Ingredient} (domain) and its DTOs.
 *
 * The {@code isActive} field in {@link IngredientResponse} is DERIVED
 * from the domain via {@link Ingredient#isActive()}.
 */
@Mapper(componentModel = "spring")
public interface IngredientDtoMapper {

    IngredientDtoMapper INSTANCE = Mappers.getMapper(IngredientDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "isActive", source = ".", qualifiedByName = "deriveIsActive")
    IngredientResponse toResponse(Ingredient ingredient);

    List<IngredientResponse> toResponseList(List<Ingredient> ingredients);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    IngredientSummaryResponse toSummary(Ingredient ingredient);

    List<IngredientSummaryResponse> toSummaryList(List<Ingredient> ingredients);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("deriveIsActive")
    default Boolean deriveIsActive(Ingredient ingredient) {
        return ingredient != null && ingredient.isActive();
    }
}