package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "ingredients",
        indexes = {
                @Index(name = "idx_ingredients_name", columnList = "name"),
                @Index(name = "idx_ingredients_is_allergen", columnList = "is_allergen"),
                @Index(name = "idx_ingredients_moderation_status", columnList = "moderation_status"),
                @Index(name = "idx_ingredients_created_by_id", columnList = "created_by_id"),
                @Index(name = "idx_ingredients_created_by_type", columnList = "created_by_type")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SQLRestriction("moderation_status <> 'DISABLED'")
public class IngredientEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "is_allergen")
    @Builder.Default
    private Boolean isAllergen = false;

    // ─── Origin (immutable) ───────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_type", nullable = false, length = 20)
    private UserType createdByType;

    @Column(name = "created_by_id", nullable = false, length = 255)
    private UUID createdById;

    // ─── Moderation (current state only) ──────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 20)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    // ─── Timestamps ───────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}