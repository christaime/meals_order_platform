package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CategoryResponse;
import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.domain.model.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CategoryDtoMapper {

    CategoryDtoMapper INSTANCE = Mappers.getMapper(CategoryDtoMapper.class);

    @Mapping(target = "isActive", source = ".", qualifiedByName = "deriveIsActive")
    CategoryResponse toResponse(Category category);

    List<CategoryResponse> toResponseList(List<Category> categories);

    CategorySummaryResponse toSummary(Category category);

    List<CategorySummaryResponse> toSummaryList(List<Category> categories);

    @Named("deriveIsActive")
    default Boolean deriveIsActive(Category category) {
        return category != null && category.isActive();
    }
}