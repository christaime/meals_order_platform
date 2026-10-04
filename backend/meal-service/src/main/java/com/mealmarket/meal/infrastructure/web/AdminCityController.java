package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CityRequest;
import com.mealmarket.meal.application.dto.CityResponse;
import com.mealmarket.meal.application.service.CityService;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin CRUD for the city reference data.
 *
 * All endpoints require the ADMIN role.
 */
@RestController
@RequestMapping("/api/v1/admin/cities")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearer-jwt")
@Tag(
        name = "Admin — Cities",
        description = """
                CRUD for the city reference dataset.

                Cities are **not moderable** — they are admin-curated reference
                data, created and edited only through this controller. There is
                no soft-delete: deletion is a hard delete, and the database will
                refuse to delete a city still referenced by a vendor or a
                distribution location.

                All endpoints require the **ADMIN** role.
                """
)
public class AdminCityController {

    private final CityService cityService;

    // ═══════════════════════════════════════════════════════════
    //  SEARCH
    // ═══════════════════════════════════════════════════════════

    @GetMapping
    @Operation(
            summary = "Search cities (admin)",
            description = """
                    Paginated search across all cities, including any hidden or
                    newly-added ones. Unlike the public endpoint, this one is
                    **not rate-limited** and returns the full DTO.

                    All filters are optional.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of cities"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Authenticated, but not an ADMIN")
    })
    public ResponseEntity<DataPage<CityResponse>> search(

            @Parameter(description = "Match against name or region (case-insensitive, substring)")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Region filter")
            @RequestParam(required = false) String region,

            @Parameter(description = "ISO 3166-1 alpha-2 country code")
            @RequestParam(required = false) String countryCode,

            @Parameter(description = "Page index, 0-based")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Field to sort by")
            @RequestParam(required = false) String sortBy,

            @Parameter(description = "Sort direction — 'asc' or 'desc'")
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

    // ═══════════════════════════════════════════════════════════
    //  GET BY ID
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/{id}")
    @Operation(
            summary = "Get a city by ID (admin)",
            description = """
                    Returns a single city by UUID. Unlike the public endpoint,
                    this one is not cached and works for any city regardless of
                    public visibility settings.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "City found",
                    content = @Content(schema = @Schema(implementation = CityResponse.class))
            ),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Authenticated, but not an ADMIN"),
            @ApiResponse(responseCode = "404", description = "No city exists with the given id")
    })
    public ResponseEntity<CityResponse> getById(
            @Parameter(description = "City UUID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(cityService.getById(id));
    }

    // ═══════════════════════════════════════════════════════════
    //  CREATE
    // ═══════════════════════════════════════════════════════════

    @PostMapping
    @Operation(
            summary = "Create a city (admin)",
            description = """
                    Creates a new city in the reference dataset.

                    **Uniqueness:** `(name, countryCode)` must be unique across
                    all cities. The check is case-insensitive on `name`.

                    **Country code:** must be a valid ISO 3166-1 alpha-2 code.
                    Currently the frontend locks this to `CM` (Cameroon), but the
                    backend enforces only the ISO format.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "City created",
                    content = @Content(schema = @Schema(implementation = CityResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Authenticated, but not an ADMIN"),
            @ApiResponse(
                    responseCode = "409",
                    description = "A city with the same (name, countryCode) already exists"
            )
    })
    public ResponseEntity<CityResponse> create(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "The city to create",
                    required = true
            )
            @Valid @RequestBody CityRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cityService.create(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  UPDATE
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/{id}")
    @Operation(
            summary = "Update a city (admin)",
            description = """
                    Updates the name, region, and country code of an existing city.

                    **Uniqueness:** if the `(name, countryCode)` pair changes, the
                    same rule as create applies. Renaming to the same name is a
                    no-op check (no conflict raised).
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "City updated",
                    content = @Content(schema = @Schema(implementation = CityResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Authenticated, but not an ADMIN"),
            @ApiResponse(responseCode = "404", description = "No city exists with the given id"),
            @ApiResponse(
                    responseCode = "409",
                    description = "Another city with the same (name, countryCode) already exists"
            )
    })
    public ResponseEntity<CityResponse> update(
            @Parameter(description = "City UUID", required = true)
            @PathVariable UUID id,

            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "The updated city fields",
                    required = true
            )
            @Valid @RequestBody CityRequest request
    ) {
        return ResponseEntity.ok(cityService.update(id, request));
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Delete a city (admin)",
            description = """
                    **Hard delete** — the city row is removed from the database.

                    **Referential integrity:** if any vendor or distribution
                    location still references this city, the delete is refused
                    with `409 Conflict`. There is no cascade — a city that is in
                    use cannot be removed until its dependents are reassigned.

                    **No soft-delete.** Cities have no moderation status and no
                    `DISABLED` equivalent.
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "City deleted"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Authenticated, but not an ADMIN"),
            @ApiResponse(responseCode = "404", description = "No city exists with the given id"),
            @ApiResponse(
                    responseCode = "409",
                    description = "City is referenced by one or more vendors or distribution locations"
            )
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "City UUID", required = true)
            @PathVariable UUID id
    ) {
        cityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}