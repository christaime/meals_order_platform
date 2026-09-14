package com.mealmarket.meal.domain.model;

/**
 * Represents the type of user performing an action or owning data.
 * Used to identify the origin of reference data and moderation actions.
 */
public enum UserType {

    /**
     * Platform administrator.
     * Can create/modify any data without moderation.
     */
    ADMIN,

    /**
     * Food vendor.
     * Can create meals, distribution locations, and suggest ingredients.
     * Suggested ingredients require moderation.
     */
    VENDOR,

    /**
     * End customer.
     * Cannot create reference data.
     * Reserved for future use (e.g., customer reviews).
     */
    CUSTOMER,

    /**
     * System action (automatic rule, scheduled job, etc.).
     * No user is responsible.
     */
    SYSTEM
}