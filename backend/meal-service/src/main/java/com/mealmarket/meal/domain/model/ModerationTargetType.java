package com.mealmarket.meal.domain.model;

/**
 * Identifies which type of entity a moderation record targets.
 * Using an enum instead of a raw string ensures:
 * - Type safety (no typos like "Ingredient" vs "ingredient")
 * - Central list of all moderable types
 * - Easy iteration for reporting/admin UI
 */
public enum ModerationTargetType {

    /**
     * A meal offered by a vendor.
     */
    MEAL,

    /**
     * An ingredient used in meals.
     */
    INGREDIENT,

    /**
     * A distribution location (branch/kitchen) of a vendor.
     */
    DISTRIBUTION_LOCATION,

    /**
     * A category (cuisine or dish type).
     */
    CATEGORY

}