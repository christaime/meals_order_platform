package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.meal.application.dto.VendorDashboardResponse;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorStateChangeResponse;
import com.mealmarket.meal.application.service.VendorService;
import com.mealmarket.meal.application.service.VendorStateChangeService;
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
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Vendor State", description = "Manage vendor lifecycle (state transitions, history, dashboard)")
public class VendorStateController {

    private final VendorStateChangeService stateChangeService;
    private final VendorService vendorService;
    private final CurrentUser currentUser;

    // ═══════════════════════════════════════════════════════════
    //  ADMIN — State Transitions
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/admin/vendors/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Activate a vendor (admin only)",
            description = """
            Transitions the vendor to ACTIVE status.

            **Allowed from:** PENDING, SUSPENDED, INACTIVE
            **Result:** Vendor becomes publicly visible and can accept orders.

            A state change is recorded in the vendor's history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Vendor activated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition from current status"),
            @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required")
    })
    public ResponseEntity<VendorResponse> activateVendor(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        VendorResponse response = stateChangeService.activateVendor(
                id, currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/vendors/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Suspend a vendor (admin only)",
            description = """
            Transitions the vendor to SUSPENDED status.

            **Allowed from:** ACTIVE
            **Result:** Vendor is temporarily disabled — can be reactivated later.

            A reason is required and recorded in the history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Vendor suspended",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Missing reason"),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition from current status"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> suspendVendor(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody StateChangeRequest request
    ) {
        VendorResponse response = stateChangeService.suspendVendor(
                id, request.reason(), currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/vendors/{id}/ban")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Ban a vendor (admin only)",
            description = """
            Transitions the vendor to BANNED status (terminal state).

            **Allowed from:** PENDING, ACTIVE, SUSPENDED, INACTIVE
            **Result:** Vendor is permanently banned. Cannot be reactivated.

            A reason is required and recorded in the history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Vendor banned",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Missing reason"),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition (already banned)"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> banVendor(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody StateChangeRequest request
    ) {
        VendorResponse response = stateChangeService.banVendor(
                id, request.reason(), currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/vendors/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Deactivate a vendor (admin only)",
            description = """
            Transitions the vendor to INACTIVE status.

            **Allowed from:** ACTIVE
            **Result:** Vendor is no longer visible but can be reactivated.

            A reason is optional and recorded in the history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Vendor deactivated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition from current status"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> deactivateVendor(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id,

            @Valid @RequestBody(required = false) StateChangeRequest request
    ) {
        String reason = (request != null) ? request.reason() : null;
        VendorResponse response = stateChangeService.deactivateVendor(
                id, reason, currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Deactivate Own Account
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/vendor/profile/deactivate")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Deactivate your own account (vendor only)",
            description = """
            Vendor voluntarily deactivates their own account.

            **Allowed from:** ACTIVE
            **Result:** Vendor is no longer visible but can be reactivated by contacting support.

            A reason is required and recorded in the history.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Account deactivated",
                    content = @Content(schema = @Schema(implementation = VendorResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Missing reason"),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition from current status"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorResponse> deactivateOwnAccount(
            @Valid @RequestBody StateChangeRequest request
    ) {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        VendorResponse response = stateChangeService.deactivateOwnAccount(
                vendor.getId(), request.reason(), currentUser.getUserId()
        );
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  VENDOR — Own Dashboard
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/vendor/dashboard")
    @PreAuthorize("hasRole('VENDOR')")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Get your vendor dashboard (vendor only)",
            description = """
            Returns aggregated statistics for the authenticated vendor:
            - Meal counts (total, available, pending)
            - Rating stats (average, total)
            - Trust metrics (ban count, suspension count)
            - Top meals (Phase 2)
            - Weekly trends (Phase 2)

            Some fields are placeholders in Phase 1 (order-related metrics).
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Dashboard retrieved",
                    content = @Content(schema = @Schema(implementation = VendorDashboardResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<VendorDashboardResponse> getOwnDashboard() {
        var vendor = vendorService.getOwnProfileEntity(currentUser.getUserId());
        return ResponseEntity.ok(
                stateChangeService.getVendorDashboard(vendor.getId(), currentUser.getUserId())
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  PUBLIC — History (trust transparency)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/public/vendors/{id}/history")
    @Operation(
            summary = "Get a vendor's state history (public)",
            description = """
            Returns the full state history of a vendor, newest first.

            **Trust transparency:** customers can see the vendor's track record —
            activations, suspensions, bans — building confidence in the platform.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "History retrieved",
                    content = @Content(schema = @Schema(implementation = VendorStateChangeResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found")
    })
    public ResponseEntity<List<VendorStateChangeResponse>> getVendorHistory(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(stateChangeService.getVendorHistory(id));
    }

    @GetMapping("/public/vendors/{id}/latest-state")
    @Operation(
            summary = "Get the latest state change of a vendor (public)",
            description = "Returns the most recent state transition of the vendor."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Latest state retrieved",
                    content = @Content(schema = @Schema(implementation = VendorStateChangeResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Vendor not found or no history")
    })
    public ResponseEntity<VendorStateChangeResponse> getLatestState(
            @Parameter(description = "Vendor ID", required = true)
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(stateChangeService.getLatestState(id));
    }

    // ═══════════════════════════════════════════════════════════
    //  Nested Request DTO
    // ═══════════════════════════════════════════════════════════

    /**
     * Request body for state transitions that require a reason.
     */
    public record StateChangeRequest(
            @NotBlank(message = "Reason is required")
            String reason
    ) {}
}