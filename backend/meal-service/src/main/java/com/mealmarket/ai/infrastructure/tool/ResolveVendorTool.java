package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorSummaryResponse;
import com.mealmarket.meal.application.service.VendorService;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Resolves vendors by name, or lists vendors in a city.
 *
 * Two modes controlled by `detail`:
 *   - detail=false (default) — up to 10 matching vendors with summary
 *     fields.
 *   - detail=true — a single matching vendor with full public detail
 *     (email, phone, description, pickup points, cover image).
 *
 * Both modes emit a VENDORS payload. Detail mode emits a one-element
 * array so the frontend renders it through the same vendor card.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResolveVendorTool implements Tool {

    private static final int LIST_LIMIT = 10;

    private final VendorService vendorService;

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "resolveVendor",
                """
                Find vendors by name, or list vendors in a city.

                USE WHEN:
                - The user names a vendor ("Le Chaudron du bon gout",
                  "Chez Mama"). Pass the name as `term`.
                - The user asks who sells meals in a city ("quels
                  vendeurs à Bafoussam ?"). Pass the city id as
                  `cityId`.
                - The user asks for details about one vendor
                  ("parle-moi de ce vendeur", "c'est où ?",
                  "quel est son numéro ?"). Pass the vendor id or
                  name and set `detail: true`.

                Returns up to 10 vendors in list mode, or one vendor
                with full public details in detail mode.

                Do NOT invent vendor ids or names.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                Map.entry("term", Map.of(
                                        "type", "string",
                                        "description",
                                        "Vendor name as the user said it. "
                                                + "Partial names are acceptable."
                                )),
                                Map.entry("vendorId", Map.of(
                                        "type", "string",
                                        "description",
                                        "Vendor UUID. Use when you already have the id "
                                                + "from a previous call. Overrides `term` if both "
                                                + "are provided."
                                )),
                                Map.entry("cityId", Map.of(
                                        "type", "string",
                                        "description",
                                        "City UUID. Restrict to vendors based in this city. "
                                                + "Resolve the city name first if you don't have "
                                                + "the id."
                                )),
                                Map.entry("detail", Map.of(
                                        "type", "boolean",
                                        "description",
                                        "Set true to return a single vendor with full "
                                                + "public details (email, phone, description, "
                                                + "pickup points). Use when the user wants "
                                                + "specifics about one vendor."
                                ))
                        ),
                        "required", List.of()
                )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext ctx) {
        try {
            UUID vendorIdArg = asUuid(args.get("vendorId"));
            boolean detail = asBoolean(args.get("detail"));
            String term = asString(args.get("term"));
            UUID cityId = asUuid(args.get("cityId"));

            boolean hasTerm = term != null && !term.isBlank();

            // ── Detail mode by id: direct fetch ──
            if (detail && vendorIdArg != null) {
                VendorResponse v = vendorService.getApprovedVendorById(vendorIdArg);
                return singleVendorResult(v);
            }

            if (!hasTerm && vendorIdArg == null && cityId == null) {
                return ToolResult.failure(
                        "Provide at least one of 'term', 'vendorId', or 'cityId'.");
            }

            // ── List mode (or detail mode with a term) ──
            VendorSearchRequest request = VendorSearchRequest.builder()
                    .keyword(hasTerm ? term.trim() : null)
                    .cityId(cityId)
                    .page(0, detail ? 1 : LIST_LIMIT)
                    .build();

            DataPage<VendorSummaryResponse> page =
                    vendorService.searchApprovedVendors(request);

            if (page.getContent().isEmpty()) {
                return ToolResult.success(
                        "No vendor matched.",
                        Map.of("vendors", List.of())
                );
            }

            // ── Detail mode: expand the first match ──
            if (detail) {
                UUID id = page.getContent().get(0).id();
                VendorResponse v = vendorService.getApprovedVendorById(id);
                return singleVendorResult(v);
            }

            // ── List mode: return summaries ──
            List<Map<String, Object>> vendors = page.getContent().stream()
                    .map(this::toSummaryMap)
                    .toList();

            StructuredPayload structured = StructuredPayload.of(
                    PayloadTypes.VENDORS,
                    Map.of("vendors", vendors)
            );
            return ToolResult.successWithStructured(
                    "Found " + vendors.size() + " vendor(s).",
                    Map.of(
                            "vendors", vendors,
                            "returned", vendors.size(),
                            "totalMatched", page.getTotalElements()
                    ),
                    structured
            );

        } catch (Exception e) {
            log.error("[MealMate] resolveVendor failed: {}", e.getMessage(), e);
            return ToolResult.failure("The vendor lookup failed.");
        }
    }

    /**
     * Detail mode emits a VENDORS payload with exactly one card, so
     * the frontend renders it through the same component as list mode.
     */
    private ToolResult singleVendorResult(VendorResponse v) {
        Map<String, Object> vendorMap = toDetailMap(v);
        StructuredPayload structured = StructuredPayload.of(
                PayloadTypes.VENDORS,
                Map.of("vendors", List.of(vendorMap))
        );
        return ToolResult.successWithStructured(
                "Vendor found.",
                Map.of("vendor", vendorMap),
                structured
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Mapping — field names MUST match the frontend VendorCard
    // ═══════════════════════════════════════════════════════════

    private Map<String, Object> toSummaryMap(VendorSummaryResponse v) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", v.id().toString());
        m.put("businessName", v.businessName());
        m.put("description", v.description() != null ? v.description() : "");
        m.put("address", v.address() != null ? v.address() : "");
        m.put("cityName", v.city() != null && v.city().name() != null ? v.city().name() : "");
        m.put("ratingAvg", v.ratingAvg() != null ? v.ratingAvg() : 0);
        m.put("totalRatings", v.totalRatings() != null ? v.totalRatings() : 0);
        m.put("profileImageUrl", v.profileImageUrl() != null ? v.profileImageUrl() : "");
        m.put("cuisines", v.cuisines() != null
                ? v.cuisines().stream().map(c -> c.name()).toList()
                : List.of());
        return m;
    }

    private Map<String, Object> toDetailMap(VendorResponse v) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", v.id().toString());
        m.put("businessName", v.businessName());
        m.put("description", v.description() != null ? v.description() : "");
        m.put("address", v.address() != null ? v.address() : "");
        m.put("cityName", v.city() != null && v.city().name() != null ? v.city().name() : "");
        m.put("ratingAvg", v.ratingAvg() != null ? v.ratingAvg() : 0);
        m.put("totalRatings", v.totalRatings() != null ? v.totalRatings() : 0);
        m.put("profileImageUrl", v.profileImageUrl() != null ? v.profileImageUrl() : "");
        m.put("cuisines", v.cuisines() != null
                ? v.cuisines().stream().map(c -> c.name()).toList()
                : List.of());
        return m;
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
        return Boolean.FALSE;
    }

    private UUID asUuid(Object v) {
        if (!(v instanceof String s)) return null;
        try { return UUID.fromString(s); }
        catch (IllegalArgumentException e) { return null; }
    }
}