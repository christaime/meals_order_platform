package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query(value = """
    SELECT dl.*
    FROM distribution_locations dl
    WHERE dl.moderation_status = :moderationStatus
      AND (CAST(:vendorId AS uuid) IS NULL OR dl.vendor_id = CAST(:vendorId AS uuid))
      AND (CAST(:cityIds AS uuid[]) IS NULL OR dl.city_id = ANY(CAST(:cityIds AS uuid[])))
      AND (CAST(:keyword AS text) IS NULL OR (
             LOWER(dl.name)    LIKE CAST(:keyword AS text)
          OR LOWER(dl.address) LIKE CAST(:keyword AS text)
      ))
      AND dl.latitude IS NOT NULL
      AND dl.longitude IS NOT NULL
      AND dl.latitude  BETWEEN :minLat AND :maxLat
      AND dl.longitude BETWEEN :minLng AND :maxLng
      AND (
          6371.0 * 2 * asin(sqrt(
                power(sin(radians(dl.latitude - :lat) / 2), 2)
              + cos(radians(:lat)) * cos(radians(dl.latitude))
                * power(sin(radians(dl.longitude - :lng) / 2), 2)
          ))
      ) <= :radiusKm
    ORDER BY dl.created_at DESC
    """,
            countQuery = """
    SELECT COUNT(*)
    FROM distribution_locations dl
    WHERE dl.moderation_status = :moderationStatus
      AND (CAST(:vendorId AS uuid) IS NULL OR dl.vendor_id = CAST(:vendorId AS uuid))
      AND (CAST(:cityIds AS uuid[]) IS NULL OR dl.city_id = ANY(CAST(:cityIds AS uuid[])))
      AND (CAST(:keyword AS text) IS NULL OR (
             LOWER(dl.name)    LIKE CAST(:keyword AS text)
          OR LOWER(dl.address) LIKE CAST(:keyword AS text)
      ))
      AND dl.latitude IS NOT NULL
      AND dl.longitude IS NOT NULL
      AND dl.latitude  BETWEEN :minLat AND :maxLat
      AND dl.longitude BETWEEN :minLng AND :maxLng
      AND (
          6371.0 * 2 * asin(sqrt(
                power(sin(radians(dl.latitude - :lat) / 2), 2)
              + cos(radians(:lat)) * cos(radians(dl.latitude))
                * power(sin(radians(dl.longitude - :lng) / 2), 2)
          ))
      ) <= :radiusKm
    """,
            nativeQuery = true)
    Page<DistributionLocationEntity> searchWithinRadius(
            @Param("moderationStatus") String moderationStatus,
            @Param("vendorId") UUID vendorId,
            @Param("cityIds") UUID[] cityIds,
            @Param("keyword") String keyword,
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusKm") int radiusKm,
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng,
            Pageable pageable);
}