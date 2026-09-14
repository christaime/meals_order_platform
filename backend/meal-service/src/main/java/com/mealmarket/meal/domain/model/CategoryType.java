package com.mealmarket.meal.domain.model;

/**
 * Classifies the purpose of a {@link Category}.
 *
 * A category is a single unified concept (name + description + icon),
 * but its intended usage varies. The type tells consumers how to
 * interpret and where to apply the category.
 *
 * Example:
 *   Category(name="Cameroonian", type=CUISINE)  → applies to Vendor & Meal
 *   Category(name="Main Dish",   type=DISH_TYPE) → applies to Meal only
 */
public enum CategoryType {

    /**
     * Cultural origin of the food.
     *
     * Represents where the food comes from culturally.
     * Answers the question: "What style of food is this?"
     *
     * Applied to:
     * - {@link Vendor}  → cuisines the vendor cooks
     * - {@link Meal}    → cuisine of this specific dish
     *
     * Examples: "Cameroonian", "African", "Italian", "Asian", "French"
     */
    CUISINE,

    /**
     * Structural role of the dish.
     *
     * Represents what kind of dish this is within a meal.
     * Answers the question: "What part of the meal is this?"
     *
     * Applied to:
     * - {@link Meal} only
     *
     * Examples: "Main Dish", "Appetizer", "Dessert", "Beverage", "Snack"
     */
    DISH_TYPE

    // ─── Future extensions (not implemented yet) ─────────────
    //
    // DIETARY  → "Vegan", "Halal", "Gluten-Free" (applies to Meal)
    // OCCASION → "Breakfast", "Lunch", "Dinner" (applies to Meal)
}