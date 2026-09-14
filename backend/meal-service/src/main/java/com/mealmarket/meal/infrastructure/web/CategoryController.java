package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CategoryResponse;
import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.CreateCategoryRequest;
import com.mealmarket.meal.application.dto.UpdateCategoryRequest;
import com.mealmarket.meal.application.service.CategoryService;
import com.mealmarket.meal.domain.model.CategoryType;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Manage categories (cuisines and dish types)")
public class CategoryController {

    private final CategoryService categoryService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Create
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/admin/categories")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Create a new category (admin only)",
            description = """
            Creates a new category (CUISINE or DISH_TYPE).
            The category is created in PENDING status and must be approved
            by an admin (or AI moderator) before being visible to customers.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Category created successfully",
                    content = @Content(schema = @Schema(implementation = CategoryResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid input (validation errors)"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "A category with this (name, type) already exists"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Access denied — ADMIN role required"
            )
    })
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CreateCategoryRequest request
    ) {
        CategoryResponse response = categoryService.createCategory(
                request,
                currentUser.getUserType(),
                currentUser.getUserId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Read (any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get a category by ID (admin only)",
            description = "Returns a category regardless of its moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Category found",
                    content = @Content(schema = @Schema(implementation = CategoryResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Category not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<CategoryResponse> getCategoryById(
            @Parameter(description = "Category ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Search (any status)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/categories")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Search categories (admin only)",
            description = "Full search across all categories, any moderation status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Paginated list of categories"
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<CategoryResponse>> searchCategories(
            @Parameter(description = "Keyword search in name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Exact name match")
            @RequestParam(required = false) String name,

            @Parameter(description = "Category type (CUISINE or DISH_TYPE)")
            @RequestParam(required = false) CategoryType type,

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
        var request = com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest.builder()
                .keyword(keyword)
                .name(name)
                .type(type)
                .moderationStatus(moderationStatus)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(categoryService.searchCategories(request));
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Update
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Update a category (admin only)",
            description = """
            Updates the descriptive fields of a category.
            The category's type is immutable — only name, description, and icon can change.
            Moderation status is not affected by this operation.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Category updated",
                    content = @Content(schema = @Schema(implementation = CategoryResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "404", description = "Category not found"),
            @ApiResponse(responseCode = "409", description = "Name conflict"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<CategoryResponse> updateCategory(
            @Parameter(description = "Category ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody UpdateCategoryRequest request
    ) {
        CategoryResponse response = categoryService.updateCategory(
                id, request, currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Delete
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping("/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Delete a category (admin only)",
            description = """
            Deletes a category following the moderation-aware rule:
            - PENDING / REJECTED → hard delete from DB
            - APPROVED → transition to DISABLED + record moderation
            - DISABLED → rejected (already retired)
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Category deleted or disabled"),
            @ApiResponse(responseCode = "404", description = "Category not found"),
            @ApiResponse(responseCode = "409", description = "Category is disabled and cannot be deleted"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Void> deleteCategory(
            @Parameter(description = "Category ID", required = true)
            @PathVariable UUID id
    ) {
        categoryService.deleteCategory(id, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — Statistics
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/admin/categories/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Category statistics (admin only)",
            description = "Returns counts by type and total."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getStatistics() {
        return ResponseEntity.ok(Map.of(
                "total", categoryService.countAll(),
                "cuisines", categoryService.countByType(CategoryType.CUISINE),
                "dishTypes", categoryService.countByType(CategoryType.DISH_TYPE)
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — Read (approved only)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/categories/{id}")
    @Operation(
            summary = "Get an approved category by ID (public)",
            description = """
            Returns a category only if it is APPROVED.
            Used by customers browsing categories and by vendors
            during registration (cuisine selection).
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Approved category found",
                    content = @Content(schema = @Schema(implementation = CategoryResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Category not found or not approved")
    })
    public ResponseEntity<CategoryResponse> getApprovedCategoryById(
            @Parameter(description = "Category ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(categoryService.getApprovedCategoryById(id));
    }

    @GetMapping("/public/categories")
    @Operation(
            summary = "Search approved categories (public)",
            description = """
            Returns only APPROVED categories.
            Used by customers (browsing) and vendors (registration, meal forms).
            Returns summaries for lightweight payloads.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Paginated list of approved categories")
    })
    public ResponseEntity<DataPage<CategorySummaryResponse>> searchApprovedCategories(
            @Parameter(description = "Keyword search in name or description")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Category type (CUISINE or DISH_TYPE)")
            @RequestParam(required = false) CategoryType type,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "name") String sortBy,

            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "ASC") Sort.Direction sortDirection
    ) {
        var request = com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest.builder()
                .keyword(keyword)
                .type(type)
                .sortBy(sortBy, com.mealmarket.common.pagination.Sort.Direction.valueOf(sortDirection.name()))
                .page(page, size)
                .build();

        return ResponseEntity.ok(categoryService.searchApprovedCategories(request));
    }
}