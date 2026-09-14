package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link DistributionLocation}.
 *
 * Locations are fully owned by vendors — most operations are scoped to a vendor.
 * The only exception is the moderation queue (admin-wide).
 */
public interface DistributionLocationRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    DistributionLocation save(DistributionLocation location);

    Optional<DistributionLocation> findById(UUID id);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    void delete(DistributionLocation location);

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness (per vendor)
    // ═══════════════════════════════════════════════════════════

    boolean existsByVendorIdAndName(UUID vendorId, String name);

    Optional<DistributionLocation> findByVendorIdAndName(UUID vendorId, String name);

    // ═══════════════════════════════════════════════════════════
    //  Vendor-Scoped Queries
    // ═══════════════════════════════════════════════════════════

    List<DistributionLocation> findByVendorId(UUID vendorId);

    long countByVendorId(UUID vendorId);

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (relationship assembly)
    // ═══════════════════════════════════════════════════════════

    List<DistributionLocation> findAllById(List<UUID> ids);

    // ═══════════════════════════════════════════════════════════
    //  Proximity Queries
    // ═══════════════════════════════════════════════════════════

    List<DistributionLocation> findNearbyByVendorId(
            UUID vendorId,
            double latitude,
            double longitude,
            int radiusKm
    );

    // ═══════════════════════════════════════════════════════════
    //  Moderation Queue (admin-wide — justified exception)
    // ═══════════════════════════════════════════════════════════

    /**
     * Fetch all locations in a given moderation status.
     * Used by the admin moderation queue. This is a justified exception to
     * the "search-only" rule because admin-wide queries are not vendor-scoped.
     */
    List<DistributionLocation> findByModerationStatus(ModerationStatus status);

    // ═══════════════════════════════════════════════════════════
    //  Search (scoped to a vendor — request.vendorId is required)
    // ═══════════════════════════════════════════════════════════

    DataPage<DistributionLocation> search(DistributionLocationSearchRequest request);
}