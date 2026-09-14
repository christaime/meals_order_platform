package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateVendorRequest;
import com.mealmarket.meal.application.dto.UpdateVendorRequest;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorSummaryResponse;
import com.mealmarket.meal.application.service.VendorService;
import com.mealmarket.meal.domain.model.VendorState;
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
import com.mealmarket.meal.domain.model.VendorState.VendorStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Vendors", description = "Manage vendors (registration, profile, search)")
public class VendorController {

    private final VendorService vendorService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Registration
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/public/vendors/register")
    @Operation(
            summary = "Register a new vendor (public)",
            description = """
            Registers a new vendor. This endpoint is public — no authentication required.

            **Flow:**
            1. Validates email and business name uniqueness.
            2. Creates the user in Keycloak (external IAM).
            3. Creates the vendor in PENDING state.
            4. Records the initial state change in history.

            The vendor must be activated by an admin before being visible to customers.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Vendor registered successfully (PENDING activation)",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Email or business name already exists")
    })
    public ResponseEntity<VendorResponse> registerVendor(
            @Valid @RequestBody CreateVendorRequest request
    ) {
        // NOTE: The Keycloak user creation is handled by a facade or filter before this call.
        // The controller receives the keycloakUserId as a header or via the authentication flow.
        // For MVP, we accept it via a request attribute set by an upstream filter/interceptor.
        String keycloakUserId = (String) org.springframework.web.context.request.RequestContextHolder
                .currentRequestAttributes()
                .getAttribute("keycloakUserId", org.springframework.web.context.request.RequestAttributes.SCOPE_REQUEST);

        if (keycloakUserId == null) {
            throw new IllegalStateException(
                    "keycloakUserId missing — upstream Keycloak registration filter not configured"
            );
        }

        VendorResponse response = vendorService.registerVendor(request, UUID.fromString(keycloakUserId));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Own Profile
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/profile")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get your own vendor profile (vendor only)",
            description = "Returns the profile of the currently authenticated vendor."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Profile retrieved",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> getOwnProfile() {
        return ResponseEntity.ok(
                vendorService.getOwnProfile(currentUser.getUserId())
        );
    }

    @PutMapping("/vendor/profile")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update your own vendor profile (vendor only)",
            description = """
            Updates the profile of the authenticated vendor.
            Ownership is enforced by the security context.

            Note: Status changes are not allowed here — use the state endpoints.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Profile updated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Email or business name conflict"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> updateOwnProfile(
            @Valid @RequestBody UpdateVendorRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        VendorResponse response = vendorService.updateVendor(
                vendor.getId(), request, currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/vendor/profile/image")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Upload/update your profile image (vendor only)",
            description = """
            Updates the profile image URL of the authenticated vendor.
            The actual file upload to MinIO is handled separately (e.g., via a `/files` endpoint).
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Profile image updated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> uploadProfileImage(
            @Parameter(description = "Image URL (from file storage)", required = true)
            @RequestParam String imageUrl
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                vendorService.uploadProfileImage(vendor.getId(), imageUrl, currentUser.getUserId())
        );
    }

    @PutMapping("/vendor/profile/cover")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Upload/update your cover image (vendor only)",
            description = "Updates the cover image URL of the authenticated vendor."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Cover image updated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> uploadCoverImage(
            @Parameter(description = "Image URL (from file storage)", required = true)
            @RequestParam String imageUrl
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                vendorService.uploadCoverImage(vendor.getId(), imageUrl, currentUser.getUserId())
        );
    }

    @PutMapping("/vendor/profile/cuisines")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update your cuisines (vendor only)",
            description = """
            Replaces the list of cuisines associated with your vendor profile.
            Each category ID must be of type CUISINE and APPROVED.

            Pass an empty list to remove all cuisines.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Cuisines updated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid category — not a cuisine or not approved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> updateCuisines(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "List of CUISINE category IDs",
                    required = true
            )
            @RequestBody List<UUID> categoryIds
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                vendorService.updateCuisines(vendor.getId(), categoryIds, currentUser.getUserId())
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Read (any vendor, any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/vendors/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get any vendor by ID (admin only)",
            description = "Returns a vendor regardless of status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Vendor found",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> getVendorByIdAsAdmin(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }

    @GetMapping("/admin/vendors")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search vendors (admin only)",
            description = "Full search across all vendors, any status."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of vendors"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<VendorResponse>> searchVendors(
            @Parameter(description = "Keyword search in business name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact business name match")
            @RequestParam(required = false) String businessName,

            @Parameter(description = "Email filter")
            @RequestParam(required = false) String email,

            @Parameter(description = "Phone filter")
            @RequestParam(required = false) String phone,

            @Parameter(description = "Vendor status filter")
            @RequestParam(required = false) VendorState.VendorStatus status,

            @Parameter(description = "Minimum rating")
            @RequestParam(required = false) Double minRating,

            @Parameter(description = "Maximum rating")
            @RequestParam(required = false) Double maxRating,

            @Parameter(description = "Cuisine category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> categoryIds,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest.builder()
                .keyword(keyword)
                .businessName(businessName)
                .email(email)
                .phone(phone)
                .status(status)
                .minRating(minRating)
                .maxRating(maxRating)
                .categoryIds(categoryIds)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(vendorService.searchVendors(request));
    }

    @GetMapping("/admin/vendors/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Vendor statistics (admin only)",
            description = "Returns counts by status and total."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getStatistics() {
        return ResponseEntity.ok(Map.of(
                "total", vendorService.countAll(),
                "pending", vendorService.countByStatus(VendorStatus.PENDING),
                "active", vendorService.countByStatus(VendorStatus.ACTIVE),
                "suspended", vendorService.countByStatus(VendorStatus.SUSPENDED),
                "banned", vendorService.countByStatus(VendorStatus.BANNED),
                "inactive", vendorService.countByStatus(VendorStatus.INACTIVE)
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Delete (moderation-aware)
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/admin/vendors/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Hard delete a vendor (admin only)",
            description = """
            Deletes a vendor following the moderation-aware rule:
            - PENDING or INACTIVE → hard delete from DB
            - ACTIVE / SUSPENDED / BANNED → refused (deactivate first)

            Note: BANNED vendors are preserved for history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Vendor deleted"),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Vendor cannot be deleted in its current status"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Void> deleteVendor(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        vendorService.deleteVendor(id, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Read (active vendors only)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/vendors/{id}")
    @Operation(
            summary = "Get an active vendor by ID (public)",
            description = """
            Returns a vendor only if it is ACTIVE.
            Used by customers to view vendor profiles.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Active vendor found",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found or not active")
    })
    public ResponseEntity<VendorResponse> getApprovedVendorById(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(vendorService.getApprovedVendorById(id));
    }

    @GetMapping("/public/vendors")
    @Operation(
            summary = "Search active vendors (public)",
            description = """
            Returns only ACTIVE vendors. Used by customers browsing the marketplace.
            Returns summaries for lightweight payloads.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of active vendors")
    })
    public ResponseEntity<DataPage<VendorSummaryResponse>> searchApprovedVendors(
            @Parameter(description = "Keyword search in business name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Business name filter")
            @RequestParam(required = false) String businessName,

            @Parameter(description = "Minimum rating")
            @RequestParam(required = false) Double minRating,

            @Parameter(description = "Cuisine category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> categoryIds,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "ratingAvg") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest.builder()
                .keyword(keyword)
                .businessName(businessName)
                .minRating(minRating)
                .categoryIds(categoryIds)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(vendorService.searchApprovedVendors(request));
    }
}