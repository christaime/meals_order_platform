package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorState.VendorStatus;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CategoryPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.DistributionLocationPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.VendorSpecification;
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
public class VendorRepositoryAdapter implements VendorRepository {

    private final VendorJpaRepository jpaRepository;
    private final VendorPersistenceMapper mapper;

    // ✅ Direct JPA access — no adapter-to-adapter dependency
    private final CategoryJpaRepository categoryJpaRepository;
    private final CategoryPersistenceMapper categoryMapper;

    private final DistributionLocationJpaRepository locationJpaRepository;
    private final DistributionLocationPersistenceMapper locationMapper;

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
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
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

    // ═══════════════════════════════════════════════════════════
    //  Category Reference (used by CategoryService delete rule)
    // ═══════════════════════════════════════════════════════════

    @Override
    public boolean existsByCategoryId(UUID categoryId) {
        return jpaRepository.existsByCategoryId(categoryId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Vendor toFullDomain(VendorEntity entity) {
        Vendor partial = mapper.toDomain(entity);

        // ✅ Query JPA repositories directly — no adapter dependency
        List<Category> categories = (entity.getCategoryIds() != null && !entity.getCategoryIds().isEmpty())
                ? categoryJpaRepository.findByIdIn(entity.getCategoryIds()).stream()
                .map(categoryMapper::toDomain)
                .collect(Collectors.toList())
                : List.of();

        List<DistributionLocation> locations = (entity.getDistributionLocationIds() != null
                && !entity.getDistributionLocationIds().isEmpty())
                ? locationJpaRepository.findByIdIn(entity.getDistributionLocationIds()).stream()
                .map(locationMapper::toDomain)
                .collect(Collectors.toList())
                : List.of();

        // ⚠️ Note: the location entities loaded here only carry a vendorId (String),
        // not a full Vendor object. Since the domain DistributionLocation requires
        // a full Vendor and we're ALREADY building that vendor, we inject the
        // current vendor into each location to complete the object.
        Vendor vendor = Vendor.builder()
                .id(partial.getId())
                .userId(partial.getUserId())
                .businessName(partial.getBusinessName())
                .description(partial.getDescription())
                .address(partial.getAddress())
                .email(partial.getEmail())
                .phone(partial.getPhone())
                .ratingAvg(partial.getRatingAvg())
                .totalRatings(partial.getTotalRatings())
                .state(partial.getState())
                .deliveryRadius(partial.getDeliveryRadius())
                .pickupAddress(partial.getPickupAddress())
                .profileImageUrl(partial.getProfileImageUrl())
                .coverImageUrl(partial.getCoverImageUrl())
                .categories(categories)
                .distributionLocations(List.of()) // avoid deep recursion — set below
                .createdAt(partial.getCreatedAt())
                .updatedAt(partial.getUpdatedAt())
                .build();

        // Now rebuild the locations with the vendor reference
        List<DistributionLocation> locationsWithVendor = locations.stream()
                .map(loc -> DistributionLocation.builder()
                        .id(loc.getId())
                        .vendor(vendor)
                        .name(loc.getName())
                        .address(loc.getAddress())
                        .phone(loc.getPhone())
                        .latitude(loc.getLatitude())
                        .longitude(loc.getLongitude())
                        .deliveryRadius(loc.getDeliveryRadius())
                        .moderationStatus(loc.getModerationStatus())
                        .createdAt(loc.getCreatedAt())
                        .updatedAt(loc.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        // Rebuild vendor with the fully-linked locations
        return Vendor.builder()
                .id(vendor.getId())
                .userId(vendor.getUserId())
                .businessName(vendor.getBusinessName())
                .description(vendor.getDescription())
                .address(vendor.getAddress())
                .email(vendor.getEmail())
                .phone(vendor.getPhone())
                .ratingAvg(vendor.getRatingAvg())
                .totalRatings(vendor.getTotalRatings())
                .state(vendor.getState())
                .deliveryRadius(vendor.getDeliveryRadius())
                .pickupAddress(vendor.getPickupAddress())
                .profileImageUrl(vendor.getProfileImageUrl())
                .coverImageUrl(vendor.getCoverImageUrl())
                .categories(categories)
                .distributionLocations(locationsWithVendor)
                .createdAt(vendor.getCreatedAt())
                .updatedAt(vendor.getUpdatedAt())
                .build();
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