package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.ModerationStatus;
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
        name = "distribution_locations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_distribution_locations_vendor_name",
                columnNames = {"vendor_id", "name"}
        ),
        indexes = {
                @Index(name = "idx_distribution_locations_vendor_id", columnList = "vendor_id"),
                @Index(name = "idx_distribution_locations_coordinates", columnList = "latitude, longitude"),
                @Index(name = "idx_distribution_locations_moderation_status", columnList = "moderation_status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistributionLocationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "delivery_radius")
    @Builder.Default
    private Integer deliveryRadius = 10;

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