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
import com.mealmarket.meal.application.mapper.VendorDtoMapper;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.domain.repository.CategoryRepository;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorService {

    private final VendorRepository vendorRepository;
    private final VendorStatusHistoryRepository historyRepository;
    private final CategoryRepository categoryRepository;
    private final VendorDtoMapper dtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Registration
    // ═══════════════════════════════════════════════════════════

    /**
     * Register a new vendor.
     * The {@code keycloakUserId} is provided by the caller (controller/facade),
     * which has already created the user in Keycloak.
     */
    @Transactional
    public VendorResponse registerVendor(
            CreateVendorRequest request,
            UUID keycloakUserId
    ) {
        log.info("Registering new vendor with email: {}", request.email());

        // 1. Email uniqueness
        if (vendorRepository.existsByEmail(request.email())) {
            throw new ConflictException(
                    "A vendor with this email already exists: " + request.email()
            );
        }

        // 2. Business name uniqueness
        if (vendorRepository.existsByBusinessName(request.businessName())) {
            throw new ConflictException(
                    "A vendor with this business name already exists: "
                            + request.businessName()
            );
        }

        // 3. Resolve initial cuisines
        List<Category> cuisines = resolveCuisines(request.cuisineCategoryIds());

        // 4. Create the domain object (always PENDING)
        Vendor vendor = Vendor.builder()
                .userId(keycloakUserId)
                .businessName(request.businessName())
                .description(request.description())
                .address(request.address())
                .email(request.email())
                .phone(request.phone())
                .ratingAvg(BigDecimal.ZERO)
                .totalRatings(0)
                .state(VendorState.pending())
                .deliveryRadius(request.deliveryRadius() != null ? request.deliveryRadius() : 10)
                .pickupAddress(request.pickupAddress())
                .categories(cuisines)
                .distributionLocations(new ArrayList<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Vendor saved = vendorRepository.save(vendor);

        // 5. Record initial state change in history
        historyRepository.save(
                VendorStateChange.builder()
                        .vendorId(saved.getId())
                        .fromStatus(null)
                        .toStatus(VendorState.VendorStatus.PENDING)
                        .reason("Vendor registered")
                        .changedBy(UUIDConstant.ALL_ZERO)
                        .changeType(VendorState.StateChangeType.SYSTEM)
                        .changedAt(Instant.now())
                        .build()
        );

        log.info("Vendor registered with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public VendorResponse getVendorById(UUID vendorId) {
        log.debug("Fetching vendor: {}", vendorId);
        Vendor vendor = findVendorOrThrow(vendorId);
        return dtoMapper.toResponse(vendor);
    }

    /**
     * Fetch the profile of the currently authenticated vendor (by Keycloak userId).
     */
    @Transactional(readOnly = true)
    public VendorResponse getOwnProfile(UUID userId) {
        log.debug("Fetching profile for user: {}", userId);
        Vendor vendor = vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found for user: " + userId));
        return dtoMapper.toResponse(vendor);
    }

    /**
     * Fetch a vendor only if it is ACTIVE (approved for public display).
     */
    @Transactional(readOnly = true)
    public VendorResponse getApprovedVendorById(UUID vendorId) {
        log.debug("Fetching approved vendor: {}", vendorId);
        Vendor vendor = findVendorOrThrow(vendorId);

        if (vendor.getStatus() != VendorState.VendorStatus.ACTIVE) {
            throw new ResourceNotFoundException(
                    "Vendor not found or not active: " + vendorId);
        }

        return dtoMapper.toResponse(vendor);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<VendorResponse> searchVendors(VendorSearchRequest request) {
        log.debug("Searching vendors with filters");
        return vendorRepository.search(request).map(dtoMapper::toResponse);
    }

    /**
     * Search only ACTIVE vendors — used for public-facing endpoints.
     */
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
                .status(VendorStatus.ACTIVE)                    // ← forced
                .minRating(request.getMinRating())
                .maxRating(request.getMaxRating())
                .categoryIds(request.getCategoryIds())
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return vendorRepository.search(approvedRequest).map(dtoMapper::toSummary);
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

        // Ownership check
        if (!existing.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only update your own profile");
        }

        // Uniqueness re-check if business name is being changed
        if (request.businessName() != null
                && !request.businessName().equalsIgnoreCase(existing.getBusinessName())
                && vendorRepository.existsByBusinessName(request.businessName())) {
            throw new ConflictException(
                    "A vendor with this business name already exists: "
                            + request.businessName()
            );
        }

        // Uniqueness re-check if email is being changed
        if (request.email() != null
                && !request.email().equalsIgnoreCase(existing.getEmail())
                && vendorRepository.existsByEmail(request.email())) {
            throw new ConflictException(
                    "A vendor with this email already exists: " + request.email()
            );
        }

        // Resolve cuisines if provided
        List<Category> cuisines = request.cuisineCategoryIds() != null
                ? resolveCuisines(request.cuisineCategoryIds())
                : existing.getCategories();

        Vendor updated = Vendor.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .businessName(request.businessName() != null
                        ? request.businessName() : existing.getBusinessName())
                .description(request.description() != null
                        ? request.description() : existing.getDescription())
                .address(request.address() != null
                        ? request.address() : existing.getAddress())
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
                .profileImageUrl(existing.getProfileImageUrl())
                .coverImageUrl(existing.getCoverImageUrl())
                .categories(cuisines)
                .distributionLocations(existing.getDistributionLocations())
                .createdAt(existing.getCreatedAt())
                .updatedAt(Instant.now())
                .build();

        Vendor saved = vendorRepository.save(updated);
        log.info("Vendor updated: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    @Transactional
    public VendorResponse uploadProfileImage(
            UUID vendorId,
            String imageUrl,
            UUID userId
    ) {
        log.info("Uploading profile image for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        Vendor updated = baseCopy(existing)
                .profileImageUrl(imageUrl)
                .build();

        return dtoMapper.toResponse(vendorRepository.save(updated));
    }

    @Transactional
    public VendorResponse uploadCoverImage(
            UUID vendorId,
            String imageUrl,
            UUID userId
    ) {
        log.info("Uploading cover image for vendor: {}", vendorId);

        Vendor existing = findVendorOrThrow(vendorId);
        verifyOwnership(existing, userId);

        Vendor updated = baseCopy(existing)
                .coverImageUrl(imageUrl)
                .build();

        return dtoMapper.toResponse(vendorRepository.save(updated));
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

        return dtoMapper.toResponse(vendorRepository.save(updated));
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware — using VendorState)
    // ═══════════════════════════════════════════════════════════

    /**
     * Hard delete a vendor. Only allowed when the vendor has never been
     * published to customers:
     * - PENDING → hard delete
     * - INACTIVE → hard delete
     * - ACTIVE / SUSPENDED / BANNED → refuse (must be deactivated first)
     */
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

        // PENDING or INACTIVE → hard delete
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

    /**
     * Resolves a list of category IDs into {@link Category} objects.
     * Ensures each category is of type CUISINE and APPROVED.
     */
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

    private Vendor.Builder baseCopy(Vendor existing) {
        return Vendor.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .businessName(existing.getBusinessName())
                .description(existing.getDescription())
                .address(existing.getAddress())
                .email(existing.getEmail())
                .phone(existing.getPhone())
                .ratingAvg(existing.getRatingAvg())
                .totalRatings(existing.getTotalRatings())
                .state(existing.getState())
                .deliveryRadius(existing.getDeliveryRadius())
                .pickupAddress(existing.getPickupAddress())
                .profileImageUrl(existing.getProfileImageUrl())
                .coverImageUrl(existing.getCoverImageUrl())
                .categories(existing.getCategories())
                .distributionLocations(existing.getDistributionLocations())
                .createdAt(existing.getCreatedAt())
                .updatedAt(Instant.now());
    }

    /**
     * Fetch the vendor entity for the currently authenticated user.
     * Used internally by other services (not exposed via API).
     */
    public Vendor getOwnProfileEntity(UUID userId) {
        return vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found for user: " + userId));
    }
}