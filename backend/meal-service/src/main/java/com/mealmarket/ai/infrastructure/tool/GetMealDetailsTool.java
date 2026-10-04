package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.service.MealService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Returns the full details of a single meal — ingredients, allergens,
 * pickup locations, vendor, price, prep time, and image.
 *
 * Emits a MEALS payload with exactly one card, so the frontend can
 * render it through the same component it uses for search results.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GetMealDetailsTool implements Tool {

    private final MealService mealService;

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "getMealDetails",
                """
                Get the full details of a single meal: ingredients,
                allergens, pickup locations, vendor, price, prep time,
                and image.

                USE WHEN the user asks for more info about a specific
                meal they've seen in a previous search result —
                "où puis-je le récupérer ?", "il contient quoi ?",
                "c'est où ?", "parle-moi de ce plat".

                Requires a mealId. Get it from a searchMeals result.

                Returns the meal with its full pickup locations,
                including names, addresses, and cities.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                Map.entry("mealId", Map.of(
                                        "type", "string",
                                        "description",
                                        "Meal UUID from a previous searchMeals result."
                                ))
                        ),
                        "required", List.of("mealId")
                )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext ctx) {
        UUID mealId = asUuid(args.get("mealId"));
        if (mealId == null) {
            return ToolResult.failure("The 'mealId' argument is required and must be a valid UUID.");
        }

        try {
            MealResponse meal = mealService.getApprovedMealById(mealId);
            Map<String, Object> mealMap = toCardMap(meal);

            StructuredPayload structured = StructuredPayload.of(
                    PayloadTypes.MEALS,
                    Map.of("meals", List.of(mealMap))
            );

            return ToolResult.successWithStructured(
                    "Meal details loaded.",
                    Map.of("meal", mealMap),
                    structured
            );

        } catch (Exception e) {
            log.warn("[MealMate] getMealDetails failed for mealId={}: {}",
                    mealId, e.getMessage());
            return ToolResult.failure(
                    "The meal could not be found. "
                            + "Tell the user the meal may no longer be available."
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Mapping — field names MUST match the frontend MealCard
    // ═══════════════════════════════════════════════════════════

    private Map<String, Object> toCardMap(MealResponse meal) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", meal.id().toString());
        m.put("name", meal.name());
        m.put("description", meal.description() != null ? meal.description() : "");
        m.put("price", meal.price() != null ? meal.price() : 0);
        m.put("imageUrl", meal.imageUrl() != null ? meal.imageUrl() : "");
        m.put("averageRating", meal.averageRating() != null ? meal.averageRating() : 0);
        m.put("totalRatings", meal.totalRatings() != null ? meal.totalRatings() : 0);
        m.put("prepTimeMinutes", meal.prepTimeMinutes() != null ? meal.prepTimeMinutes() : 0);
        m.put("vendorId", meal.vendorId() != null ? meal.vendorId().toString() : "");
        m.put("vendorName", meal.vendorBusinessName() != null
                ? meal.vendorBusinessName() : "");

        m.put("ingredients", meal.ingredients() != null
                ? meal.ingredients().stream()
                .map(i -> Map.of(
                        "id", i.id().toString(),
                        "name", i.name(),
                        "isAllergen", Boolean.TRUE.equals(i.isAllergen())
                ))
                .toList()
                : List.of());

        m.put("locations", meal.distributionLocations() != null
                ? meal.distributionLocations().stream()
                .map(this::locationMap)
                .toList()
                : List.of());

        return m;
    }

    private Map<String, Object> locationMap(
            com.mealmarket.meal.application.dto.LocationSummaryResponse loc) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", loc.id().toString());
        m.put("name", loc.name() != null ? loc.name() : "");
        m.put("address", loc.address() != null ? loc.address() : "");
        m.put("cityName", loc.city() != null && loc.city().name() != null
                ? loc.city().name() : "");
        return m;
    }

    private UUID asUuid(Object v) {
        if (!(v instanceof String s)) return null;
        try { return UUID.fromString(s); }
        catch (IllegalArgumentException e) { return null; }
    }
}