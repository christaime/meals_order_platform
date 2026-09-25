package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link Vendor}.
 * Vendors are the core business entity of the marketplace.
 */
public interface VendorRepository {

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    Vendor save(Vendor vendor);

    Optional<Vendor> findById(UUID id);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    void delete(Vendor vendor);

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    Optional<Vendor> findByEmail(String email);

    Optional<Vendor> findByUserId(UUID userId);

    boolean existsByEmail(String email);
    boolean existsByUserId(UUID userId);
    /**
     * Business name must be unique across the platform
     * to avoid customer confusion.
     */
    boolean existsByBusinessName(String businessName);

    boolean existsByCategoryId(UUID categoryId);

    // ═══════════════════════════════════════════════════════════
    //  Status Queries
    // ═══════════════════════════════════════════════════════════

    boolean isVendorActive(UUID vendorId);

    boolean isVendorBanned(UUID vendorId);

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (relationship assembly)
    // ═══════════════════════════════════════════════════════════

    List<Vendor> findAllById(List<UUID> ids);

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    DataPage<Vendor> search(VendorSearchRequest request);

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    long countByStatus(VendorState.VendorStatus status);

    /**
     * Count total number of vendors.
     */
    long count();
}