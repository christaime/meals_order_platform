package com.mealmarket.meal.domain.event;

import java.util.UUID;

/**
 * Published whenever an ingredient is created, updated, deleted, or
 * its moderation status changes.
 *
 * Consumed by the AI layer to invalidate the term → ingredient-ids
 * cache. No listener consumes it yet in Phase 3.5 — the ingredient
 * resolver is planned for a later phase — but the event is published
 * now so the contract doesn't have to change later.
 */
public record IngredientChangedEvent(
        UUID ingredientId,
        ChangeType changeType
) {
    public enum ChangeType {
        CREATED,
        UPDATED,
        DELETED,
        STATUS_CHANGED
    }
}