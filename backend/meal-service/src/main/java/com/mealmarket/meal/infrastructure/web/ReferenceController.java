package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.meal.application.dto.UserContextDto;

import com.mealmarket.meal.application.service.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Reference / lookup data controller.
 *
 * Serves read-only lists used across the app (cities, capacity ranges,
 * subscription tiers, etc.). These are public — no authentication required.
 *
 * For now, the data is hardcoded in this controller. Later, each endpoint
 * will delegate to a dedicated service (backed by a DB table or config).
 */
@RestController
@RequestMapping("/api/v1/reference")
@RequiredArgsConstructor
@Tag(name = "Reference", description = "Read-only lookup data (cities, capacity ranges, …)")
public class ReferenceController {

    private final UserManagementService userManagementService;

    // ═══════════════════════════════════════════════════════════
    //  CITIES
    // ═══════════════════════════════════════════════════════════

    /**
     * Temporary hardcoded list.
     * TODO: replace with CityService / DB-backed lookup.
     */
    private static final List<CityDto> CITIES = List.of(
            new CityDto("douala",     "Douala",     "Littoral"),
            new CityDto("yaounde",    "Yaoundé",    "Centre"),
            new CityDto("bafoussam",  "Bafoussam",  "Ouest"),
            new CityDto("bamenda",    "Bamenda",    "Nord-Ouest"),
            new CityDto("buea",       "Buea",       "Sud-Ouest"),
            new CityDto("kribi",      "Kribi",      "Sud"),
            new CityDto("limbe",      "Limbé",      "Sud-Ouest"),
            new CityDto("ngaoundere", "Ngaoundéré", "Adamaoua"),
            new CityDto("garoua",     "Garoua",     "Nord"),
            new CityDto("maroua",     "Maroua",     "Extrême-Nord"),
            new CityDto("bertoua",    "Bertoua",    "Est"),
            new CityDto("ebolowa",    "Ebolowa",    "Sud")
    );

    @GetMapping("/cities")
    @Operation(
            summary = "List cities (public)",
            description = "Returns the list of Cameroonian cities where vendors can operate."
    )
    public ResponseEntity<List<CityDto>> getCities() {
        return ResponseEntity.ok(CITIES);
    }

    @GetMapping("/cities/{id}")
    @Operation(
            summary = "Get a city by ID (public)",
            description = "Returns a single city."
    )
    public ResponseEntity<CityDto> getCityById(@PathVariable String id) {
        return CITIES.stream()
                .filter(c -> c.id().equals(id))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ═══════════════════════════════════════════════════════════
    //  CAPACITY RANGES
    // ═══════════════════════════════════════════════════════════

    /**
     * Temporary hardcoded list.
     * TODO: replace with CapacityRangeService / DB-backed lookup.
     */
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
            description = "Returns the daily-preparation capacity tiers vendors can choose from."
    )
    public ResponseEntity<List<CapacityRangeDto>> getCapacityRanges() {
        return ResponseEntity.ok(CAPACITY_RANGES);
    }

    @GetMapping("/capacity-ranges/{value}")
    @Operation(
            summary = "Get a capacity range by value (public)",
            description = "Returns a single capacity range."
    )
    public ResponseEntity<CapacityRangeDto> getCapacityRangeByValue(@PathVariable String value) {
        return CAPACITY_RANGES.stream()
                .filter(r -> r.value().equalsIgnoreCase(value))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ═══════════════════════════════════════════════════════════
    //  DTOs — nested records
    // ═══════════════════════════════════════════════════════════

    /**
     * A Cameroonian city where vendors can operate.
     */
    public record CityDto(
            String id,
            String name,
            String region
    ) {}

    /**
     * A daily-preparation capacity tier.
     */
    public record CapacityRangeDto(
            String value,
            String label,
            String description
    ) {}


    @GetMapping("/context")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get the authenticated user's context",
            description = """
                    Returns the Vendor, Customer, and Admin entities linked to the authenticated
                    Keycloak subject, regardless of which roles the JWT carries.

                    - Roles are NOT returned here — read them from the JWT.
                    - `status` is included on each sub-object so the frontend can show
                      "your vendor account is deactivated" without a second call.
                    - Any of `vendor`, `customer`, `admin` may be null.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Context loaded",
                    content = @Content(schema = @Schema(implementation = UserContextDto.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "500", description = "Keycloak sub is not a UUID (config error)")
    })
    public UserContextDto getContext(Authentication auth) {
        return userManagementService.getContext(auth.getName());
    }
}