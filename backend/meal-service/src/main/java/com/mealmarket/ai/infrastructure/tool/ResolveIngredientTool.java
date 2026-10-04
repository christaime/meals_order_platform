package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves an ingredient by name — used to translate user terms like
 * "poisson", "arachide", "piment" into the ingredient UUIDs that
 * searchMeals expects.
 *
 * Returns up to 5 matching APPROVED ingredients with id, name, and
 * the isAllergen flag.
 *
 * No LLM involvement — the underlying repository does a
 * case-insensitive keyword match on name.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResolveIngredientTool implements Tool {

    private static final int MAX_RESULTS = 5;

    private final IngredientRepository ingredientRepository;

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "resolveIngredient",
                """
                Find ingredients by name.

                USE WHEN the user names an ingredient to include
                ("avec du poisson") or exclude ("sans arachide").

                Returns up to 5 matching ingredients with id, name,
                and whether each is an allergen.

                Pass the ids to searchMeals:
                - anyIngredientIds  → meal must contain at least one
                - allIngredientIds  → meal must contain every one
                - excludeIngredientIds → meal must contain none

                Returns an empty list if nothing matches.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                Map.entry("term", Map.of(
                                        "type", "string",
                                        "description",
                                        "The ingredient name as the user said it. "
                                                + "Partial names are acceptable."
                                )),
                                Map.entry("allergenOnly", Map.of(
                                        "type", "boolean",
                                        "description",
                                        "Set true to restrict results to allergen "
                                                + "ingredients only. Useful when the user is "
                                                + "declaring an allergy."
                                ))
                        ),
                        "required", List.of("term")
                )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext ctx) {
        String term = asString(args.get("term"));
        if (term == null || term.isBlank()) {
            return ToolResult.failure("The 'term' argument is required.");
        }

        Boolean allergenOnly = asBoolean(args.get("allergenOnly"));

        try {
            IngredientSearchRequest.Builder builder = IngredientSearchRequest.builder()
                    .keyword(term.trim())
                    .moderationStatus(ModerationStatus.APPROVED)
                    .page(0, MAX_RESULTS);

            // Push the allergen filter to the DB when possible.
            // Falls back to in-memory filtering if the criteria
            // does not have an isAllergen field.
            if (Boolean.TRUE.equals(allergenOnly)) {
                builder.isAllergen(true);
            }

            DataPage<Ingredient> page = ingredientRepository.search(builder.build());

            List<Map<String, Object>> matches = page.getContent().stream()
                    .filter(i -> allergenOnly == null
                            || !allergenOnly
                            || Boolean.TRUE.equals(i.getIsAllergen()))
                    .map(this::summarize)
                    .toList();

            return ToolResult.success(
                    matches.isEmpty()
                            ? "No ingredient matched."
                            : "Matched " + matches.size() + " ingredient(s).",
                    Map.of("ingredients", matches)
            );

        } catch (Exception e) {
            log.error("[MealMate] resolveIngredient failed for '{}': {}",
                    term, e.getMessage(), e);
            return ToolResult.failure("The ingredient lookup failed.");
        }
    }

    private Map<String, Object> summarize(Ingredient i) {
        var summary = new LinkedHashMap<String, Object>();
        summary.put("id", i.getId().toString());
        summary.put("name", i.getName());
        summary.put("isAllergen", Boolean.TRUE.equals(i.getIsAllergen()));
        return summary;
    }

    // ═══════════════════════════════════════════════════════════
    //  Type coercion
    // ═══════════════════════════════════════════════════════════

    private String asString(Object v) {
        return v instanceof String s ? s : null;
    }

    private Boolean asBoolean(Object v) {
        if (v instanceof Boolean b) return b;
        if (v instanceof String s) {
            if ("true".equalsIgnoreCase(s)) return Boolean.TRUE;
            if ("false".equalsIgnoreCase(s)) return Boolean.FALSE;
        }
        return null;
    }
}