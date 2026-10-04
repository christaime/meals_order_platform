package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorState.VendorStatus;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.adapter.utils.SortConverter;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CategoryPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.CityPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.DistributionLocationPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.VendorSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class VendorRepositoryAdapter implements VendorRepository {

    private final VendorJpaRepository jpaRepository;
    private final VendorPersistenceMapper mapper;

    private final CategoryJpaRepository categoryJpaRepository;
    private final CategoryPersistenceMapper categoryMapper;

    private final DistributionLocationJpaRepository locationJpaRepository;
    private final DistributionLocationPersistenceMapper locationMapper;

    private final CityJpaRepository cityJpaRepository;
    private final CityPersistenceMapper cityMapper;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public Vendor save(Vendor vendor) {
        VendorEntity entity = mapper.toEntity(vendor);
        VendorEntity saved = jpaRepository.save(entity);
        return toFullDomain(saved);
    }

    @Override
    public Optional<Vendor> findById(UUID id) {
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
    public void delete(Vendor vendor) {
        jpaRepository.deleteById(vendor.getId());
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Override
    public Optional<Vendor> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(this::toFullDomain);
    }

    @Override
    public Optional<Vendor> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId).map(this::toFullDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpaRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByUserId(UUID userId) {
        return jpaRepository.existsByUserId(userId);
    }

    @Override
    public boolean existsByBusinessName(String businessName) {
        return jpaRepository.existsByBusinessNameIgnoreCase(businessName);
    }

    // ═══════════════════════════════════════════════════════════
    //  Status Queries
    // ═══════════════════════════════════════════════════════════

    @Override
    public boolean isVendorActive(UUID vendorId) {
        return jpaRepository.existsByIdAndStatus(vendorId, VendorStatus.ACTIVE);
    }

    @Override
    public boolean isVendorBanned(UUID vendorId) {
        return jpaRepository.existsByIdAndStatus(vendorId, VendorStatus.BANNED);
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Vendor> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<Vendor> search(VendorSearchRequest request) {
        Specification<VendorEntity> spec = VendorSpecification.build(request);
        var springSort = SortConverter.toSpringSort(request.validSortOrders());
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize(),
                springSort
        );
        Page<VendorEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Override
    public long countByStatus(VendorState.VendorStatus status) {
        return jpaRepository.countByStatus(status);
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public boolean existsByCategoryId(UUID categoryId) {
        return jpaRepository.existsByCategoryId(categoryId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Vendor toFullDomain(VendorEntity entity) {
        CityEntity cityEntity = loadCity(entity.getCityId());

        List<Category> categories = (entity.getCategoryIds() != null
                && !entity.getCategoryIds().isEmpty())
                ? categoryJpaRepository.findByIdIn(entity.getCategoryIds()).stream()
                .map(categoryMapper::toDomain)
                .toList()
                : List.of();

        // Minimal vendor view shared by every location. Breaks the
        // vendor → locations → vendor recursion.
        Vendor minimalVendor = mapper.toMinimalDomain(entity, cityEntity);

        List<DistributionLocation> locations = (entity.getDistributionLocationIds() != null
                && !entity.getDistributionLocationIds().isEmpty())
                ? loadLocationsShallow(entity.getDistributionLocationIds(), minimalVendor)
                : List.of();

        return Vendor.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .businessName(entity.getBusinessName())
                .ownerName(entity.getOwnerName())
                .description(entity.getDescription())
                .address(entity.getAddress())
                .city(cityMapper.toDomain(cityEntity))
                .email(entity.getEmail())
                .phone(entity.getPhone())
                .ratingAvg(entity.getRatingAvg())
                .totalRatings(entity.getTotalRatings())
                .state(mapper.buildState(entity))
                .deliveryRadius(entity.getDeliveryRadius())
                .pickupAddress(entity.getPickupAddress())
                .profileImageStorageRef(entity.getProfileImageStorageRef())
                .coverImageStorageRef(entity.getCoverImageStorageRef())
                .idCardFrontStorageRef(entity.getIdCardFrontStorageRef())
                .idCardBackStorageRef(entity.getIdCardBackStorageRef())
                .categories(categories)
                .distributionLocations(locations)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Load a vendor's locations without recursing back into the vendor.
     * Each location uses the already-assembled {@code minimalVendor}.
     */
    private List<DistributionLocation> loadLocationsShallow(
            List<UUID> locationIds,
            Vendor minimalVendor
    ) {
        List<DistributionLocationEntity> locationEntities =
                locationJpaRepository.findByIdIn(locationIds);

        Map<UUID, CityEntity> cityById = loadCities(
                locationEntities.stream()
                        .map(DistributionLocationEntity::getCityId)
                        .collect(Collectors.toSet())
        );

        return locationEntities.stream()
                .map(loc -> locationMapper.toDomain(
                        loc,
                        minimalVendor,
                        cityById.get(loc.getCityId())
                ))
                .toList();
    }

    private CityEntity loadCity(UUID cityId) {
        return cityJpaRepository.findById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + cityId));
    }

    private Map<UUID, CityEntity> loadCities(Set<UUID> cityIds) {
        if (cityIds == null || cityIds.isEmpty()) {
            return Map.of();
        }
        return cityJpaRepository.findAllById(cityIds).stream()
                .collect(Collectors.toMap(CityEntity::getId, Function.identity()));
    }

    private DataPage<Vendor> toDataPage(Page<VendorEntity> page) {
        List<Vendor> content = page.getContent().stream()
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