package com.mealmarket.meal.domain.repository;

import com.mealmarket.meal.application.dto.MealStatFilter;
import com.mealmarket.meal.domain.model.CategoryType;

import java.util.List;
import java.util.Optional;

public interface MealStatRepository {

    List<MealStatFilter.StatEntry> findTopCategoryTypeByOrders(int limit, CategoryType type);

    List<MealStatFilter.StatEntry> findTopCategoryTypeByOfferedMeals(int limit, CategoryType type);

    Optional<MealStatFilter.TimeStat> findMinPrepTime();

    Optional<MealStatFilter.PriceStat> findMinPrice();
}