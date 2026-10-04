package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ForbiddenException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.constant.UUIDConstant;
import com.mealmarket.meal.application.dto.CreateVendorRequest;
import com.mealmarket.meal.application.dto.UpdateVendorRequest;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorSummaryResponse;
import com.mealmarket.meal.application.exception.VendorAlreadyRegisteredException;
import com.mealmarket.meal.application.mapper.CategoryDtoMapper;                // NEW
import com.mealmarket.meal.application.mapper.LocationDtoMapper;                // NEW
import com.mealmarket.meal.application.mapper.VendorDtoMapper;
import com.mealmarket.meal.application.port.IamPort;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.City;                                   // NEW
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.CityRepository;                     // NEW
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.VendorStatusHistoryRepository;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.mealmarket.meal.domain.model.VendorState.VendorStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorService {

    private final VendorRepository vendorRepository;
    private final VendorStatusHistoryRepository historyRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;                                // NEW
    private final VendorDtoMapper dtoMapper;
    private final CategoryDtoMapper categoryDtoMapper;                          // NEW
    private final LocationDtoMapper locationDtoMapper;                          // NEW
    private final IamPort iamPort;
    private final MediaService mediaService;

    // ═══════════════════════════════════════════════════════════
    //  Registration
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public VendorResponse registerVendor(
            CreateVendorRequest request,
            String email,
            UUID keycloakUserId
    ) {
        log.info("Registering new vendor with email: {}", email);

        if (vendorRepository.existsByUserId(keycloakUserId)) {
            throw new VendorAlreadyRegisteredException(keycloakUserId);
        }

        if (vendorRepository.existsByEmail(email)) {
            throw new ConflictException(
                    "A vendor with this email already exists: " + email
            );
        }

        if (vendorRepository.existsByBusinessName(request.businessName())) {
            throw new ConflictException(
                    "A vendor with this business name already exists: "
                            + request.businessName()
            );
        }

        List<Category> cuisines = resolveCuisines(request.cuisineCategoryIds());

        // Resolve city                                                         // NEW
        City city = cityRepository.findById(request.cityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + request.cityId()));

        iamPort.assignRealmRole(keycloakUserId.toString(), "VENDOR");

        Vendor vendor = Vendor.builder()
                .userId(keycloakUserId)
                .businessName(request.businessName())
                .ownerName(request.ownerName())
                .description(request.description())
                .address(request.address())
                .city(city)                                                     // NEW
                .email(email)
                .phone(request.phone())
                .ratingAvg(BigDecimal.ZERO)
                .totalRatings(0)
                .state(VendorState.active(keycloakUserId))
                .deliveryRadius(request.deliveryRadius() != null ? request.deliveryRadius() : 10)
                .pickupAddress(request.pickupAddress())
                .profileImageStorageRef(request.profileImageStorageRef())
                .coverImageStorageRef(request.coverImageStorageRef())
                .idCardFrontStorageRef(request.idCardFrontStorageRef())
                .idCardBackStorageRef(request.idCardBackStorageRef())
                .categories(cuisines)
                .distributionLocations(new ArrayList<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Vendor saved = vendorRepository.save(vendor);

        markUsed(
                saved.getProfileImageStorageRef(),
                saved.getCoverImageStorageRef(),
                saved.getIdCardFrontStorageRef(),
                saved.getIdCardBackStorageRef()
        );

        historyRepository.save(
                VendorStateChange.builder()
                        .vendorId(saved.getId())
                        .fromStatus(null)
                        .toStatus(VendorStatus.PENDING)
                        .reason("Vendor registered")
                        .changedBy(UUIDConstant.ALL_ZERO)
                        .changeType(VendorState.StateChangeType.SYSTEM)
                        .changedAt(Instant.now())
                        .build()
        );

        log.info("Vendor registered with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);     // FIXED
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public VendorResponse getVendorById(UUID vendorId) {
        log.debug("Fetching vendor: {}", vendorId);
        Vendor vendor = findVendorOrThrow(vendorId);
        return dtoMapper.toResponse(vendor, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional(readOnly = true)
    public VendorResponse getOwnProfile(UUID userId) {
        log.debug("Fetching profile for user: {}", userId);
        Vendor vendor = vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found for user: " + userId));
        return dtoMapper.toResponse(vendor, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional(readOnly = true)
    public VendorResponse getApprovedVendorById(UUID vendorId) {
        log.debug("Fetching approved vendor: {}", vendorId);
        Vendor vendor = findVendorOrThrow(vendorId);

        if (vendor.getStatus() != VendorState.VendorStatus.ACTIVE) {
            throw new ResourceNotFoundException(
                    "Vendor not found or not active: " + vendorId);
        }

        return dtoMapper.toResponse(vendor, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<VendorResponse> searchVendors(VendorSearchRequest request) {
        log.debug("Searching vendors with filters");
        return vendorRepository.search(request)
                .map(v -> dtoMapper.toResponse(v, categoryDtoMapper, locationDtoMapper));   // FIXED
    }

    @Transactional(readOnly = true)
    public DataPage<VendorSummaryResponse> searchApprovedVendors(
            VendorSearchRequest request
    ) {
        log.debug("Searching approved vendors");

        VendorSearchRequest approvedRequest = VendorSearchRequest.builder()
                .keyword(request.getKeyword())
                .businessName(request.getBusinessName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .cityId(request.getCityId())
                .status(VendorStatus.ACTIVE)
                .minRating(request.getMinRating())
                .maxRating(request.getMaxRating())
                .categoryIds(request.getCategoryIds())
                .sort(request.getSort())
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return vendorRepository.search(approvedRequest)
                .map(v -> dtoMapper.toSummary(v, categoryDtoMapper));
    }

    // ═══════════════════════════════════════════════════════════
    //  Update
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public VendorResponse updateVendor(
            UUID vendorId,
            UpdateVendorRequest request,
            UUID userId
    ) {
        log.info("Updating vendor: {} by user: {}", vendorId, userId);

        Vendor existing = findVendorOrThrow(vendorId);

        if (!existing.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only update your own profile");
        }

        if (request.businessName() != null
                && !request.businessName().equalsIgnoreCase(existing.getBusinessName())
                && vendorRepository.existsByBusinessName(request.businessName())) {
            throw new ConflictException(
                    "A vendor with this business name already exists: "
                            + request.businessName()
            );
        }

        if (request.email() != null
                && !request.email().equalsIgnoreCase(existing.getEmail())
                && vendorRepository.existsByEmail(request.email())) {
            throw new ConflictException(
                    "A vendor with this email already exists: " + request.email()
            );
        }

        List<Category> cuisines = request.cuisineCategoryIds() != null
                ? resolveCuisines(request.cuisineCategoryIds())
                : existing.getCategories();

        // Resolve city only when provided (null = unchanged)                   // NEW
        City newCity = request.cityId() != null
                ? cityRepository.findById(request.cityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + request.cityId()))
                : existing.getCity();

        // Resolve each image ref (null = keep, "" = clear, value = replace)
        String prevProfile = existing.getProfileImageStorageRef();
        String prevCover   = existing.getCoverImageStorageRef();
        String prevCniF    = existing.getIdCardFrontStorageRef();
        String prevCniB    = existing.getIdCardBackStorageRef();

        String newProfile = resolveRef(request.profileImageStorageRef(), prevProfile);
        String newCover   = resolveRef(request.coverImageStorageRef(),   prevCover);
        String newCniF    = resolveRef(request.idCardFrontStorageRef(),  prevCniF);
        String newCniB    = resolveRef(request.idCardBackStorageRef(),   prevCniB);

        Vendor updated = Vendor.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .businessName(request.businessName() != null
                        ? request.businessName() : existing.getBusinessName())
                .description(request.description() != null
                        ? request.description() : existing.getDescription())
                .address(request.address() != null
                        ? request.address() : existing.getAddress())
                .city(newCity)                                                   // NEW
                .email(request.email() != null
                        ? request.email() : existing.getEmail())
                .phone(request.phone() != null
                        ? request.phone() : existing.getPhone())
                .ratingAvg(existing.getRatingAvg())
                .totalRatings(existing.getTotalRatings())
                .state(existing.getState())
                .deliveryRadius(request.deliveryRadius() != null
                        ? request.deliveryRadius() : existing.getDeliveryRadius())
                .pickupAddress(request.pickupAddress() != null
                        ? request.pickupAddress() : existing.getPickupAddress())
                .profileImageStorageRef(newProfile)
                .coverImageStorageRef(newCover)
                .idCardFrontStorageRef(newCniF)
                .idCardBackStorageRef(newCniB)
                .categories(cuisines)
                .distributionLocations(existing.getDistributionLocations())
                .createdAt(existing.getCreatedAt())
                .updatedAt(Instant.now())
                .build();

        Vendor saved = vendorRepository.save(updated);

        syncRef(prevProfile, newProfile);
        syncRef(prevCover,   newCover);
        syncRef(prevCniF,    newCniF);
        syncRef(prevCniB,    newCniB);

        log.info("Vendor updated: {}", saved.getId());
        return dtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional
    public VendorResponse updateProfileImage(
            UUID vendorId,
            String imageStorageRef,
            UUID userId
    ) {
        log.info("Updating profile image for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        String previous = existing.getProfileImageStorageRef();

        Vendor updated = baseCopy(existing)
                .profileImageStorageRef(imageStorageRef)
                .build();

        Vendor saved = vendorRepository.save(updated);
        syncRef(previous, imageStorageRef);
        return dtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional
    public VendorResponse updateCoverImage(
            UUID vendorId,
            String imageStorageRef,
            UUID userId
    ) {
        log.info("Updating cover image for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        String previous = existing.getCoverImageStorageRef();

        Vendor updated = baseCopy(existing)
                .coverImageStorageRef(imageStorageRef)
                .build();

        Vendor saved = vendorRepository.save(updated);
        syncRef(previous, imageStorageRef);
        return dtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional
    public VendorResponse updateCniImages(
            UUID vendorId,
            String frontStorageRef,
            String backStorageRef,
            UUID userId
    ) {
        log.info("Updating CNI images for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        String prevFront = existing.getIdCardFrontStorageRef();
        String prevBack  = existing.getIdCardBackStorageRef();

        Vendor updated = baseCopy(existing)
                .idCardFrontStorageRef(frontStorageRef)
                .idCardBackStorageRef(backStorageRef)
                .build();

        Vendor saved = vendorRepository.save(updated);
        syncRef(prevFront, frontStorageRef);
        syncRef(prevBack,  backStorageRef);
        return dtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);    // FIXED
    }

    @Transactional
    public VendorResponse updateCuisines(
            UUID vendorId,
            List<UUID> categoryIds,
            UUID userId
    ) {
        log.info("Updating cuisines for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        List<Category> cuisines = resolveCuisines(categoryIds);

        Vendor updated = baseCopy(existing)
                .categories(cuisines)
                .build();

        return dtoMapper.toResponse(
                vendorRepository.save(updated),
                categoryDtoMapper,
                locationDtoMapper
        );                                                                           // FIXED
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware — using VendorState)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public void deleteVendor(UUID vendorId, UUID adminId) {
        log.info("Deleting vendor: {} by admin: {}", vendorId, adminId);

        Vendor existing = findVendorOrThrow(vendorId);
        VendorState.VendorStatus status = existing.getStatus();

        if (status == VendorState.VendorStatus.ACTIVE
                || status == VendorState.VendorStatus.SUSPENDED
                || status == VendorState.VendorStatus.BANNED) {
            throw new ConflictException(
                    "Vendor cannot be deleted in status " + status
                            + ". Deactivate it first."
            );
        }

        releaseAllImages(existing);

        vendorRepository.deleteById(vendorId);
        log.info("Vendor deleted: {}", vendorId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countByStatus(VendorState.VendorStatus status) {
        return vendorRepository.countByStatus(status);
    }

    @Transactional(readOnly = true)
    public long countAll() {
        return vendorRepository.count();
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Vendor findVendorOrThrow(UUID vendorId) {
        return vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + vendorId));
    }

    private void verifyOwnership(Vendor vendor, UUID userId) {
        if (!vendor.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only modify your own profile");
        }
    }

    private String resolveRef(String requested, String current) {
        if (requested == null) return current;
        return requested.isBlank() ? null : requested;
    }

    private void syncRef(String previous, String next) {
        if (Objects.equals(previous, next)) return;
        if (previous != null && !previous.isBlank()) mediaService.markPending(previous);
        if (next != null && !next.isBlank()) mediaService.markUsed(next);
    }

    private void markUsed(String... refs) {
        for (String r : refs) {
            if (r != null && !r.isBlank()) mediaService.markUsed(r);
        }
    }

    private void releaseAllImages(Vendor vendor) {
        markPending(
                vendor.getProfileImageStorageRef(),
                vendor.getCoverImageStorageRef(),
                vendor.getIdCardFrontStorageRef(),
                vendor.getIdCardBackStorageRef()
        );
    }

    private void markPending(String... refs) {
        for (String r : refs) {
            if (r != null && !r.isBlank()) mediaService.markPending(r);
        }
    }

    private List<Category> resolveCuisines(List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return new ArrayList<>();
        }

        return categoryIds.stream()
                .map(this::findCategoryOrThrow)
                .peek(c -> {
                    if (c.getType() != CategoryType.CUISINE) {
                        throw new ConflictException(
                                "Category '" + c.getName() + "' is not a cuisine"
                        );
                    }
                    if (c.getModerationStatus() != ModerationStatus.APPROVED) {
                        throw new ConflictException(
                                "Category '" + c.getName() + "' is not approved"
                        );
                    }
                })
                .collect(Collectors.toList());
    }

    private Category findCategoryOrThrow(UUID categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found: " + categoryId));
    }

    /**
     * Base builder for all partial-update paths (image-only, cuisine-only, …).
     * MUST carry every required field — including {@code city} — or
     * {@code DomainValidation.validate(...)} will throw on the missing
     * {@code @NotNull} constraint.                                            // NEW
     */
    private Vendor.Builder baseCopy(Vendor existing) {
        return Vendor.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .businessName(existing.getBusinessName())
                .ownerName(existing.getOwnerName())
                .description(existing.getDescription())
                .address(existing.getAddress())
                .city(existing.getCity())
                .email(existing.getEmail())
                .phone(existing.getPhone())
                .ratingAvg(existing.getRatingAvg())
                .totalRatings(existing.getTotalRatings())
                .state(existing.getState())
                .deliveryRadius(existing.getDeliveryRadius())
                .pickupAddress(existing.getPickupAddress())
                .profileImageStorageRef(existing.getProfileImageStorageRef())
                .coverImageStorageRef(existing.getCoverImageStorageRef())
                .idCardFrontStorageRef(existing.getIdCardFrontStorageRef())
                .idCardBackStorageRef(existing.getIdCardBackStorageRef())
                .categories(existing.getCategories())
                .distributionLocations(existing.getDistributionLocations())
                .createdAt(existing.getCreatedAt())
                .updatedAt(Instant.now());
    }

    public Vendor getOwnProfileEntity(UUID userId) {
        return vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found for user: " + userId));
    }
}