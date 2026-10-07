package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.LocationProximity;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.DistributionLocationPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.DistributionLocationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DistributionLocationRepositoryAdapter implements DistributionLocationRepository {

    private final DistributionLocationJpaRepository jpaRepository;
    private final DistributionLocationPersistenceMapper mapper;

    private final VendorJpaRepository vendorJpaRepository;
    private final VendorPersistenceMapper vendorMapper;

    private final CityJpaRepository cityJpaRepository;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public DistributionLocation save(DistributionLocation location) {
        DistributionLocationEntity entity = mapper.toEntity(location);
        DistributionLocationEntity saved = jpaRepository.save(entity);
        return toFullDomain(saved);
    }

    @Override
    public Optional<DistributionLocation> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toFullDomain);
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public void delete(DistributionLocation location) {
        jpaRepository.deleteById(location.getId());
    }

    @Override
    public boolean existsByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.existsByVendorIdAndName(vendorId, name);
    }

    @Override
    public Optional<DistributionLocation> findByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.findByVendorIdAndName(vendorId, name).map(this::toFullDomain);
    }

    @Override
    public List<DistributionLocation> findByVendorId(UUID vendorId) {
        return jpaRepository.findByVendorId(vendorId).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByVendorId(UUID vendorId) {
        return jpaRepository.countByVendorId(vendorId);
    }

    @Override
    public List<DistributionLocation> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<DistributionLocation> findNearbyByVendorId(
            UUID vendorId,
            double latitude,
            double longitude,
            int radiusKm
    ) {
        return jpaRepository.findNearbyByVendorId(vendorId, latitude, longitude, radiusKm)
                .stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    @Override
    public DataPage<DistributionLocation> search(DistributionLocationSearchRequest request) {
        LocationProximity proximity = request.getLocationProximity();

        if (proximity != null && proximity.isValid()) {
            return searchWithProximity(request, proximity);
        }

        Specification<DistributionLocationEntity> spec =
                DistributionLocationSpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<DistributionLocationEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    private DataPage<DistributionLocation> searchWithProximity(
            DistributionLocationSearchRequest request,
            LocationProximity proximity) {

        double lat = proximity.getLatitude();
        double lng = proximity.getLongitude();
        int radiusKm = proximity.getRadiusKm();

        double latDelta = radiusKm / 111.0;
        double lngDelta = radiusKm / (111.0 * Math.cos(Math.toRadians(lat)));

        String keyword = request.getKeyword() == null || request.getKeyword().isBlank()
                ? null
                : "%" + request.getKeyword().toLowerCase().trim() + "%";

        // Normalize empty list → null so the SQL guard disables the filter.
        UUID[] cityIds = request.getCityIds() == null || request.getCityIds().isEmpty()
                ? null
                : request.getCityIds().toArray(UUID[]::new);

        Pageable pageable = PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );

        Page<DistributionLocationEntity> page = jpaRepository.searchWithinRadius(
                request.getModerationStatus() != null
                        ? request.getModerationStatus().name()
                        : null,
                request.getVendorId(),
                cityIds,
                keyword,
                lat,
                lng,
                radiusKm,
                lat - latDelta,
                lat + latDelta,
                lng - lngDelta,
                lng + lngDelta,
                pageable
        );

        return toDataPage(page);
    }

    @Override
    public List<DistributionLocation> findByModerationStatus(ModerationStatus status) {
        return jpaRepository.findByModerationStatusOrderByCreatedAtAsc(status).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DistributionLocation toFullDomain(DistributionLocationEntity entity) {
        Vendor vendor = loadMinimalVendor(entity.getVendorId());

        CityEntity cityEntity = cityJpaRepository.findById(entity.getCityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + entity.getCityId()));

        return mapper.toDomain(entity, vendor, cityEntity);
    }

    /**
     * Minimal domain Vendor (no locations, no categories) to break the
     * location → vendor → locations recursion.
     */
    private Vendor loadMinimalVendor(UUID vendorId) {
        VendorEntity vendorEntity = vendorJpaRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + vendorId));

        CityEntity vendorCity = cityJpaRepository.findById(vendorEntity.getCityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found for vendor: " + vendorEntity.getCityId()));

        return vendorMapper.toMinimalDomain(vendorEntity, vendorCity);
    }

    private DataPage<DistributionLocation> toDataPage(Page<DistributionLocationEntity> page) {
        List<DistributionLocation> content = page.getContent().stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
        return new DataPage<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }
}