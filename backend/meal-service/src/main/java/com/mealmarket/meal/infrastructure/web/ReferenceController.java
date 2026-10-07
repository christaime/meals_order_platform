package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CityResponse;
import com.mealmarket.meal.application.dto.MealStatFilter;
import com.mealmarket.meal.application.dto.UserContextDto;
import com.mealmarket.meal.application.service.CityService;
import com.mealmarket.meal.application.service.MealStatService;
import com.mealmarket.meal.application.service.UserManagementService;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Reference / lookup data controller.
 *
 * Serves read-only lists used across the app (cities, capacity ranges,
 * subscription tiers, etc.). These are public — no authentication required.
 */
@RestController
@RequestMapping("/api/v1/reference")
@RequiredArgsConstructor
@Tag(
        name = "Reference",
        description = """
                Public read-only lookup data used across the app.

                **No authentication required** for any endpoint in this controller.
                All responses are cacheable at the CDN level.
                """
)
public class ReferenceController {

    private final UserManagementService userManagementService;
    private final CityService cityService;
    private final MealStatService mealStatService;

    // ═══════════════════════════════════════════════════════════
    //  Stats for meal search
    // ═══════════════════════════════════════════════════════════
    @GetMapping("/meal-stats-filter")
    @Operation(summary = "Public meal statistics for the landing page filter")
    public ResponseEntity<MealStatFilter> mealStats() {
        return ResponseEntity.ok(mealStatService.computeStats());
    }
    // ═══════════════════════════════════════════════════════════
    //  CITIES
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/cities")
    @Operation(
            summary = "List all cities (public)",
            description = """
                    Returns the complete list of cities where vendors can operate
                    and customers can order or collect meals.

                    - **Shape:** flat array, no pagination.
                    - **Order:** alphabetical by name.
                    - **Cache:** safe to cache for hours — cities are reference data.
                    - **Use this** for populating dropdowns and selectors.
                    - **Use `GET /reference`** when you need filters or pagination.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "List of cities",
                    content = @Content(schema = @Schema(implementation = CityResponse.class))
            )
    })
    public ResponseEntity<List<CityResponse>> getCities() {
        return ResponseEntity.ok(cityService.listAll());
    }

    @GetMapping("/cities/search")
    @Operation(
            summary = "Search cities (public)",
            description = """
                    Paginated search across the city reference data.

                    All filter parameters are optional. When omitted, the full
                    (paginated) list is returned.

                    **Sorting** — provide both `sortBy` and `sortDir` to control
                    ordering. If `sortBy` is omitted, results are ordered by name
                    (ascending). `sortDir` defaults to `asc` and is case-insensitive.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Paginated list of matching cities"
            )
    })
    public ResponseEntity<DataPage<CityResponse>> search(

            @Parameter(description = "Match against name or region (case-insensitive, substring)")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact or partial region name, e.g. 'Littoral'")
            @RequestParam(required = false) String region,

            @Parameter(description = "ISO 3166-1 alpha-2 country code, e.g. 'CM'")
            @RequestParam(required = false) String countryCode,

            @Parameter(description = "Page index, 0-based")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size, maximum 100")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Field to sort by — currently 'name' or 'region'")
            @RequestParam(required = false) String sortBy,

            @Parameter(description = "Sort direction — 'asc' or 'desc' (case-insensitive)")
            @RequestParam(required = false) String sortDir
    ) {
        var builder = CitySearchRequest.builder()
                .keyword(keyword)
                .region(region)
                .countryCode(countryCode)
                .page(page, size);

        if (sortBy != null && !sortBy.isBlank()) {
            var dir = "desc".equalsIgnoreCase(sortDir)
                    ? com.mealmarket.common.pagination.Sort.Direction.DESC
                    : com.mealmarket.common.pagination.Sort.Direction.ASC;
            builder.sortBy(sortBy, dir);
        }

        return ResponseEntity.ok(cityService.search(builder.build()));
    }

    @GetMapping("/cities/{id}")
    @Operation(
            summary = "Get a city by ID (public)",
            description = """
                    Returns a single city by its UUID.

                    The id is the UUID stored in the `city` table, not a slug.
                    IDs are stable within an environment but **not** across
                    environments (dev / test / prod may assign different UUIDs).
                    Never hardcode city ids in the frontend.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "City found",
                    content = @Content(schema = @Schema(implementation = CityResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "No city exists with the given id"
            )
    })
    public ResponseEntity<CityResponse> getCityById(
            @Parameter(description = "City UUID", required = true)
            @PathVariable UUID id
    ) {
        try {
            return ResponseEntity.ok(cityService.getById(id));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CAPACITY RANGES
    // ═══════════════════════════════════════════════════════════

    private static final List<CapacityRangeDto> CAPACITY_RANGES = List.of(
            new CapacityRangeDto(
                    "SMALL",
                    "10 à 30",
                    "Idéal pour chefs à domicile & traiteurs intimistes"
            ),
            new CapacityRangeDto(
                    "MEDIUM",
                    "30 à 80",
                    "Restaurants traditionnels et braises d'affluence"
            ),
            new CapacityRangeDto(
                    "LARGE",
                    "80+",
                    "Chaînes, traiteurs de mariages, banquets"
            )
    );

    @GetMapping("/capacity-ranges")
    @Operation(
            summary = "List capacity ranges (public)",
            description = """
                    Returns the daily-preparation capacity tiers vendors can choose
                    from when registering.

                    - **Shape:** flat array, no pagination.
                    - **Stable values:** `SMALL`, `MEDIUM`, `LARGE`.
                    - Currently hardcoded — will move to a DB-backed lookup if the
                      tiers ever change per environment.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "List of capacity ranges",
                    content = @Content(schema = @Schema(implementation = CapacityRangeDto.class))
            )
    })
    public ResponseEntity<List<CapacityRangeDto>> getCapacityRanges() {
        return ResponseEntity.ok(CAPACITY_RANGES);
    }

    @GetMapping("/capacity-ranges/{value}")
    @Operation(
            summary = "Get a capacity range by value (public)",
            description = """
                    Returns a single capacity range by its `value` (`SMALL`, `MEDIUM`, `LARGE`).
                    The lookup is case-insensitive.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Capacity range found",
                    content = @Content(schema = @Schema(implementation = CapacityRangeDto.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "No capacity range exists with the given value"
            )
    })
    public ResponseEntity<CapacityRangeDto> getCapacityRangeByValue(
            @Parameter(
                    description = "Capacity range value",
                    required = true,
                    schema = @Schema(allowableValues = {"SMALL", "MEDIUM", "LARGE"})
            )
            @PathVariable String value
    ) {
        return CAPACITY_RANGES.stream()
                .filter(r -> r.value().equalsIgnoreCase(value))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ═══════════════════════════════════════════════════════════
    //  CONTEXT
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/context")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get the authenticated user's context",
            description = """
                    Returns the Vendor, Customer, and Admin entities linked to the
                    authenticated Keycloak subject, regardless of which roles the JWT
                    carries.

                    - **Roles are NOT returned here** — read them from the JWT.
                    - `status` is included on each sub-object so the frontend can show
                      "your vendor account is deactivated" without a second call.
                    - Any of `vendor`, `customer`, `admin` may be null.
                    """
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Context loaded",
                    content = @Content(schema = @Schema(implementation = UserContextDto.class))
            ),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(
                    responseCode = "500",
                    description = "Keycloak `sub` claim is not a UUID (configuration error)"
            )
    })
    public UserContextDto getContext(Authentication auth) {
        return userManagementService.getContext(auth.getName());
    }

    // ═══════════════════════════════════════════════════════════
    //  DTOs — nested records
    // ═══════════════════════════════════════════════════════════

    /**
     * A daily-preparation capacity tier.
     */
    public record CapacityRangeDto(
            @Schema(description = "Stable identifier", example = "SMALL")
            String value,

            @Schema(description = "Human-readable label (French)", example = "10 à 30")
            String label,

            @Schema(
                    description = "Explanatory sentence shown as a hint in the vendor registration form",
                    example = "Idéal pour chefs à domicile & traiteurs intimistes"
            )
            String description
    ) {}
}