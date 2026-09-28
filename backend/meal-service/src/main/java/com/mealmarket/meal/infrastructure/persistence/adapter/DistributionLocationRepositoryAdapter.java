package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.DistributionLocationPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.DistributionLocationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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

    // ✅ Direct JPA access — no adapter-to-adapter dependency
    private final VendorJpaRepository vendorJpaRepository;
    private final VendorPersistenceMapper vendorMapper;

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

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness (per vendor)
    // ═══════════════════════════════════════════════════════════

    @Override
    public boolean existsByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.existsByVendorIdAndName(vendorId, name);
    }

    @Override
    public Optional<DistributionLocation> findByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.findByVendorIdAndName(vendorId, name).map(this::toFullDomain);
    }

    // ═══════════════════════════════════════════════════════════
    //  Vendor-Scoped Queries
    // ═══════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<DistributionLocation> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Proximity Queries
    // ═══════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<DistributionLocation> search(DistributionLocationSearchRequest request) {
        if (request.getVendorId() == null) {
            throw new IllegalArgumentException(
                    "vendorId is required when searching distribution locations"
            );
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

    // ═══════════════════════════════════════════════════════════
    //  Moderation Queue (admin-wide)
    // ═══════════════════════════════════════════════════════════

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
        VendorEntity vendorEntity = vendorJpaRepository.findById(entity.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + entity.getVendorId()));
        return mapper.toDomain(entity,vendorEntity);

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