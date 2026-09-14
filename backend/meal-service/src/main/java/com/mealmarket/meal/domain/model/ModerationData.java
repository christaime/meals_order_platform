package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import com.mealmarket.common.constant.UUIDConstant;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Audit record for every moderation action on a moderable entity.
 * Append-only — never updated, never deleted.
 *
 * Provides a complete trace of:
 * - When the entity was created (initial PENDING)
 * - Every status transition (approve, reject, disable, reactivate)
 * - Who performed the action and why
 */
@Getter
public class ModerationData {

    private final UUID id;

    // ─── Target ───────────────────────────────────────────────
    /**
     * The kind of entity being moderated.
     */
    @NotNull(message = "Target type is required")
    private final ModerationTargetType targetType;

    /**
     * The ID of the entity being moderated.
     */
    @NotNull(message = "Target ID is required")
    private final UUID targetId;

    // ─── Transition ───────────────────────────────────────────
    private final ModerationStatus fromStatus;   // null for initial creation

    @NotNull(message = "Target status is required")
    private final ModerationStatus toStatus;

    @Size(max = 2000, message = "Reason cannot exceed 2000 characters")
    private final String reason;

    // ─── Actor ────────────────────────────────────────────────
    @NotNull(message = "Performed by type is required")
    private final UserType performedByType;

    @NotNull(message = "Performed by ID is required")
    private final UUID performedById;

    // ─── Timestamp ────────────────────────────────────────────
    @NotNull(message = "Performed at timestamp is required")
    private final Instant performedAt;

    private ModerationData(Builder builder) {
        this.id = builder.id;
        this.targetType = builder.targetType;
        this.targetId = builder.targetId;
        this.fromStatus = builder.fromStatus;
        this.toStatus = builder.toStatus;
        this.reason = builder.reason;
        this.performedByType = builder.performedByType;
        this.performedById = builder.performedById;
        this.performedAt = builder.performedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory Methods — Common Transitions
    // ═══════════════════════════════════════════════════════════

    /**
     * Record the initial creation of a moderable entity.
     * Always transitions to PENDING.
     */
    public static ModerationData created(
            ModerationTargetType targetType,
            UUID targetId,
            UserType createdByType,
            UUID createdById
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(null)
                .toStatus(ModerationStatus.PENDING)
                .reason("Entity created")
                .performedByType(createdByType)
                .performedById(createdById)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record an approval (PENDING → APPROVED).
     */
    public static ModerationData approved(
            ModerationTargetType targetType,
            UUID targetId,
            UUID adminId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(ModerationStatus.PENDING)
                .toStatus(ModerationStatus.APPROVED)
                .reason("Approved")
                .performedByType(UserType.ADMIN)
                .performedById(adminId)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record a rejection (PENDING → REJECTED).
     */
    public static ModerationData rejected(
            ModerationTargetType targetType,
            UUID targetId,
            String reason,
            UUID adminId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(ModerationStatus.PENDING)
                .toStatus(ModerationStatus.REJECTED)
                .reason(reason)
                .performedByType(UserType.ADMIN)
                .performedById(adminId)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record a disablement (APPROVED → DISABLED).
     */
    public static ModerationData disabled(
            ModerationTargetType targetType,
            UUID targetId,
            String reason,
            UUID adminId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(ModerationStatus.APPROVED)
                .toStatus(ModerationStatus.DISABLED)
                .reason(reason)
                .performedByType(UserType.ADMIN)
                .performedById(adminId)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record a re-approval (DISABLED → APPROVED).
     */
    public static ModerationData reactivated(
            ModerationTargetType targetType,
            UUID targetId,
            UUID adminId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(ModerationStatus.DISABLED)
                .toStatus(ModerationStatus.APPROVED)
                .reason("Reactivated")
                .performedByType(UserType.ADMIN)
                .performedById(adminId)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record a revocation (APPROVED → PENDING) — send back for re-review.
     */
    public static ModerationData revoked(
            ModerationTargetType targetType,
            UUID targetId,
            String reason,
            UUID adminId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(ModerationStatus.APPROVED)
                .toStatus(ModerationStatus.PENDING)
                .reason(reason)
                .performedByType(UserType.ADMIN)
                .performedById(adminId)
                .performedAt(Instant.now())
                .build();
    }

    /**
     * Record an AI-driven moderation action.
     * Uses SYSTEM as performer type with a synthetic ID.
     */
    public static ModerationData aiAction(
            ModerationTargetType targetType,
            UUID targetId,
            ModerationStatus fromStatus,
            ModerationStatus toStatus,
            String reason,
            UUID aiAgentId
    ) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .reason(reason)
                .performedByType(UserType.SYSTEM)
                .performedById(UUIDConstant.ALL_ZERO)
                .performedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private ModerationTargetType targetType;
        private UUID targetId;
        private ModerationStatus fromStatus;
        private ModerationStatus toStatus;
        private String reason;
        private UserType performedByType;
        private UUID performedById;
        private Instant performedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder targetType(ModerationTargetType v) { this.targetType = v; return this; }
        public Builder targetId(UUID v) { this.targetId = v; return this; }
        public Builder fromStatus(ModerationStatus v) { this.fromStatus = v; return this; }
        public Builder toStatus(ModerationStatus v) { this.toStatus = v; return this; }
        public Builder reason(String v) { this.reason = v; return this; }
        public Builder performedByType(UserType v) { this.performedByType = v; return this; }
        public Builder performedById(UUID v) { this.performedById = v; return this; }
        public Builder performedAt(Instant v) { this.performedAt = v; return this; }

        public ModerationData build() {
            ModerationData data = new ModerationData(this);
            DomainValidation.validate(data);
            return data;
        }
    }
}