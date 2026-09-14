package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(

        @NotBlank(message = "Category name is required")
        @Size(min = 2, max = 50, message = "Category name must be between 2 and 50 characters")
        String name,

        @Size(max = 255, message = "Description cannot exceed 255 characters")
        String description,

        @Size(max = 500, message = "Icon URL cannot exceed 500 characters")
        String iconUrl,

        @NotNull(message = "Category type is required")
        CategoryType type
) {}