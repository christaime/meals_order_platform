package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "moderation_data",
        indexes = {
                @Index(name = "idx_moderation_target", columnList = "target_type, target_id"),
                @Index(name = "idx_moderation_performed_at", columnList = "performed_at"),
                @Index(name = "idx_moderation_performed_by", columnList = "performed_by_type, performed_by_id"),
                @Index(name = "idx_moderation_to_status", columnList = "to_status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationDataEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ─── Target ───────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 50)
    private ModerationTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    // ─── Transition ───────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private ModerationStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private ModerationStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    // ─── Actor ────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "performed_by_type", nullable = false, length = 20)
    private UserType performedByType;

    @Column(name = "performed_by_id", nullable = false, length = 255)
    private UUID performedById;

    // ─── Timestamp ────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt;
}