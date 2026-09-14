package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DistributionLocationJpaRepository
        extends JpaRepository<DistributionLocationEntity, UUID>,
        JpaSpecificationExecutor<DistributionLocationEntity> {

    // ─── Uniqueness ───────────────────────────────────────────

    boolean existsByVendorIdAndName(UUID vendorId, String name);

    Optional<DistributionLocationEntity> findByVendorIdAndName(UUID vendorId, String name);

    // ─── Vendor Queries ───────────────────────────────────────

    List<DistributionLocationEntity> findByVendorId(UUID vendorId);

    long countByVendorId(UUID vendorId);

    // ─── Bulk Lookup ──────────────────────────────────────────

    List<DistributionLocationEntity> findByIdIn(List<UUID> ids);

    // ─── Moderation Queue (admin-wide) ────────────────────────

    List<DistributionLocationEntity> findByModerationStatusOrderByCreatedAtAsc(
            ModerationStatus status
    );

    // ─── Proximity ────────────────────────────────────────────

    @Query("""
        SELECT d FROM DistributionLocationEntity d
        WHERE (6371 * acos(
            cos(radians(:latitude)) * cos(radians(d.latitude))
            * cos(radians(d.longitude) - radians(:longitude))
            + sin(radians(:latitude)) * sin(radians(d.latitude))
        )) <= :radiusKm
        AND d.moderationStatus = 'APPROVED'
        """)
    List<DistributionLocationEntity> findNearby(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusKm") int radiusKm
    );

    @Query("""
        SELECT d FROM DistributionLocationEntity d
        WHERE d.vendorId = :vendorId
        AND (6371 * acos(
            cos(radians(:latitude)) * cos(radians(d.latitude))
            * cos(radians(d.longitude) - radians(:longitude))
            + sin(radians(:latitude)) * sin(radians(d.latitude))
        )) <= :radiusKm
        AND d.moderationStatus = 'APPROVED'
        """)
    List<DistributionLocationEntity> findNearbyByVendorId(
            @Param("vendorId") UUID vendorId,
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusKm") int radiusKm
    );
}