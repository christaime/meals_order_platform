package com.mealmarket.meal.application.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Vendor dashboard: aggregated statistics for the vendor's home page.
 */
public record VendorDashboardResponse(
        // ─── Menu Stats ────────────────────────────────────────────
        Integer totalMealsCount,
        Integer approvedMealsCount,
        Integer pendingMealsCount,
        Integer availableMealsCount,

        // ─── Ratings ───────────────────────────────────────────────
        Double averageRating,
        Integer totalRatings,
        Integer negativeRatingsCount,

        // ─── Trust Metrics (from state history) ───────────────────
        Integer banCount,
        Integer suspensionCount,

        // ─── Top Meals ─────────────────────────────────────────────
        List<TopMealDto> topSellingMeals,

        // ─── Weekly Trend ──────────────────────────────────────────
        List<DailyOrderVolumeDto> weeklyTrend
) {
    public record TopMealDto(
            UUID mealId,
            String mealName,
            Integer orderCount,
            BigDecimal totalRevenue
    ) {}

    public record DailyOrderVolumeDto(
            String date,
            Integer orderCount,
            BigDecimal revenue
    ) {}
}