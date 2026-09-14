package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CategoryResponse;
import com.mealmarket.meal.application.dto.IngredientResponse;
import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.ModerationDataResponse;
import com.mealmarket.meal.application.dto.ModerationOutcome;
import com.mealmarket.meal.application.dto.ModerationQueueItemResponse;
import com.mealmarket.meal.application.dto.ModerationRequest;
import com.mealmarket.meal.application.dto.ModerationSummaryResponse;
import com.mealmarket.meal.application.service.ModerationService;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/moderation")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearer-jwt")
@Tag(name = "Moderation", description = "Moderate content across all moderable entities (admin only)")
public class ModerationController {

    private final ModerationService moderationService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  Unified Moderation Endpoint
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/{targetType}/{targetId}")
    @Operation(
            summary = "Moderate any entity (admin only)",
            description = """
            Unified moderation endpoint for all moderable entity types.

            **Decisions:**
            - `APPROVE`: PENDING → APPROVED
            - `REJECT`: PENDING → REJECTED
            - `DISABLE`: APPROVED → DISABLED
            - `REACTIVATE`: DISABLED → APPROVED
            - `REVOKE`: APPROVED → PENDING (send back for review)

            Every action is recorded in the moderation audit trail.

            **AI moderation:** an AI agent can call this endpoint with
            `performedByType = SYSTEM` (upstream). Currently only ADMIN is allowed.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Moderation applied",
                    content = @Content(schema = @Schema(implementation = ModerationOutcome.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid decision or missing reason"),
            @ApiResponse(responseCode = "404", description = "Target not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition from current status"),
            @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required")
    })
    public ResponseEntity<ModerationOutcome> moderate(
            @Parameter(description = "Target type", required = true,
                    schema = @Schema(allowableValues = {"MEAL", "INGREDIENT", "DISTRIBUTION_LOCATION", "CATEGORY"}))
            @PathVariable ModerationTargetType targetType,

            @Parameter(description = "Target ID", required = true)
            @PathVariable UUID targetId,

            @Valid @RequestBody ModerationRequest request
    ) {
        ModerationOutcome outcome = moderationService.moderate(
                targetType,
                targetId,
                request,
                UserType.ADMIN,
                currentUser.getUserId()
        );
        return ResponseEntity.ok(outcome);
    }

    // ═══════════════════════════════════════════════════════════
    //  Convenience Endpoints (typed responses)
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/meals/{id}")
    @Operation(
            summary = "Moderate a meal (admin only)",
            description = "Convenience endpoint for meal moderation — returns the updated meal."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Meal moderated",
                    content = @Content(schema = @Schema(implementation = MealResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid decision"),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<MealResponse> moderateMeal(
            @Parameter(description = "Meal ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody ModerationRequest request
    ) {
        return ResponseEntity.ok(moderationService.moderateMeal(
                id, request, UserType.ADMIN, currentUser.getUserId()
        ));
    }

    @PostMapping("/ingredients/{id}")
    @Operation(
            summary = "Moderate an ingredient (admin only)",
            description = "Convenience endpoint for ingredient moderation — returns the updated ingredient."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Ingredient moderated",
                    content = @Content(schema = @Schema(implementation = IngredientResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid decision"),
            @ApiResponse(responseCode = "404", description = "Ingredient not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<IngredientResponse> moderateIngredient(
            @Parameter(description = "Ingredient ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody ModerationRequest request
    ) {
        return ResponseEntity.ok(moderationService.moderateIngredient(
                id, request, UserType.ADMIN, currentUser.getUserId()
        ));
    }

    @PostMapping("/locations/{id}")
    @Operation(
            summary = "Moderate a distribution location (admin only)",
            description = "Convenience endpoint for location moderation — returns the updated location."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Location moderated",
                    content = @Content(schema = @Schema(implementation = LocationResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid decision"),
            @ApiResponse(responseCode = "404", description = "Location not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<LocationResponse> moderateLocation(
            @Parameter(description = "Location ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody ModerationRequest request
    ) {
        return ResponseEntity.ok(moderationService.moderateLocation(
                id, request, UserType.ADMIN, currentUser.getUserId()
        ));
    }

    @PostMapping("/categories/{id}")
    @Operation(
            summary = "Moderate a category (admin only)",
            description = "Convenience endpoint for category moderation — returns the updated category."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Category moderated",
                    content = @Content(schema = @Schema(implementation = CategoryResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid decision"),
            @ApiResponse(responseCode = "404", description = "Category not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<CategoryResponse> moderateCategory(
            @Parameter(description = "Category ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody ModerationRequest request
    ) {
        return ResponseEntity.ok(moderationService.moderateCategory(
                id, request, UserType.ADMIN, currentUser.getUserId()
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  Moderation Queue
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/queue/{targetType}")
    @Operation(
            summary = "Get pending moderation queue for a target type (admin only)",
            description = """
            Returns all PENDING items of the given target type, oldest first (FIFO).

            Used by the admin dashboard and by the AI moderation agent.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Paginated queue retrieved"
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<DataPage<ModerationQueueItemResponse>> getPendingQueue(
            @Parameter(description = "Target type", required = true,
                    schema = @Schema(allowableValues = {"MEAL", "INGREDIENT", "DISTRIBUTION_LOCATION", "CATEGORY"}))
            @PathVariable ModerationTargetType targetType,

            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageRequest = com.mealmarket.common.pagination.PageRequest.of(page, size);
        return ResponseEntity.ok(moderationService.getPendingQueue(targetType, pageRequest));
    }

    // ═══════════════════════════════════════════════════════════
    //  History
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/history/{targetType}/{targetId}")
    @Operation(
            summary = "Get full moderation history for a target (admin only)",
            description = "Returns all moderation actions on a specific entity, newest first."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "History retrieved",
                    content = @Content(schema = @Schema(implementation = ModerationDataResponse.class))
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<ModerationDataResponse>> getHistory(
            @Parameter(description = "Target type", required = true)
            @PathVariable ModerationTargetType targetType,

            @Parameter(description = "Target ID", required = true)
            @PathVariable UUID targetId
    ) {
        return ResponseEntity.ok(moderationService.getHistory(targetType, targetId));
    }

    @GetMapping("/history/{targetType}/{targetId}/latest")
    @Operation(
            summary = "Get latest moderation action on a target (admin only)",
            description = "Returns the most recent moderation action on the entity."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Latest action retrieved",
                    content = @Content(schema = @Schema(implementation = ModerationDataResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "No moderation history found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ModerationDataResponse> getLatestAction(
            @Parameter(description = "Target type", required = true)
            @PathVariable ModerationTargetType targetType,

            @Parameter(description = "Target ID", required = true)
            @PathVariable UUID targetId
    ) {
        return ResponseEntity.ok(
                moderationService.getLatestAction(targetType, targetId)
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Activity Feed
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/recent-activity")
    @Operation(
            summary = "Get recent moderation activity (admin only)",
            description = """
            Returns the most recent moderation actions across all target types.
            Used by the admin dashboard activity feed.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Recent activity retrieved",
                    content = @Content(schema = @Schema(implementation = ModerationSummaryResponse.class))
            ),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<List<ModerationSummaryResponse>> getRecentActivity(
            @Parameter(description = "Maximum number of actions to return")
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(moderationService.getRecentActivity(limit));
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/stats/{targetType}")
    @Operation(
            summary = "Get moderation stats by target type (admin only)",
            description = """
            Returns counts of actions by resulting status for a target type.
            Example: how many meals have been APPROVED, REJECTED, DISABLED.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<Map<String, Long>> getStats(
            @Parameter(description = "Target type", required = true)
            @PathVariable ModerationTargetType targetType
    ) {
        return ResponseEntity.ok(Map.of(
                "approved", moderationService.countByTargetAndStatus(
                        targetType, ModerationStatus.APPROVED),
                "rejected", moderationService.countByTargetAndStatus(
                        targetType, ModerationStatus.REJECTED),
                "disabled", moderationService.countByTargetAndStatus(
                        targetType, ModerationStatus.DISABLED),
                "pending", moderationService.countPending(targetType)
        ));
    }
}