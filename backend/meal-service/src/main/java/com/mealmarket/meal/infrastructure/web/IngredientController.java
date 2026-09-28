package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateIngredientRequest;
import com.mealmarket.meal.application.dto.IngredientResponse;
import com.mealmarket.meal.application.dto.IngredientSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateIngredientRequest;
import com.mealmarket.meal.application.service.IngredientService;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Ingredients", description = "Manage ingredients (admin + vendor suggestions)")
public class IngredientController {

    private final IngredientService ingredientService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Create
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/admin/ingredients")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Create a new ingredient (admin only)",
            description = """
            Creates a new ingredient as an admin.
            The ingredient is created in PENDING status and must be approved
            before being visible to customers.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Ingredient created successfully (PENDING moderation)",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "An ingredient with this name already exists"),
            @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required")
    })
    public ResponseEntity<IngredientResponse> createIngredientAsAdmin(
            @Valid @RequestBody CreateIngredientRequest request
    ) {
        return createIngredient(request, UserType.ADMIN);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Suggest
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/vendor/ingredients")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Suggest a new ingredient (vendor only)",
            description = """
            Vendors suggest a new ingredient.
            The ingredient is created in PENDING status and must be approved
            by an admin before being visible to customers.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Ingredient suggested successfully (PENDING moderation)",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "An ingredient with this name already exists"),
            @ApiResponse(responseCode = "403", description = "Access denied — VENDOR role required")
    })
    public ResponseEntity<IngredientResponse> suggestIngredientAsVendor(
            @Valid @RequestBody CreateIngredientRequest request
    ) {
        return createIngredient(request, UserType.VENDOR);
    }

    @GetMapping("/vendor/ingredients")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(
            summary = "Search approved ingredients (public)",
            description = """
            Returns only APPROVED ingredients.
            Used by vendors when creating/editing meals, and by customers
            browsing meal details. Returns summaries for lightweight payloads.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of approved ingredients")
    })
    public ResponseEntity<DataPage<IngredientSummaryResponse>> searchVendorIngredients(
            @Parameter(description = "Keyword search in name")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Filter by allergen flag")
            @RequestParam(required = false) Boolean isAllergen,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "name") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "ASC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest.builder()
                .keyword(keyword)
                .isAllergen(isAllergen)
                .createdById(this.currentUser.getUserId()) //
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(ingredientService.searchApprovedIngredients(request));
    }
    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Read (any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/ingredients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get an ingredient by ID (admin only)",
            description = "Returns an ingredient regardless of its moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Ingredient found",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Ingredient not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<IngredientResponse> getIngredientById(
            @Parameter(description = "Ingredient ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ingredientService.getIngredientById(id));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Search (any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/ingredients")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search ingredients (admin only)",
            description = "Full search across all ingredients, any moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of ingredients"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<IngredientResponse>> searchIngredients(
            @Parameter(description = "Keyword search in name")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact name match")
            @RequestParam(required = false) String name,

            @Parameter(description = "Filter by allergen flag")
            @RequestParam(required = false) Boolean isAllergen,

            @Parameter(description = "Moderation status filter")
            @RequestParam(required = false) ModerationStatus moderationStatus,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest.builder()
                .keyword(keyword)
                .name(name)
                .isAllergen(isAllergen)
                .moderationStatus(moderationStatus)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(ingredientService.searchIngredients(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Update
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/admin/ingredients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update an ingredient (admin only)",
            description = """
            Updates the descriptive fields of an ingredient.
            Moderation status is not affected by this operation.
            Use the moderation endpoints to change status.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Ingredient updated",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "404", description = "Ingredient not found"),
            @ApiResponse(responseCode = "409", description = "Name conflict"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<IngredientResponse> updateIngredient(
            @Parameter(description = "Ingredient ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody UpdateIngredientRequest request
    ) {
        IngredientResponse response = ingredientService.updateIngredient(
                id, request, currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Delete
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/admin/ingredients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Delete an ingredient (admin only)",
            description = """
            Deletes an ingredient following the moderation-aware rule:
            - PENDING / REJECTED → hard delete from DB
            - APPROVED → transition to DISABLED + record moderation
            - DISABLED → rejected (already retired)
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Ingredient deleted or disabled"),
            @ApiResponse(responseCode = "404", description = "Ingredient not found"),
            @ApiResponse(responseCode = "409", description = "Ingredient is disabled and cannot be deleted"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Void> deleteIngredient(
            @Parameter(description = "Ingredient ID", required = true)
            @PathVariable UUID id
    ) {
        ingredientService.deleteIngredient(id, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Statistics
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/ingredients/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Ingredient statistics (admin only)",
            description = "Returns total ingredient count."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getStatistics() {
        return ResponseEntity.ok(Map.of(
                "total", ingredientService.countAll()
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Read (approved only)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/ingredients/{id}")
    @Operation(
            summary = "Get an approved ingredient by ID (public)",
            description = """
            Returns an ingredient only if it is APPROVED.
            Used by customers (meal detail view) and vendors (meal forms).
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Approved ingredient found",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Ingredient not found or not approved")
    })
    public ResponseEntity<IngredientResponse> getApprovedIngredientById(
            @Parameter(description = "Ingredient ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ingredientService.getApprovedIngredientById(id));
    }

    @GetMapping("/public/ingredients")
    @Operation(
            summary = "Search approved ingredients (public)",
            description = """
            Returns only APPROVED ingredients.
            Used by vendors when creating/editing meals, and by customers
            browsing meal details. Returns summaries for lightweight payloads.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of approved ingredients")
    })
    public ResponseEntity<DataPage<IngredientSummaryResponse>> searchApprovedIngredients(
            @Parameter(description = "Keyword search in name")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Filter by allergen flag")
            @RequestParam(required = false) Boolean isAllergen,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "name") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "ASC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest.builder()
                .keyword(keyword)
                .isAllergen(isAllergen)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(ingredientService.searchApprovedIngredients(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  Private Helper
    // ═══════════════════════════════════════════════════════════

    /**
     * Shared creation logic.
     * The {@code userType} is passed explicitly by the caller — never derived
     * from the JWT — to guarantee the creator type matches the endpoint's role.
     */
    private ResponseEntity<IngredientResponse> createIngredient(
            CreateIngredientRequest request,
            UserType userType
    ) {
        IngredientResponse response = ingredientService.createIngredient(
                request,
                userType,
                currentUser.getUserId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}