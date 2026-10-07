package com.mealmarket.meal.application.dto;

import java.util.List;

public record MealStatFilter(
        List<StatEntry> mostDemandedCuisines,
        List<StatEntry> mostDemandedDish,
        TimeStat expressPrepTimeInMinutes,
        PriceStat minMealPrice
) {
    public record StatEntry(String id, String name, long count) {}
    public record TimeStat(int time, long count) {}
    public record PriceStat(long price, long count) {}
}