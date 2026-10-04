package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.service.DistributionLocationService;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves pickup locations by neighbourhood/landmark or by city/region.
 *
 * Two distinct params, matched against different field sets:
 *   - locationTerm → matches location.name and location.address
 *   - cityName     → matches city.name and city.region (via subquery)
 *
 * Both can be set to narrow the search.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResolveLocationTool implements Tool {

    private static final int MAX_RESULTS = 10;

    private final DistributionLocationService locationService;

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "resolveLocation",
                """
                Find pickup locations.

                Two parameters, matched against different fields. Use the
                right one (or both) depending on what the user said:

                - locationTerm — for a NEIGHBOURHOOD, LANDMARK, or STREET:
                  "Bonapriso", "Marché central", "Rue des Palmiers".
                  Matches location name and address.

                - cityName — for a CITY or REGION:
                  "Douala", "Yaoundé", "Littoral", "Centre".
                  Matches the city's name and region.

                If the user gives both ("Bonapriso à Douala"), pass both.

                Returns up to 10 approved locations with id, name,
                address, and city.

                Pass ALL returned ids to searchMeals'
                `distributionLocationIds` parameter — otherwise you
                will miss results.

                Returns an empty list if nothing matches.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                Map.entry("locationTerm", Map.of(
                                        "type", "string",
                                        "description",
                                        "Neighbourhood, landmark, or street name "
                                                + "(\"Bonapriso\", \"Marché central\"). "
                                                + "Matched against location name and address."
                                )),
                                Map.entry("cityName", Map.of(
                                        "type", "string",
                                        "description",
                                        "City or region name (\"Douala\", \"Littoral\"). "
                                                + "Matched against city name and region."
                                ))
                        ),
                        "required", List.of()
                )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext ctx) {
        String locationTerm = asString(args.get("locationTerm"));
        String cityName = asString(args.get("cityName"));

        boolean hasLocation = locationTerm != null && !locationTerm.isBlank();
        boolean hasCity = cityName != null && !cityName.isBlank();

        if (!hasLocation && !hasCity) {
            return ToolResult.failure(
                    "Provide at least one of 'locationTerm' or 'cityName'.");
        }

        try {
            DistributionLocationSearchRequest request =
                    DistributionLocationSearchRequest.builder()
                            .keyword(hasLocation ? locationTerm.trim() : null)
                            .cityNameLike(hasCity ? cityName.trim() : null)
                            .page(0, MAX_RESULTS)
                            .build();

            DataPage<LocationSummaryResponse> page =
                    locationService.searchApprovedLocations(request);

            List<Map<String, Object>> matches = page.getContent().stream()
                    .map(this::summarize)
                    .toList();

            return ToolResult.success(
                    matches.isEmpty()
                            ? "No location matched."
                            : "Found " + matches.size() + " location(s).",
                    Map.of(
                            "locations", matches,
                            "returned", matches.size(),
                            "totalMatched", page.getTotalElements()
                    )
            );

        } catch (Exception e) {
            log.error("[MealMate] resolveLocation failed: {}", e.getMessage(), e);
            return ToolResult.failure("The location lookup failed.");
        }
    }

    private Map<String, Object> summarize(LocationSummaryResponse loc) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", loc.id().toString());
        m.put("name", loc.name() != null ? loc.name() : "");
        m.put("address", loc.address() != null ? loc.address() : "");
        m.put("vendorName", loc.vendorBusinessName() != null ? loc.vendorBusinessName() : "");
        m.put("vendorId", loc.vendorId() != null ? loc.vendorId() : "");
        if (loc.city() != null) {
            m.put("city", Map.of(
                    "id", loc.city().id().toString(),
                    "name", loc.city().name()
            ));
        }
        return m;
    }

    // ═══════════════════════════════════════════════════════════
    //  Type coercion
    // ═══════════════════════════════════════════════════════════

    private String asString(Object v) {
        return v instanceof String s ? s : null;
    }
}