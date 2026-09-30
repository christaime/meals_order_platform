package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.ModerationStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "meals",
        indexes = {
                @Index(name = "idx_meals_vendor_id", columnList = "vendor_id"),
                @Index(name = "idx_meals_name", columnList = "name"),
                @Index(name = "idx_meals_is_available", columnList = "is_available"),
                @Index(name = "idx_meals_average_rating", columnList = "average_rating"),
                @Index(name = "idx_meals_price", columnList = "price"),
                @Index(name = "idx_meals_moderation_status", columnList = "moderation_status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SQLRestriction("moderation_status <> 'DISABLED'")
public class MealEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "image_storage_ref", length = 512)
    private String imageStorageRef;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;

    @Column(name = "average_rating")
    @Builder.Default
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Column(name = "total_ratings")
    @Builder.Default
    private Integer totalRatings = 0;

    @Column(name = "prep_time_minutes")
    private Integer prepTimeMinutes;

    // ─── Moderation ───────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 20)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    // ─── Category IDs ─────────────────────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "meals_categories",
            joinColumns = @JoinColumn(name = "meal_id")
    )
    @Column(name = "category_id")
    @Builder.Default
    private List<UUID> categoryIds = new ArrayList<>();

    // ─── Ingredient IDs ───────────────────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "meals_ingredients",
            joinColumns = @JoinColumn(name = "meal_id")
    )
    @Column(name = "ingredient_id")
    @Builder.Default
    private List<UUID> ingredientIds = new ArrayList<>();

    // ─── Distribution Location IDs ────────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "meals_distribution_locations",
            joinColumns = @JoinColumn(name = "meal_id")
    )
    @Column(name = "distribution_location_id")
    @Builder.Default
    private List<UUID> distributionLocationIds = new ArrayList<>();

    // ─── Timestamps ───────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}