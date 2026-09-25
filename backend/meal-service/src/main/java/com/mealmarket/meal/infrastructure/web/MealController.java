package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateMealRequest;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.MealSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateMealRequest;
import com.mealmarket.meal.application.service.MealService;
import com.mealmarket.meal.application.service.VendorService;
import com.mealmarket.meal.domain.model.ModerationStatus;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Meals", description = "Manage meals (vendor CRUD + public browsing)")
public class MealController {

    private final MealService mealService;
    private final VendorService vendorService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Create
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/vendor/meals")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Create a new meal (vendor only)",
            description = """
            Creates a new meal for the authenticated vendor.

            **Moderation:** The meal is created with `moderationStatus = PENDING`.
            It becomes visible to customers only after admin approval.

            **Relationships:** categories, ingredients, and distribution locations
            must be APPROVED. Locations must also belong to the authenticated vendor.

            **Image:** pass `imageStorageRef` (the MinIO object key returned by
            `POST /api/v1/media`). The display URL is computed server-side on read.

            The vendor is derived from the JWT token — not from the request body.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Meal created successfully (PENDING moderation)",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Duplicate name, or invalid relationship (not approved / not owner)"),
            @ApiResponse(responseCode = "403", description = "Access denied — VENDOR role required")
    })
    public ResponseEntity<MealResponse> createMeal(
            @Valid @RequestBody CreateMealRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        MealResponse response = mealService.createMeal(request, vendor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Read (own meals, any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/meals/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get one of your meals by ID (vendor only)",
            description = """
            Returns a meal that belongs to the authenticated vendor (any status).
            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Meal found",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<MealResponse> getMyMeal(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(mealService.getVendorMealById(id, vendor.getId()));
    }

    @GetMapping("/vendor/meals")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search your meals (vendor only)",
            description = """
            Returns the authenticated vendor's meals — any moderation status.
            The vendor scope is enforced automatically.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of meals"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<MealResponse>> searchMyMeals(
            @Parameter(description = "Keyword search in name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Filter by moderation status")
            @RequestParam(required = false) ModerationStatus moderationStatus,

            @Parameter(description = "Filter by availability")
            @RequestParam(required = false) Boolean isAvailable,

            @Parameter(description = "Minimum price")
            @RequestParam(required = false) BigDecimal minPrice,

            @Parameter(description = "Maximum price")
            @RequestParam(required = false) BigDecimal maxPrice,

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

        var request = com.mealmarket.meal.domain.repository.criteria.MealSearchRequest.builder()
                .vendorId(vendor.getId())
                .keyword(keyword)
                .moderationStatus(moderationStatus)
                .isAvailable(isAvailable)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(mealService.searchMyMeals(request, vendor.getId()));
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Update
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/vendor/meals/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update one of your meals (vendor only)",
            description = """
            Updates the core fields of a meal that belongs to the authenticated vendor.

            **Image:** `imageStorageRef` follows the null/empty-string convention:
            - `null`  → keep the existing image
            - `""`    → clear the image
            - value   → replace with the new ref (old one becomes an orphan candidate)

            **Not allowed here:** categories, ingredients, distribution locations.
            Those are managed via dedicated endpoints (planned for Phase 2).

            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Meal updated",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "409", description = "Name conflict"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<MealResponse> updateMeal(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody UpdateMealRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                mealService.updateMeal(id, request, vendor.getId())
        );
    }

    @PutMapping("/vendor/meals/{id}/availability")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Toggle meal availability (vendor only)",
            description = """
            Toggles the vendor's intent to offer this meal.

            **Important:** `isAvailable` is NOT a stock/quantity indicator.
            It represents whether the vendor currently wants to offer the meal.
            Stock management is out of scope for the MVP.

            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Availability updated",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<MealResponse> toggleAvailability(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id,

            @Parameter(description = "New availability value", required = true)
            @RequestParam boolean isAvailable
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                mealService.toggleAvailability(id, isAvailable, vendor.getId())
        );
    }

    @PutMapping("/vendor/meals/{id}/image")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update meal image (vendor only)",
            description = """
            Replaces the meal image with a new storage ref.

            The ref must come from a prior call to `POST /api/v1/media`
            (the frontend uploads first, then attaches). The previous ref
            is marked PENDING in MinIO and cleaned up automatically if not
            re-used within 24 hours.

            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Image updated",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<MealResponse> updateMealImage(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id,

            @Parameter(description = "MinIO storage ref (object key) from POST /api/v1/media", required = true)
            @RequestParam String imageStorageRef
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                mealService.updateMealImage(id, imageStorageRef, vendor.getId())
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Delete
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/vendor/meals/{id}")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Delete one of your meals (vendor only)",
            description = """
            Deletes a meal following the moderation-aware rule:
            - PENDING / REJECTED → hard delete from DB (image released)
            - APPROVED → transition to DISABLED + record moderation (image kept)
            - DISABLED → rejected (already retired)

            Ownership is enforced.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Meal deleted or disabled"),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "409", description = "Meal is disabled and cannot be deleted"),
            @ApiResponse(responseCode = "403", description = "Access denied — not the owner")
    })
    public ResponseEntity<Void> deleteMeal(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        mealService.deleteMeal(id, vendor.getId());
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Statistics
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/meals/stats")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Meal statistics for your account (vendor only)",
            description = "Returns counts of your meals (total and available)."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getMyStatistics() {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(Map.of(
                "total", mealService.countMyMeals(vendor.getId()),
                "available", mealService.countMyAvailableMeals(vendor.getId())
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Read (any meal, any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/meals/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get any meal by ID (admin only)",
            description = "Returns any meal regardless of moderation status or vendor."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Meal found",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<MealResponse> getMealByIdAsAdmin(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(mealService.getMealById(id));
    }

    @GetMapping("/admin/meals")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search meals (admin only)",
            description = "Full search across all meals, any moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of meals"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<MealResponse>> searchMeals(
            @Parameter(description = "Keyword search in name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Vendor ID filter")
            @RequestParam(required = false) UUID vendorId,

            @Parameter(description = "Cuisine category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> cuisineIds,

            @Parameter(description = "Dish type category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> dishTypeIds,

            @Parameter(description = "Ingredient IDs filter (meals containing these)")
            @RequestParam(required = false) List<UUID> ingredientIds,

            @Parameter(description = "Ingredient IDs to exclude (allergens)")
            @RequestParam(required = false) List<UUID> excludeIngredientIds,

            @Parameter(description = "Minimum price")
            @RequestParam(required = false) BigDecimal minPrice,

            @Parameter(description = "Maximum price")
            @RequestParam(required = false) BigDecimal maxPrice,

            @Parameter(description = "Minimum rating")
            @RequestParam(required = false) Double minRating,

            @Parameter(description = "Filter by moderation status")
            @RequestParam(required = false) ModerationStatus moderationStatus,

            @Parameter(description = "Filter by availability")
            @RequestParam(required = false) Boolean isAvailable,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.MealSearchRequest.builder()
                .keyword(keyword)
                .vendorId(vendorId)
                .cuisineIds(cuisineIds)
                .dishTypeIds(dishTypeIds)
                .ingredientIds(ingredientIds)
                .excludeIngredientIds(excludeIngredientIds)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .minRating(minRating)
                .moderationStatus(moderationStatus)
                .isAvailable(isAvailable)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(mealService.searchMeals(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Browse (approved + available only)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/meals/{id}")
    @Operation(
            summary = "Get an approved meal by ID (public)",
            description = """
            Returns a meal only if it is publicly visible:
            - moderationStatus = APPROVED
            - isAvailable = TRUE (vendor's intent)
            - vendor.status = ACTIVE

            Note: `isAvailable` reflects the vendor's decision to offer
            the meal — it is NOT a stock indicator.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Approved meal found",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Meal not found or not visible")
    })
    public ResponseEntity<MealResponse> getApprovedMealById(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(mealService.getApprovedMealById(id));
    }

    @GetMapping("/public/meals")
    @Operation(
            summary = "Search approved meals (public)",
            description = """
            Returns only APPROVED + available meals from ACTIVE vendors.
            Used by customers browsing the marketplace.
            Returns summaries for lightweight payloads.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of approved meals")
    })
    public ResponseEntity<DataPage<MealSummaryResponse>> searchApprovedMeals(
            @Parameter(description = "Keyword search in name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Vendor ID filter")
            @RequestParam(required = false) UUID vendorId,

            @Parameter(description = "Vendor business name search")
            @RequestParam(required = false) String businessName,

            @Parameter(description = "Cuisine category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> cuisineIds,

            @Parameter(description = "Dish type category IDs filter (comma-separated)")
            @RequestParam(required = false) List<UUID> dishTypeIds,

            @Parameter(description = "Ingredient IDs to exclude (allergens)")
            @RequestParam(required = false) List<UUID> excludeIngredientIds,

            @Parameter(description = "Minimum price")
            @RequestParam(required = false) BigDecimal minPrice,

            @Parameter(description = "Maximum price")
            @RequestParam(required = false) BigDecimal maxPrice,

            @Parameter(description = "Minimum rating")
            @RequestParam(required = false) Double minRating,

            @Parameter(description = "Distribution location ID filter")
            @RequestParam(required = false) UUID distributionLocationId,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "averageRating") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.MealSearchRequest.builder()
                .keyword(keyword)
                .vendorId(vendorId)
                .businessName(businessName)
                .cuisineIds(cuisineIds)
                .dishTypeIds(dishTypeIds)
                .excludeIngredientIds(excludeIngredientIds)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .minRating(minRating)
                .distributionLocationId(distributionLocationId)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(mealService.searchApprovedMeals(request));
    }

    @GetMapping("/public/meals/featured")
    @Operation(
            summary = "Get featured meals (public)",
            description = """
            Returns top-rated approved + available meals for the landing page.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List of featured meals")
    })
    public ResponseEntity<List<MealSummaryResponse>> getFeaturedMeals(
            @Parameter(description = "Maximum number of meals to return")
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(mealService.getFeaturedMeals(limit));
    }
}