package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.MealSummaryResponse;
import com.mealmarket.meal.application.service.MealService;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Searches visible meals (APPROVED + available + ACTIVE vendor).
 *
 * Exposes every filter of {@link MealSearchRequest} that makes sense
 * for a customer-facing conversational search:
 *
 *   - keyword                  — free-text on name + description
 *   - categoryIds              — cuisines and dish types (unified)
 *   - anyIngredientIds         — OR  — contains at least one
 *   - allIngredientIds         — AND — contains every one
 *   - excludeIngredientIds     — NOT — contains none
 *   - hasAllergens             — presence of any allergen ingredient
 *   - vendorId                 — restricted to one vendor
 *   - distributionLocationIds  — pickable up at any of these
 *   - minPrice / maxPrice      — budget range
 *   - sortBy / sortDir / limit — result shaping
 *
 * The tool is a thin shaper: it converts the LLM's arguments into a
 * {@link MealSearchRequest} and formats the result. All validation
 * and business rules live in {@link MealService} and the criteria.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SearchMealsTool implements Tool {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 20;

    /**
     * Sortable fields, sourced from the criteria class — single
     * source of truth.
     */
    private static final List<String> SORTABLE =
            MealSearchRequest.SORTABLE_PROPERTIES.stream().sorted().toList();

    private final MealService mealService;

    // ═══════════════════════════════════════════════════════════
    //  Tool definition
    // ═══════════════════════════════════════════════════════════

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "searchMeals",
                """
                Search meals by name, category, ingredient, budget,
                vendor, or pickup location.

                USE FOR:
                - A specific dish ("Taro sauce jaune", "Poulet DG") →
                  keyword.
                - A cuisine or dish type ("bamiléké", "dessert") →
                  resolve the category first, pass categoryIds.
                - "avec X" / "X ou Y" → anyIngredientIds.
                - "X et Y" (composite dish, e.g. "Koki plantain") →
                  allIngredientIds.
                - "sans X" → excludeIngredientIds.
                - A vague request ("j'ai faim") →
                  sortBy="averageRating", sortDir="DESC", limit=3.
                - "les mieux notés" → sortBy="averageRating", DESC.
                - "le moins cher" → sortBy="price", ASC.
                - "le plus rapide" → sortBy="prepTimeMinutes", ASC.

                Returns up to `limit` meals with id, name, price (XAF),
                vendor, rating, prep time.

                If empty, tell the user and suggest alternatives.
                Do not invent meals.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                // ─── Text / price ────────────────────────
                                Map.entry("keyword", Map.of(
                                        "type", "string",
                                        "description",
                                        "Free-text search across meal names and "
                                                + "descriptions. Prefer concrete dish names over "
                                                + "regional terms."
                                )),
                                Map.entry("minPrice", Map.of(
                                        "type", "number",
                                        "description",
                                        "Minimum price in XAF. Set only when the user asks "
                                                + "for something above a floor ('au moins 5000')."
                                )),
                                Map.entry("maxPrice", Map.of(
                                        "type", "number",
                                        "description",
                                        "Maximum price in XAF. Set when the user mentions "
                                                + "a budget. 'pas cher' → 2000, 'moins de 5000' → 5000."
                                )),

                                // ─── Category ────────────────────────────
                                Map.entry("categoryIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"),
                                        "description",
                                        "Category UUIDs from resolveCategory. Covers both "
                                                + "cuisines and dish types. A meal matches if it "
                                                + "belongs to ANY of these categories."
                                )),

                                // ─── Ingredients (three modes) ───────────
                                Map.entry("anyIngredientIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"),
                                        "description",
                                        "Ingredient UUIDs from resolveIngredient. The meal "
                                                + "must contain AT LEAST ONE. Use for 'du poisson OU "
                                                + "du poulet'. For a single ingredient, use this "
                                                + "field rather than allIngredientIds."
                                )),
                                Map.entry("allIngredientIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"),
                                        "description",
                                        "Ingredient UUIDs from resolveIngredient. The meal "
                                                + "must contain EVERY one. Use for composite dishes: "
                                                + "'Koki plantain' (both koki AND plantain). Excludes "
                                                + "'Koki manioc' which has only one."
                                )),
                                Map.entry("excludeIngredientIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"),
                                        "description",
                                        "Ingredient UUIDs from resolveIngredient. Meals "
                                                + "containing ANY of these are filtered out. Use for "
                                                + "allergens or dislikes. Prefer this over "
                                                + "hasAllergens when you have the specific id."
                                )),
                                Map.entry("hasAllergens", Map.of(
                                        "type", "boolean",
                                        "description",
                                        "Set false to return only allergen-free meals. "
                                                + "Set true to return only meals with allergens. "
                                                + "Leave unset for no constraint. Use false as a "
                                                + "coarse fallback when the user mentions an allergy "
                                                + "and no ingredient id is available."
                                )),

                                // ─── Vendor ──────────────────────────────
                                Map.entry("vendorId", Map.of(
                                        "type", "string",
                                        "description",
                                        "Restrict to meals from a specific vendor (UUID). "
                                                + "Set only when the user names a vendor and you "
                                                + "have resolved its id."
                                )),

                                // ─── Location ────────────────────────────
                                Map.entry("distributionLocationIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"),
                                        "description",
                                        "Location UUIDs from resolveLocation. A meal "
                                                + "matches if it can be picked up at ANY of them. "
                                                + "Pass every id returned by resolveLocation — "
                                                + "otherwise you miss results."
                                )),

                                // ─── Sort / limit ────────────────────────
                                Map.entry("sortBy", Map.of(
                                        "type", "string",
                                        "enum", SORTABLE,
                                        "description",
                                        "Field to sort by. averageRating for best-rated, "
                                                + "price for cheapest, prepTimeMinutes for fastest, "
                                                + "name for alphabetical."
                                )),
                                Map.entry("sortDir", Map.of(
                                        "type", "string",
                                        "enum", List.of("ASC", "DESC"),
                                        "description",
                                        "Sort direction. DESC for averageRating, ASC for name."
                                )),
                                Map.entry("limit", Map.of(
                                        "type", "integer",
                                        "description",
                                        "Maximum results (1–20). Default 10. Use 3 when "
                                                + "proposing options to a vague request."
                                ))
                        ),
                        "required", List.of()
                )
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Execution
    // ═══════════════════════════════════════════════════════════

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext context) {
        try {
            MealSearchRequest request = buildRequest(args);

            DataPage<MealSummaryResponse> page = mealService.searchApprovedMeals(request);

            List<Map<String, Object>> meals = page.getContent().stream()
                    .map(this::summarize)
                    .toList();

            if (meals.isEmpty()) {
                return ToolResult.success(
                        "No meals matched the search.",
                        Map.of("meals", List.of(), "totalMatched", 0L)
                );
            }

            Map<String, Object> data = Map.of(
                    "meals", meals,
                    "totalMatched", page.getTotalElements(),
                    "returned", meals.size()
            );

            StructuredPayload structured = StructuredPayload.of(
                    PayloadTypes.MEALS,
                    Map.of("meals", meals)     // just the payload the frontend needs
            );

            return ToolResult.successWithStructured(
                    "Found " + meals.size() + " meals.",
                    data,
                    structured
            );

        } catch (Exception e) {
            log.warn("[MealMate] searchMeals failed: {}", e.getMessage(), e);
            return ToolResult.failure(
                    "The meal search could not be completed. "
                            + "Tell the user you had a technical issue and suggest they try again."
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Argument handling
    // ═══════════════════════════════════════════════════════════

    private MealSearchRequest buildRequest(Map<String, Object> args) {
        int pageSize = resolveLimit(args.get("limit"));

        var builder = MealSearchRequest.builder()
                .moderationStatus(ModerationStatus.APPROVED)
                .isAvailable(true)
                .page(0, pageSize);

        // ─── Text / price ────────────────────────────────────
        String keyword = asString(args.get("keyword"));
        if (keyword != null && !keyword.isBlank()) {
            builder.keyword(keyword.trim());
        }

        BigDecimal minPrice = asBigDecimal(args.get("minPrice"));
        if (minPrice != null) {
            builder.minPrice(minPrice);
        }

        BigDecimal maxPrice = asBigDecimal(args.get("maxPrice"));
        if (maxPrice != null) {
            builder.maxPrice(maxPrice);
        }

        // ─── Category ────────────────────────────────────────
        List<UUID> categoryIds = asUuidList(args.get("categoryIds"));
        if (categoryIds != null && !categoryIds.isEmpty()) {
            builder.categoryIds(categoryIds);
        }

        // ─── Ingredients (three modes) ───────────────────────
        List<UUID> anyIngredientIds = asUuidList(args.get("anyIngredientIds"));
        if (anyIngredientIds != null && !anyIngredientIds.isEmpty()) {
            builder.anyIngredientIds(anyIngredientIds);
        }

        List<UUID> allIngredientIds = asUuidList(args.get("allIngredientIds"));
        if (allIngredientIds != null && !allIngredientIds.isEmpty()) {
            builder.allIngredientIds(allIngredientIds);
        }

        List<UUID> excludeIngredientIds = asUuidList(args.get("excludeIngredientIds"));
        if (excludeIngredientIds != null && !excludeIngredientIds.isEmpty()) {
            builder.excludeIngredientIds(excludeIngredientIds);
        }

        Boolean hasAllergens = asBoolean(args.get("hasAllergens"));
        if (hasAllergens != null) {
            builder.hasAllergens(hasAllergens);
        }

        // ─── Vendor ──────────────────────────────────────────
        UUID vendorId = asUuid(args.get("vendorId"));
        if (vendorId != null) {
            builder.vendorId(vendorId);
        }

        // ─── Location ────────────────────────────────────────
        List<UUID> distributionLocationIds = asUuidList(args.get("distributionLocationIds"));
        if (distributionLocationIds != null && !distributionLocationIds.isEmpty()) {
            builder.distributionLocationIds(distributionLocationIds);
        }

        // ─── Sort ────────────────────────────────────────────
        applySort(builder, args);

        return builder.build();
    }

    private void applySort(MealSearchRequest.Builder builder, Map<String, Object> args) {
        String sortBy = asString(args.get("sortBy"));
        if (sortBy == null || !SORTABLE.contains(sortBy)) {
            return;
        }
        String sortDirRaw = asString(args.get("sortDir"));
        var direction = "ASC".equalsIgnoreCase(sortDirRaw)
                ? com.mealmarket.common.pagination.Sort.Direction.ASC
                : com.mealmarket.common.pagination.Sort.Direction.DESC;

        builder.sortBy(sortBy, direction);
    }

    private int resolveLimit(Object raw) {
        if (raw instanceof Number n) {
            return Math.max(1, Math.min(MAX_LIMIT, n.intValue()));
        }
        return DEFAULT_LIMIT;
    }

    // ═══════════════════════════════════════════════════════════
    //  Summary formatting
    // ═══════════════════════════════════════════════════════════

    private Map<String, Object> summarize(MealSummaryResponse meal) {
        var summary = new LinkedHashMap<String, Object>();
        summary.put("id", meal.id().toString());
        summary.put("name", meal.name());
        summary.put("description", meal.description() != null ? meal.description() : "");
        summary.put("price", meal.price() != null ? meal.price() : BigDecimal.ZERO);
        summary.put("imageUrl", meal.imageUrl() != null ? meal.imageUrl() : "");
        summary.put("rating", meal.averageRating() != null ? meal.averageRating() : 0.0);
        summary.put("totalRatings", meal.totalRatings() != null ? meal.totalRatings() : 0);
        summary.put("prepTimeMinutes", meal.prepTimeMinutes() != null ? meal.prepTimeMinutes() : 0);
        summary.put("vendorId", meal.vendorId() != null ? meal.vendorId().toString() : "");
        summary.put("vendorName", meal.vendorBusinessName() != null ? meal.vendorBusinessName() : "");
        return summary;
    }

    // ═══════════════════════════════════════════════════════════
    //  Type coercion — the LLM sends anything
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

    private BigDecimal asBigDecimal(Object v) {
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (v instanceof String s) {
            try { return new BigDecimal(s); }
            catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    private UUID asUuid(Object v) {
        if (!(v instanceof String s)) return null;
        try { return UUID.fromString(s); }
        catch (IllegalArgumentException e) { return null; }
    }

    private List<UUID> asUuidList(Object v) {
        if (!(v instanceof List<?> list)) return null;
        return list.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(this::asUuid)
                .filter(Objects::nonNull)
                .toList();
    }
}