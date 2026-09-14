package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.domain.repository.criteria.VendorStatusHistorySearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link VendorStateChange} — the audit trail
 * of vendor state transitions.
 */
public interface VendorStatusHistoryRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD (append-only)
    // ═══════════════════════════════════════════════════════════

    VendorStateChange save(VendorStateChange change);

    Optional<VendorStateChange> findById(UUID id);

    // ═══════════════════════════════════════════════════════════
    //  Vendor History Queries
    // ═══════════════════════════════════════════════════════════

    /**
     * Full history for a vendor (newest first).
     */
    List<VendorStateChange> findByVendorId(UUID vendorId);

    /**
     * Paginated history for a vendor.
     */
    DataPage<VendorStateChange> findByVendorId(UUID vendorId, com.mealmarket.common.pagination.PageRequest pageRequest);

    /**
     * Most recent state change for a vendor.
     */
    Optional<VendorStateChange> findLatestByVendorId(UUID vendorId);

    // ═══════════════════════════════════════════════════════════
    //  Trust & Reputation
    // ═══════════════════════════════════════════════════════════

    /**
     * Count how many times a vendor reached a given status.
     * Used for trust metrics (e.g., number of bans).
     */
    long countByVendorIdAndToStatus(UUID vendorId, VendorState.VendorStatus toStatus);

    /**
     * Count total bans across the platform.
     */
    long countByToStatus(VendorState.VendorStatus toStatus);

    // ═══════════════════════════════════════════════════════════
    //  Search (single entry point for all filters)
    // ═══════════════════════════════════════════════════════════

    DataPage<VendorStateChange> search(VendorStatusHistorySearchRequest request);
}