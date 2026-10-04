package com.mealmarket.meal.domain.event;

import java.util.UUID;

/**
 * Published whenever a category is created, updated, deleted, or its
 * moderation status changes.
 *
 * Consumed by the AI layer to invalidate the term → category-ids cache.
 * meal-service does not know about the cache itself — the event is the
 * only contract between the two layers.
 */
public record CategoryChangedEvent(
        UUID categoryId,
        ChangeType changeType
) {
    public enum ChangeType {
        CREATED,
        UPDATED,
        DELETED,
        STATUS_CHANGED
    }
}