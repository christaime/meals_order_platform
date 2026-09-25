package com.mealmarket.meal.infrastructure.persistence.entity;


import com.mealmarket.meal.domain.model.VendorState;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.mealmarket.meal.domain.model.SubscriptionTier;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "vendors",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_vendors_user_id",
                        columnNames = "user_id"
                ),
                @UniqueConstraint(
                        name = "uk_vendors_email",
                        columnNames = "email"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "business_name", nullable = false, length = 100)
    private String businessName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 50)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_tier", nullable = false, length = 20)
    @Builder.Default
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;

    // ─── Ratings ──────────────────────────────────────────────

    @Column(name = "rating_avg")
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "total_ratings")
    @Builder.Default
    private Integer totalRatings = 0;

    // ─── Current State ────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private VendorState.VendorStatus status = VendorState.VendorStatus.PENDING;

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @Column(name = "status_changed_at")
    private Instant statusChangedAt;

    @Column(name = "status_changed_by", length = 255)
    private UUID statusChangedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_change_type", length = 50)
    private VendorState.StateChangeType statusChangeType;

    // ─── Delivery ─────────────────────────────────────────────

    @Column(name = "delivery_radius")
    @Builder.Default
    private Integer deliveryRadius = 10;

    @Column(name = "pickup_address", length = 255)
    private String pickupAddress;

    // ─── Profile ──────────────────────────────────────────────

    @Column(name = "profile_image_storage_ref", length = 512)
    private String profileImageStorageRef;

    @Column(name = "cover_image_storage_ref", length = 512)
    private String coverImageStorageRef;

    @Column(name = "id_card_front_storage_ref", length = 512)
    private String idCardFrontStorageRef;

    @Column(name = "id_card_back_storage_ref", length = 512)
    private String idCardBackStorageRef;

    // ─── Category IDs (CUISINE only) ──────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "vendors_categories",
            joinColumns = @JoinColumn(name = "vendor_id")
    )
    @Column(name = "category_id")
    @Builder.Default
    private List<UUID> categoryIds = new ArrayList<>();

    // ─── Distribution Location IDs ────────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "vendors_distribution_locations",
            joinColumns = @JoinColumn(name = "vendor_id")
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