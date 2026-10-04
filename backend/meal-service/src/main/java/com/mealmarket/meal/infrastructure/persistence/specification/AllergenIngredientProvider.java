package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Caches the set of allergen ingredient ids.
 *
 * The set is small (~20 items) and changes rarely. Loading it once
 * per ingredient mutation keeps the meal search cheap: the
 * hasAllergens predicate uses MEMBER OF against this set, without a
 * per-query subquery.
 *
 * Refreshed on IngredientChangedEvent — same mechanism as the AI
 * resolver cache.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AllergenIngredientProvider {

    private final IngredientRepository ingredientRepository;

    /** Lazily populated; refreshed on ingredient mutations. */
    private final AtomicReference<Set<UUID>> cache = new AtomicReference<>();

    /**
     * The current set of allergen ingredient ids (APPROVED only).
     * Loads on first call; subsequently served from cache.
     */
    public Set<UUID> allergenIngredientIds() {
        Set<UUID> current = cache.get();
        if (current != null) {
            return current;
        }
        return loadAndCache();
    }

    /**
     * Refresh the cache — called when an ingredient is created,
     * updated, or its moderation status changes.
     */
    public void refresh() {
        loadAndCache();
        log.info("[MealSpecification] allergen ingredient cache refreshed");
    }

    private Set<UUID> loadAndCache() {
        Set<UUID> ids = ingredientRepository.findByModerationStatusAndIsAllergen(ModerationStatus.APPROVED, true).stream()
                .map(Ingredient::getId)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());

        cache.set(ids);
        return ids;
    }

    /**
     * Refresh when the ingredient catalogue changes.
     * Reuses the domain event published by IngredientService /
     * ModerationService. If the event type isn't wired yet, use
     * {@code @Scheduled} polling or expose a manual refresh endpoint.
     */
    @EventListener
    public void onIngredientChanged(
            com.mealmarket.meal.domain.event.IngredientChangedEvent event
    ) {
        refresh();
    }
}