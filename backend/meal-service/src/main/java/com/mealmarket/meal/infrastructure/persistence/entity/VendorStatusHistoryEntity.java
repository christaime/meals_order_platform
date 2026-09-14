package com.mealmarket.meal.infrastructure.persistence.entity;

import com.mealmarket.meal.domain.model.VendorState;
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
@Table(name = "vendor_status_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorStatusHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 50)
    private VendorState.VendorStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 50)
    private VendorState.VendorStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_by", nullable = false, length = 255)
    private UUID changedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 50)
    private VendorState.StateChangeType changeType;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;
}