package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorStatusHistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VendorStatusHistoryJpaRepository
        extends JpaRepository<VendorStatusHistoryEntity, UUID>,
        JpaSpecificationExecutor<VendorStatusHistoryEntity> {

    // ─── Vendor History ───────────────────────────────────────

    List<VendorStatusHistoryEntity> findByVendorIdOrderByChangedAtDesc(UUID vendorId);

    Page<VendorStatusHistoryEntity> findByVendorIdOrderByChangedAtDesc(
            UUID vendorId,
            Pageable pageable
    );

    /**
     * Most recent change for a vendor.
     */
    Optional<VendorStatusHistoryEntity> findFirstByVendorIdOrderByChangedAtDesc(UUID vendorId);

    // ─── Trust Metrics ────────────────────────────────────────

    long countByVendorIdAndToStatus(UUID vendorId, VendorState.VendorStatus toStatus);

    long countByToStatus(VendorState.VendorStatus toStatus);
}