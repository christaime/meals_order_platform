package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateLocationRequest;
import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateLocationRequest;
import com.mealmarket.meal.application.service.DistributionLocationService;
import com.mealmarket.meal.application.service.VendorService;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.LocationProximity;
import com.mealmarket.meal.infrastructure.security.CurrentUser;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Distribution Locations", description = "Manage vendor distribution locations (branches/kitchens)")
public class DistributionLocationController {

    private final DistributionLocationService locationService;
    private final VendorService vendorService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Create
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/vendor/locations")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Create a distribution location (vendor only)",
            description = """
            Creates a new distribution location for the authenticated vendor.
            The location is created in PENDING status and must be approved before
            being visible to customers.

            The vendor is derived from the JWT token — not from the request body.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Location created successfully (PENDING moderation)",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "A location with this name already exists for this vendor"),
            @ApiResponse(responseCode = "403", description = "Access denied — VENDOR role required")
    })
    public ResponseEntity<LocationResponse> createLocation(
            @Valid @RequestBody CreateLocationRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        LocationResponse response = locationService.createLocation(request, vendor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Read (own locations, any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/locations/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get one of your locations by ID (vendor only)",
            description = """
            Returns a location that belongs to the authenticated vendor.
            Ownership is enforced — vendors cannot view other vendors' locations.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Location found",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Location not found"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<LocationResponse> getMyLocation(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                locationService.getVendorLocationById(id, vendor.getId())
        );
    }

    @GetMapping("/vendor/locations")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search your locations (vendor only)",
            description = """
            Returns the authenticated vendor's locations — any moderation status.
            The vendor scope is enforced automatically.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of locations"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<LocationResponse>> searchMyLocations(
            @Parameter(description = "Keyword search in name or address")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact name match")
            @RequestParam(required = false) String name,

            @Parameter(description = "Moderation status filter")
            @RequestParam(required = false) ModerationStatus moderationStatus,

            @Parameter(description = "Exact city name or region match")
            @RequestParam(required = false) String cityNameLike,

            @Parameter(description = "Exact location cityId match in")
            @RequestParam(required = false) List<UUID> cityIds,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());

        var request = com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest.builder()
                .vendorId(vendor.getId())
                .keyword(keyword)
                .name(name)
                .cityIds(cityIds)
                .cityNameLike(cityNameLike)
                .moderationStatus(moderationStatus)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(locationService.searchMyLocations(request, vendor.getId()));
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Proximity search (own locations)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/locations/nearby")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Find your nearby locations (vendor only)",
            description = """
            Returns the authenticated vendor's APPROVED locations within a
            given radius of a point (using the Haversine formula).

            Used by the vendor to check which of their branches cover a
            customer's location.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List of nearby locations"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<LocationResponse>> findMyNearbyLocations(
            @Parameter(description = "Customer latitude", required = true)
            @RequestParam double latitude,

            @Parameter(description = "Customer longitude", required = true)
            @RequestParam double longitude,

            @Parameter(description = "Search radius in km")
            @RequestParam(defaultValue = "10") int radiusKm
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                locationService.findNearbyLocationsOfVendor(
                        vendor.getId(), latitude, longitude, radiusKm
                )
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Update
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/vendor/locations/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update one of your locations (vendor only)",
            description = """
            Updates a location that belongs to the authenticated vendor.
            Ownership is enforced.
            Moderation status is not affected by this operation.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Location updated",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "404", description = "Location not found"),
            @ApiResponse(responseCode = "409", description = "Name conflict"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<LocationResponse> updateLocation(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody UpdateLocationRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        LocationResponse response = locationService.updateLocation(
                id, request, vendor.getId()
        );
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Delete
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/vendor/locations/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Delete one of your locations (vendor only)",
            description = """
            Deletes a location following the moderation-aware rule:
            - PENDING / REJECTED → hard delete from DB
            - APPROVED → transition to DISABLED + record moderation
            - DISABLED → rejected (already retired)

            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Location deleted or disabled"),
            @ApiResponse(responseCode = "404", description = "Location not found"),
            @ApiResponse(responseCode = "409", description = "Location is disabled and cannot be deleted"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<Void> deleteLocation(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        locationService.deleteLocation(id, vendor.getId());
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Statistics
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/locations/stats")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Location statistics for your account (vendor only)",
            description = "Returns counts of your locations by status."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getMyStatistics() {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(Map.of(
                "total", locationService.countMyLocations(vendor.getId()),
                "approved", locationService.countMyApprovedLocations(vendor.getId())
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Read (any location, any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/locations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get any location by ID (admin only)",
            description = "Returns any location regardless of vendor or moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Location found",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Location not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<LocationResponse> getLocationByIdAsAdmin(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(locationService.getLocationById(id));
    }

    @GetMapping("/admin/locations")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search your locations by vendorId ",
            description = """
            Returns the vendor's locations — any moderation status.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of locations"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<LocationResponse>> searchLocationsAsAdmin(
            @Parameter(description = "VendorId owning the locations")
            @RequestParam(required = true) UUID vendorId,

            @Parameter(description = "Keyword search in name or address")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact name match")
            @RequestParam(required = false) String name,

            @Parameter(description = "Moderation status filter")
            @RequestParam(required = false) ModerationStatus moderationStatus,

            @Parameter(description = "Exact city name or region match")
            @RequestParam(required = false) String cityNameLike,

            @Parameter(description = "Exact location cityId match in")
            @RequestParam(required = false) List<UUID> cityIds,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {

        var request = com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest.builder()
                .vendorId(vendorId)
                .keyword(keyword)
                .name(name)
                .cityNameLike(cityNameLike)
                .cityIds(cityIds)
                .moderationStatus(moderationStatus)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(locationService.searchLocations(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Read (approved only)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/locations/{id}")
    @Operation(
            summary = "Get an approved location by ID (public)",
            description = """
            Returns a location only if it is APPROVED.
            Used by customers viewing a vendor's profile or meal details.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Approved location found",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Location not found or not approved")
    })
    public ResponseEntity<LocationResponse> getApprovedLocationById(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(locationService.getApprovedLocationById(id));
    }

    @GetMapping("/public/vendors/{vendorId}/locations")
    @Operation(
            summary = "Search approved locations of a vendor (public)",
            description = """
            Returns the APPROVED locations of a specific vendor.
            Used by customers browsing a vendor's profile to see pickup points.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of approved locations")
    })
    public ResponseEntity<DataPage<LocationSummaryResponse>> searchApprovedVendorLocations(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID vendorId,

            @Parameter(description = "Keyword search in name or address")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "name") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "ASC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest.builder()
                .vendorId(vendorId)
                .keyword(keyword)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(locationService.searchApprovedLocations(request));
    }

    @GetMapping("/public/locations")
    @Operation(
            summary = "Search approved locations ",
            description = """
            Returns the approved locations matching the criteria.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of locations"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<LocationSummaryResponse>> searchApprovedLocations(
            @Parameter(description = "VendorId owning the locations")
            @RequestParam(required = false) UUID vendorId,

            @Parameter(description = "Keyword search in name or address")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact name match")
            @RequestParam(required = false) String name,

            @Parameter(description = "Exact city name or region match")
            @RequestParam(required = false) String cityNameLike,

            @Parameter(description = "Latitude of the point to look locations near by")
            @RequestParam(required = false) Double nearLatitude,

            @Parameter(description = "Longitude of the point to look locations near by")
            @RequestParam(required = false) Double nearLongitude,

            @Parameter(description = "Radius to cover around the point we look locations from")
            @RequestParam(required = false) Integer radiusKm,

            @Parameter(description = "Exact location cityId match in")
            @RequestParam(required = false) List<UUID> cityIds,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {

        var request = com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest.builder()
                .vendorId(vendorId)
                .keyword(keyword)
                .name(name)
                .cityIds(cityIds)
                .cityNameLike(cityNameLike)
                .locationProximity(LocationProximity.of(nearLatitude,nearLongitude,radiusKm))
                .moderationStatus(ModerationStatus.APPROVED)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(locationService.searchApprovedLocations(request));
    }
}