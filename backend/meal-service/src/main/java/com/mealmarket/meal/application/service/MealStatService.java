package com.mealmarket.meal.application.service;

import com.mealmarket.meal.application.dto.MealStatFilter;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.repository.MealStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MealStatService {

    private static final int TOP_N = 2;

    private final MealStatRepository statRepository;

    @Transactional(readOnly = true)
    public MealStatFilter computeStats() {
        return new MealStatFilter(
                topCuisines(),
                topDishes(),
                expressPrepTime(),
                minPrice()
        );
    }

    // ── Most demanded cuisines ─────────────────────────────────
    // Ordered meals take precedence. If the system has no orders,
    // fall back to the most-offered cuisines among approved meals.

    private List<MealStatFilter.StatEntry> topCuisines() {
        /*List<MealStatFilter.StatEntry> fromOrders =
                statRepository.findTopCategoryTypeByOrders(TOP_N, CategoryType.CUISINE);
        if (!fromOrders.isEmpty()) return fromOrders;*/

        return statRepository.findTopCategoryTypeByOfferedMeals(TOP_N, CategoryType.CUISINE);
    }

    // ── Most demanded dish types ───────────────────────────────

    private List<MealStatFilter.StatEntry> topDishes() {
        /*List<MealStatFilter.StatEntry> fromOrders =
                statRepository.findTopCategoryTypeByOrders(TOP_N, CategoryType.DISH_TYPE);
        if (!fromOrders.isEmpty()) return fromOrders;*/

        return statRepository.findTopCategoryTypeByOfferedMeals(TOP_N, CategoryType.DISH_TYPE);
    }

    // ── Express prep time among approved meals ─────────────────

    private MealStatFilter.TimeStat expressPrepTime() {
        return statRepository.findMinPrepTime()
                .orElse(new MealStatFilter.TimeStat(0, 0));
    }

    // ── Minimum price among available approved meals ───────────

    private MealStatFilter.PriceStat minPrice() {
        return statRepository.findMinPrice()
                .orElse(new MealStatFilter.PriceStat(0, 0));
    }
}