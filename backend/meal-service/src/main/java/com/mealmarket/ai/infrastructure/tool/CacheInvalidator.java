package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.meal.domain.event.CategoryChangedEvent;
import com.mealmarket.meal.domain.event.IngredientChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Flushes {@link ResolverCache} namespaces when their backing data changes.
 *
 * Events are published by the meal domain (CategoryService, IngredientService,
 * ModerationService) so this listener can live in the AI layer without
 * creating a reverse dependency from meal → ai.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CacheInvalidator {

    public static final String NS_CATEGORY   = "category";
    public static final String NS_INGREDIENT = "ingredient";

    private final ResolverCache cache;

    @EventListener
    public void onCategoryChanged(CategoryChangedEvent event) {
        log.info("[MealMate] invalidating category cache ({} → {})",
                event.changeType(), event.categoryId());
        cache.invalidate(NS_CATEGORY);
    }

    @EventListener
    public void onIngredientChanged(IngredientChangedEvent event) {
        log.info("[MealMate] invalidating ingredient cache ({} → {})",
                event.changeType(), event.ingredientId());
        cache.invalidate(NS_INGREDIENT);
    }
}