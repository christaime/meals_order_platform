package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VendorJpaRepository
        extends JpaRepository<VendorEntity, UUID>,
        JpaSpecificationExecutor<VendorEntity> {

    // ─── Uniqueness ───────────────────────────────────────────

    Optional<VendorEntity> findByEmail(String email);

    Optional<VendorEntity> findByUserId(UUID userId);

    boolean existsByEmail(String email);

    boolean existsByUserId(UUID userId);
    /**
     * Case-insensitive check for business name uniqueness.
     * Uses lower-case comparison to prevent "Delicious Bites" vs "delicious bites".
     */
    boolean existsByBusinessNameIgnoreCase(String businessName);

    // ─── Status Queries ───────────────────────────────────────

    boolean existsByIdAndStatus(UUID id, VendorState.VendorStatus status);

    @Query("SELECT COUNT(v) > 0 FROM VendorEntity v WHERE :categoryId MEMBER OF v.categoryIds")
    boolean existsByCategoryId(@Param("categoryId") UUID categoryId);
    // ─── Bulk Lookup (relationship assembly) ──────────────────

    List<VendorEntity> findByIdIn(List<UUID> ids);

    // ─── Statistics ───────────────────────────────────────────

    long countByStatus(VendorState.VendorStatus status);
}