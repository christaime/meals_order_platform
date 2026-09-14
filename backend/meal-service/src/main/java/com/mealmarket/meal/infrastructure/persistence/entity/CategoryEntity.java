package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "categories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_categories_name_type",
                columnNames = {"name", "type"}
        ),
        indexes = {
                @Index(name = "idx_categories_type", columnList = "type"),
                @Index(name = "idx_categories_name", columnList = "name"),
                @Index(name = "idx_categories_moderation_status", columnList = "moderation_status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CategoryType type;

    // ─── Origin ───────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_type", nullable = false, length = 20)
    private UserType createdByType;

    @Column(name = "created_by_id", nullable = false, length = 255)
    private UUID createdById;

    // ─── Moderation ───────────────────────────────────────────

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