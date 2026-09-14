package com.mealmarket.meal.domain.model;

/**
 * Subscription tiers for vendors.
 *
 * Each tier defines quotas (meals, locations) that limit what a vendor
 * can publish. Enforcement is planned for Phase 2 — for now, the tier is
 * stored and displayed but not enforced.
 *
 * Tier definitions:
 * - FREE:       Entry-level, default on registration
 * - STARTER:    Small vendors scaling up
 * - PRO:        Established vendors with larger catalogs
 * - ENTERPRISE: Unlimited
 */
public enum SubscriptionTier {

    FREE,
    STARTER,
    PRO,
    ENTERPRISE;

    /**
     * Maximum number of meals a vendor can have for this tier.
     * Not enforced yet — used by Phase 2 quota logic and by the UI.
     */
    public int maxMeals() {
        return switch (this) {
            case FREE -> 10;
            case STARTER -> 50;
            case PRO -> 200;
            case ENTERPRISE -> Integer.MAX_VALUE;
        };
    }

    /**
     * Maximum number of distribution locations a vendor can have for this tier.
     */
    public int maxLocations() {
        return switch (this) {
            case FREE -> 1;
            case STARTER -> 3;
            case PRO -> 10;
            case ENTERPRISE -> Integer.MAX_VALUE;
        };
    }
}