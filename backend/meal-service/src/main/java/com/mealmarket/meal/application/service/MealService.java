package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ForbiddenException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateMealRequest;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.MealSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateMealRequest;
import com.mealmarket.meal.application.mapper.MealDtoMapper;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.MealRepository;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.mealmarket.meal.domain.model.ModerationStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealService {

    private final MealRepository mealRepository;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository;
    private final DistributionLocationRepository locationRepository;
    private final ModerationDataRepository moderationDataRepository;
    private final MealDtoMapper dtoMapper;
    private final MediaService mediaService;

    // ═══════════════════════════════════════════════════════════
    //  Creation
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public MealResponse createMeal(CreateMealRequest request, Vendor vendor) {
        log.info("Creating meal '{}' for vendor: {}", request.name(), vendor.getId());

        // NOTE: Quota check will be added in Phase 2.
        // long currentMeals = mealRepository.countByVendorId(vendor.getId());
        // quotaService.checkMealQuota(vendor, currentMeals);

        // 1. Uniqueness per vendor
        if (mealRepository.existsByVendorIdAndName(vendor.getId(), request.name())) {
            throw new ConflictException(
                    "A meal named '" + request.name()
                            + "' already exists for this vendor"
            );
        }

        // 2. Resolve relationships
        List<Category> categories = resolveCategories(request.categoryIds());
        List<Ingredient> ingredients = resolveIngredients(request.ingredientIds());
        List<DistributionLocation> locations = resolveLocations(
                request.distributionLocationIds(), vendor.getId());

        // 3. Create domain object (always PENDING)
        Meal meal = Meal.create(
                vendor,
                request.name(),
                request.description(),
                request.price(),
                request.imageStorageRef(),
                request.prepTimeMinutes(),
                categories,
                ingredients,
                locations
        );

        Meal saved = mealRepository.save(meal);

        // 4. Mark the image as used (MinIO metadata: PENDING → USED)
        if (saved.getImageStorageRef() != null) {
            mediaService.markUsed(saved.getImageStorageRef());
        }

        // 5. Record initial moderation entry
        moderationDataRepository.save(
                ModerationData.created(
                        ModerationTargetType.MEAL,
                        saved.getId(),
                        com.mealmarket.meal.domain.model.UserType.VENDOR,
                        vendor.getId()
                )
        );

        log.info("Meal created with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public MealResponse getMealById(UUID mealId) {
        log.debug("Fetching meal: {}", mealId);
        Meal meal = findMealWithDetailsOrThrow(mealId);
        return dtoMapper.toResponse(meal);
    }

    @Transactional(readOnly = true)
    public MealResponse getApprovedMealById(UUID mealId) {
        log.debug("Fetching approved meal: {}", mealId);
        Meal meal = findMealWithDetailsOrThrow(mealId);

        if (!meal.isActive()) {
            throw new ResourceNotFoundException(
                    "Meal not found or not available: " + mealId);
        }

        return dtoMapper.toResponse(meal);
    }

    @Transactional(readOnly = true)
    public MealResponse getVendorMealById(UUID mealId, UUID vendorId) {
        log.debug("Fetching meal: {} for vendor: {}", mealId, vendorId);

        Meal meal = findMealWithDetailsOrThrow(mealId);

        if (!meal.belongsTo(vendorId)) {
            throw new ForbiddenException("This meal does not belong to you");
        }
        return dtoMapper.toResponse(meal);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<MealResponse> searchMeals(MealSearchRequest request) {
        log.debug("Searching meals with filters (loadFull={}, withCount={})",
                request.getLoadFull(), request.getWithCount());

        return mealRepository.search(request)
                .map(meal -> toSearchResponse(meal, request));
    }

    /**
     * Builds the search response for one meal.
     *
     * Operation order matters:
     *   1. Map domain → response (mapper produces the full shape)
     *   2. Count from the DOMAIN object (never from the response —
     *      the mapper may omit collections)
     *   3. Attach counts, if `withCount`
     *   4. Trim collections, if `!loadFull`
     *
     * Steps 2 and 4 both touch ingredients/locations, but the order
     * guarantees counting happens before trimming.
     */
    private MealResponse toSearchResponse(Meal meal, MealSearchRequest request) {
        MealResponse response = dtoMapper.toResponse(meal);

        // ── 2. Counts from the domain, before any trimming ──
        if (Boolean.TRUE.equals(request.getWithCount())) {
            int ingredientCount = meal.getIngredients().size();
            int allergenCount = (int) meal.getIngredients().stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsAllergen()))
                    .count();
            int locationCount = meal.getDistributionLocations().size();
            response = response.withCounts(ingredientCount, allergenCount, locationCount);
        }

        // ── 4. Trim collections last ──
        if (request.getLoadFull() == null || Boolean.FALSE.equals(request.getLoadFull())) {
            response = response.withthoutIngredientsAndLocations();
        }

        return response;
    }

    @Transactional(readOnly = true)
    public DataPage<MealResponse> searchMyMeals(
            MealSearchRequest request,
            UUID vendorId
    ) {

        log.debug("Searching meals for vendor: {} with filters (loadFull={}, withCount={})",
                vendorId, request.getLoadFull(), request.getWithCount());

        MealSearchRequest scopedRequest = MealSearchRequest.builder()
                .keyword(request.getKeyword())
                .vendorId(vendorId)
                .categoryIds(request.getCategoryIds())
                .cuisineIds(request.getCuisineIds())
                .dishTypeIds(request.getDishTypeIds())
                .ingredientIds(request.getIngredientIds())
                .excludeIngredientIds(request.getExcludeIngredientIds())
                .hasAllergens(request.getHasAllergens())
                .minPrice(request.getMinPrice())
                .maxPrice(request.getMaxPrice())
                .minRating(request.getMinRating())
                .maxRating(request.getMaxRating())
                .isAvailable(request.getIsAvailable())
                .distributionLocationId(request.getDistributionLocationId())
                .moderationStatus(request.getModerationStatus())
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return mealRepository.search(request)
                .map(meal -> toSearchResponse(meal, request));
    }

    @Transactional(readOnly = true)
    public DataPage<MealSummaryResponse> searchApprovedMeals(MealSearchRequest request) {
        log.debug("Searching approved meals");

        MealSearchRequest approvedRequest = MealSearchRequest.builder()
                .keyword(request.getKeyword())
                .vendorId(request.getVendorId())
                .businessName(request.getBusinessName())
                .categoryIds(request.getCategoryIds())
                .cuisineIds(request.getCuisineIds())
                .dishTypeIds(request.getDishTypeIds())
                .ingredientIds(request.getIngredientIds())
                .excludeIngredientIds(request.getExcludeIngredientIds())
                .hasAllergens(request.getHasAllergens())
                .minPrice(request.getMinPrice())
                .maxPrice(request.getMaxPrice())
                .minRating(request.getMinRating())
                .maxRating(request.getMaxRating())
                .isAvailable(true)
                .distributionLocationId(request.getDistributionLocationId())
                .moderationStatus(APPROVED)
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return mealRepository.search(approvedRequest).map(dtoMapper::toSummary);
    }

    @Transactional(readOnly = true)
    public List<MealSummaryResponse> getFeaturedMeals(int limit) {
        log.debug("Fetching featured meals (limit={})", limit);

        MealSearchRequest featuredRequest = MealSearchRequest.builder()
                .moderationStatus(APPROVED)
                .isAvailable(true)
                .sortBy("averageRating", com.mealmarket.common.pagination.Sort.Direction.DESC)
                .page(0, limit)
                .build();

        return mealRepository.search(featuredRequest)
                .getContent()
                .stream()
                .map(dtoMapper::toSummary)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Update
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public MealResponse updateMeal(
            UUID mealId,
            UpdateMealRequest request,
            UUID vendorId
    ) {
        log.info("Updating meal: {} by vendor: {}", mealId, vendorId);

        Meal existing = findMealWithDetailsOrThrow(mealId);

        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This meal does not belong to you");
        }

        if (request.name() != null
                && !request.name().equalsIgnoreCase(existing.getName())
                && mealRepository.existsByVendorIdAndName(vendorId, request.name())) {
            throw new ConflictException(
                    "A meal named '" + request.name()
                            + "' already exists for this vendor"
            );
        }

        // Compute the new image ref with the null/empty-string convention:
        //   null  → keep existing
        //   ""    → clear
        //   value → replace
        String previousRef = existing.getImageStorageRef();
        String newRef = resolveImageRef(request.imageStorageRef(), previousRef);

        // 2. Resolve relationships
        List<Category> categories = resolveCategories(request.categoryIds());
        List<Ingredient> ingredients = resolveIngredients(request.ingredientIds());
        List<DistributionLocation> locations = resolveLocations(request.distributionLocationIds(), vendorId);

        Meal updated = Meal.builder()
                .id(existing.getId())
                .vendor(existing.getVendor())
                .name(request.name() != null ? request.name() : existing.getName())
                .description(request.description() != null
                        ? request.description() : existing.getDescription())
                .price(request.price() != null ? request.price() : existing.getPrice())
                .imageStorageRef(newRef)
                .isAvailable(request.isAvailable() != null
                        ? request.isAvailable() : existing.getIsAvailable())
                .averageRating(existing.getAverageRating())
                .totalRatings(existing.getTotalRatings())
                .prepTimeMinutes(request.prepTimeMinutes() != null
                        ? request.prepTimeMinutes() : existing.getPrepTimeMinutes())
                .categories(categories)
                .ingredients(ingredients)
                .distributionLocations(locations)
                .moderationStatus(existing.getModerationStatus())
                .createdAt(existing.getCreatedAt())
                .updatedAt(java.time.Instant.now())
                .build();

        Meal saved = mealRepository.save(updated);

        // Sync MinIO metadata if the ref changed
        syncImageRef(previousRef, newRef);

        log.info("Meal updated: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    @Transactional
    public MealResponse toggleAvailability(
            UUID mealId,
            boolean isAvailable,
            UUID vendorId
    ) {
        log.info("Toggling availability of meal: {} to {}", mealId, isAvailable);

        Meal existing = findMealWithDetailsOrThrow(mealId);

        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This meal does not belong to you");
        }

        Meal updated = existing.withAvailability(isAvailable);
        return dtoMapper.toResponse(mealRepository.save(updated));
    }

    /**
     * Replace the meal image with a new storage ref.
     * The old ref is marked PENDING so the cleanup job can reap it.
     */
    @Transactional
    public MealResponse updateMealImage(
            UUID mealId,
            String imageStorageRef,
            UUID vendorId
    ) {
        log.info("Updating image for meal: {}", mealId);

        Meal existing = findMealWithDetailsOrThrow(mealId);

        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This meal does not belong to you");
        }

        String previousRef = existing.getImageStorageRef();
        Meal updated = existing.withImageRef(imageStorageRef);
        Meal saved = mealRepository.save(updated);

        syncImageRef(previousRef, imageStorageRef);

        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public void deleteMeal(UUID mealId, UUID vendorId) {
        log.info("Deleting meal: {} by vendor: {}", mealId, vendorId);

        Meal existing = findMealWithDetailsOrThrow(mealId);

        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This meal does not belong to you");
        }

        String imageRef = existing.getImageStorageRef();

        switch (existing.getModerationStatus()) {

            case PENDING, REJECTED -> {
                log.info("Meal {} is {} — performing hard delete",
                        mealId, existing.getModerationStatus());
                mealRepository.deleteById(mealId);

                // Release the image so the cleanup job can reap it
                if (imageRef != null) {
                    mediaService.markPending(imageRef);
                }
            }

            case APPROVED -> {
                log.info("Meal {} is APPROVED — disabling instead of deleting", mealId);

                Meal disabled = existing.withModerationStatus(ModerationStatus.DISABLED);
                mealRepository.save(disabled);

                moderationDataRepository.save(
                        ModerationData.disabled(
                                ModerationTargetType.MEAL,
                                mealId,
                                "Vendor requested deletion — meal was approved",
                                vendorId
                        )
                );
                // Image is KEPT — the meal still exists, just disabled.
            }

            case DISABLED -> throw new ConflictException(
                    "Meal is already disabled and cannot be deleted"
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countMyMeals(UUID vendorId) {
        return mealRepository.countByVendorId(vendorId);
    }

    @Transactional(readOnly = true)
    public long countMyAvailableMeals(UUID vendorId) {
        return mealRepository.countAvailableByVendorId(vendorId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Meal findMealWithDetailsOrThrow(UUID mealId) {
        return mealRepository.findByIdWithDetails(mealId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Meal not found: " + mealId));
    }

    /**
     * Resolve the desired image ref from an update request.
     * Convention:
     *   requested == null  → keep current
     *   requested == ""    → clear
     *   otherwise          → replace with requested
     */
    private String resolveImageRef(String requested, String current) {
        if (requested == null) return current;
        return requested.isBlank() ? null : requested;
    }

    /**
     * Sync MinIO metadata after a ref change:
     *   - old ref (if any) → PENDING (orphan candidate)
     *   - new ref (if any) → USED
     * No-op if the refs are equal.
     */
    private void syncImageRef(String previous, String next) {
        if (Objects.equals(previous, next)) return;
        if (previous != null && !previous.isBlank()) mediaService.markPending(previous);
        if (next != null && !next.isBlank()) mediaService.markUsed(next);
    }

    private List<Category> resolveCategories(List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return new ArrayList<>();
        }
        return categoryIds.stream()
                .map(id -> categoryRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Category not found: " + id)))
                .peek(c -> {
                    if (c.getModerationStatus() != APPROVED) {
                        throw new ConflictException(
                                "Category '" + c.getName() + "' is not approved"
                        );
                    }
                })
                .collect(Collectors.toList());
    }

    private List<Ingredient> resolveIngredients(List<UUID> ingredientIds) {
        if (ingredientIds == null || ingredientIds.isEmpty()) {
            return new ArrayList<>();
        }
        return ingredientIds.stream()
                .map(id -> ingredientRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Ingredient not found: " + id)))
               /* .peek(i -> {
                    if (i.getModerationStatus() != APPROVED) {
                        throw new ConflictException(
                                "Ingredient '" + i.getName() + "' is not approved"
                        );
                    }
                })*/
                .collect(Collectors.toList());
    }

    private List<DistributionLocation> resolveLocations(
            List<UUID> locationIds,
            UUID vendorId
    ) {
        if (locationIds == null || locationIds.isEmpty()) {
            return new ArrayList<>();
        }
        return locationIds.stream()
                .map(id -> locationRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Location not found: " + id)))
                .peek(l -> {
                    if (!l.belongsTo(vendorId)) {
                        throw new ForbiddenException(
                                "Location '" + l.getName() + "' does not belong to you"
                        );
                    }
                   /* if (l.getModerationStatus() != APPROVED) {
                        throw new ConflictException(
                                "Location '" + l.getName() + "' is not approved"
                        );
                    }*/
                })
                .collect(Collectors.toList());
    }
}