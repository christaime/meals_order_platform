package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.application.dto.CategoryResponse;
import com.mealmarket.meal.application.dto.IngredientResponse;
import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.application.dto.MealResponse;
import com.mealmarket.meal.application.dto.ModerationDataResponse;
import com.mealmarket.meal.application.dto.ModerationOutcome;
import com.mealmarket.meal.application.dto.ModerationQueueItemResponse;
import com.mealmarket.meal.application.dto.ModerationRequest;
import com.mealmarket.meal.application.dto.ModerationSummaryResponse;
import com.mealmarket.meal.application.mapper.CategoryDtoMapper;
import com.mealmarket.meal.application.mapper.IngredientDtoMapper;
import com.mealmarket.meal.application.mapper.LocationDtoMapper;
import com.mealmarket.meal.application.mapper.MealDtoMapper;
import com.mealmarket.meal.application.mapper.ModerationDataDtoMapper;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.MealRepository;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.ModerationDataSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationService {

    private final ModerationDataRepository moderationDataRepository;

    private final MealRepository mealRepository;
    private final IngredientRepository ingredientRepository;
    private final DistributionLocationRepository locationRepository;
    private final CategoryRepository categoryRepository;

    private final MealDtoMapper mealDtoMapper;
    private final IngredientDtoMapper ingredientDtoMapper;
    private final LocationDtoMapper locationDtoMapper;
    private final CategoryDtoMapper categoryDtoMapper;
    private final ModerationDataDtoMapper moderationDataDtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Unified Moderation Entry Point
    // ═══════════════════════════════════════════════════════════

    /**
     * Generic moderation entry point.
     * Resolves the target, applies the transition, records history,
     * and returns a lightweight outcome.
     */
    @Transactional
    public ModerationOutcome moderate(
            ModerationTargetType targetType,
            UUID targetId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        log.info("Moderating {} {} — decision: {} by {}",
                targetType, targetId, request.decision(), performedByType);

        return switch (targetType) {
            case MEAL -> moderateMealInternal(targetId, request, performedByType, performedById);
            case INGREDIENT -> moderateIngredientInternal(targetId, request, performedByType, performedById);
            case DISTRIBUTION_LOCATION -> moderateLocationInternal(targetId, request, performedByType, performedById);
            case CATEGORY -> moderateCategoryInternal(targetId, request, performedByType, performedById);
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  Per-Target Convenience Methods (return full response)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public MealResponse moderateMeal(
            UUID mealId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        moderateMealInternal(mealId, request, performedByType, performedById);
        Meal updated = mealRepository.findByIdWithDetails(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + mealId));
        return mealDtoMapper.toResponse(updated);
    }

    @Transactional
    public IngredientResponse moderateIngredient(
            UUID ingredientId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        moderateIngredientInternal(ingredientId, request, performedByType, performedById);
        Ingredient updated = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient not found: " + ingredientId));
        return ingredientDtoMapper.toResponse(updated);
    }

    @Transactional
    public LocationResponse moderateLocation(
            UUID locationId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        moderateLocationInternal(locationId, request, performedByType, performedById);
        DistributionLocation updated = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationId));
        return locationDtoMapper.toResponse(updated);
    }

    @Transactional
    public CategoryResponse moderateCategory(
            UUID categoryId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        moderateCategoryInternal(categoryId, request, performedByType, performedById);
        Category updated = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
        return categoryDtoMapper.toResponse(updated);
    }

    // ═══════════════════════════════════════════════════════════
    //  Queue (Pending Items)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<ModerationQueueItemResponse> getPendingQueue(
            ModerationTargetType targetType,
            PageRequest pageRequest
    ) {
        log.debug("Fetching pending queue for {}", targetType);

        return switch (targetType) {
            case MEAL -> buildQueueFromMeals(pageRequest);
            case INGREDIENT -> buildQueueFromIngredients(pageRequest);
            case DISTRIBUTION_LOCATION -> buildQueueFromLocations(pageRequest);
            case CATEGORY -> buildQueueFromCategories(pageRequest);
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  History
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<ModerationDataResponse> getHistory(
            ModerationTargetType targetType,
            UUID targetId
    ) {
        log.debug("Fetching moderation history for {} {}", targetType, targetId);
        return moderationDataRepository.findByTarget(targetType, targetId).stream()
                .map(moderationDataDtoMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DataPage<ModerationDataResponse> getHistoryPaginated(
            ModerationTargetType targetType,
            UUID targetId,
            PageRequest pageRequest
    ) {
        log.debug("Fetching paginated history for {} {}", targetType, targetId);
        return moderationDataRepository
                .findByTarget(targetType, targetId, pageRequest)
                .map(moderationDataDtoMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ModerationDataResponse getLatestAction(
            ModerationTargetType targetType,
            UUID targetId
    ) {
        return moderationDataRepository.findLatestByTarget(targetType, targetId)
                .map(moderationDataDtoMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No moderation history found for " + targetType + " " + targetId));
    }

    @Transactional(readOnly = true)
    public DataPage<ModerationDataResponse> searchModerationData(
            ModerationDataSearchRequest request
    ) {
        log.debug("Searching moderation data with filters");
        return moderationDataRepository.search(request).map(moderationDataDtoMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<ModerationSummaryResponse> getRecentActivity(int limit) {
        log.debug("Fetching recent moderation activity (limit={})", limit);

        ModerationDataSearchRequest request = ModerationDataSearchRequest.builder()
                .page(0, limit)
                .build();

        return moderationDataRepository.search(request)
                .getContent()
                .stream()
                .map(moderationDataDtoMapper::toSummary)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countByTargetAndStatus(
            ModerationTargetType targetType,
            ModerationStatus status
    ) {
        return moderationDataRepository.countByTargetTypeAndToStatus(targetType, status);
    }

    @Transactional(readOnly = true)
    public long countPending(ModerationTargetType targetType) {
        DataPage<ModerationQueueItemResponse> firstPage = getPendingQueue(
                targetType,
                PageRequest.of(0, 1)
        );
        return firstPage.getTotalElements();
    }

    // ═══════════════════════════════════════════════════════════
    //  Private — Internal Moderation (per target)
    // ═══════════════════════════════════════════════════════════

    private ModerationOutcome moderateMealInternal(
            UUID mealId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + mealId));

        ModerationStatus from = meal.getModerationStatus();
        ModerationStatus to = mapDecision(request.decision(), from);

        Meal updated = meal.withModerationStatus(to);
        mealRepository.save(updated);

        return recordAndReturn(
                ModerationTargetType.MEAL, mealId, from, to,
                request.reason(), performedByType, performedById
        );
    }

    private ModerationOutcome moderateIngredientInternal(
            UUID ingredientId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ingredient not found: " + ingredientId));

        ModerationStatus from = ingredient.getModerationStatus();
        ModerationStatus to = mapDecision(request.decision(), from);

        Ingredient updated = ingredient.withModerationStatus(to);
        ingredientRepository.save(updated);

        return recordAndReturn(
                ModerationTargetType.INGREDIENT, ingredientId, from, to,
                request.reason(), performedByType, performedById
        );
    }

    private ModerationOutcome moderateLocationInternal(
            UUID locationId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        DistributionLocation location = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Location not found: " + locationId));

        ModerationStatus from = location.getModerationStatus();
        ModerationStatus to = mapDecision(request.decision(), from);

        DistributionLocation updated = location.withModerationStatus(to);
        locationRepository.save(updated);

        return recordAndReturn(
                ModerationTargetType.DISTRIBUTION_LOCATION, locationId, from, to,
                request.reason(), performedByType, performedById
        );
    }

    private ModerationOutcome moderateCategoryInternal(
            UUID categoryId,
            ModerationRequest request,
            UserType performedByType,
            UUID performedById
    ) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found: " + categoryId));

        ModerationStatus from = category.getModerationStatus();
        ModerationStatus to = mapDecision(request.decision(), from);

        Category updated = category.withModerationStatus(to);
        categoryRepository.save(updated);

        return recordAndReturn(
                ModerationTargetType.CATEGORY, categoryId, from, to,
                request.reason(), performedByType, performedById
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Private — Decision Mapping
    // ═══════════════════════════════════════════════════════════

    /**
     * Maps a moderation decision + current status to the target status.
     * Throws ConflictException on invalid transitions.
     */
    private ModerationStatus mapDecision(
            ModerationRequest.ModerationDecision decision,
            ModerationStatus currentStatus
    ) {
        return switch (decision) {
            case APPROVE -> {
                requireStatus(currentStatus, ModerationStatus.PENDING, "APPROVE");
                yield ModerationStatus.APPROVED;
            }
            case REJECT -> {
                requireStatus(currentStatus, ModerationStatus.PENDING, "REJECT");
                yield ModerationStatus.REJECTED;
            }
            case DISABLE -> {
                requireStatus(currentStatus, ModerationStatus.APPROVED, "DISABLE");
                yield ModerationStatus.DISABLED;
            }
            case REACTIVATE -> {
                requireStatus(currentStatus, ModerationStatus.DISABLED, "REACTIVATE");
                yield ModerationStatus.APPROVED;
            }
            case REVOKE -> {
                requireStatus(currentStatus, ModerationStatus.APPROVED, "REVOKE");
                yield ModerationStatus.PENDING;
            }
        };
    }

    private void requireStatus(
            ModerationStatus current,
            ModerationStatus expected,
            String decisionName
    ) {
        if (current != expected) {
            throw new ConflictException(
                    String.format("Cannot %s — current status is %s, expected %s",
                            decisionName, current, expected)
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Private — Record History
    // ═══════════════════════════════════════════════════════════

    private ModerationOutcome recordAndReturn(
            ModerationTargetType targetType,
            UUID targetId,
            ModerationStatus from,
            ModerationStatus to,
            String reason,
            UserType performedByType,
            UUID performedById
    ) {
        Instant now = Instant.now();

        ModerationData data = ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(from)
                .toStatus(to)
                .reason(reason)
                .performedByType(performedByType)
                .performedById(performedById)
                .performedAt(now)
                .build();

        moderationDataRepository.save(data);

        log.info("Moderation recorded: {} {} — {} → {}",
                targetType, targetId, from, to);

        return new ModerationOutcome(
                targetType, targetId, from, to, performedByType, performedById, now
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Private — Queue Builders
    // ═══════════════════════════════════════════════════════════

    private DataPage<ModerationQueueItemResponse> buildQueueFromMeals(PageRequest page) {
        MealSearchRequest request = MealSearchRequest.builder()
                .moderationStatus(ModerationStatus.PENDING)
                .page(page.getPage(), page.getSize())
                .build();

        DataPage<Meal> meals = mealRepository.search(request);

        List<ModerationQueueItemResponse> items = meals.getContent().stream()
                .map(m -> new ModerationQueueItemResponse(
                        ModerationTargetType.MEAL,
                        m.getId(),
                        m.getName(),
                        m.getModerationStatus(),
                        UserType.VENDOR,
                        m.getVendor().getId(),
                        m.getCreatedAt(),
                        m.getUpdatedAt()
                ))
                .collect(Collectors.toList());

        return new DataPage<>(
                items, meals.getPage(), meals.getSize(), meals.getTotalElements()
        );
    }

    private DataPage<ModerationQueueItemResponse> buildQueueFromIngredients(PageRequest page) {
        IngredientSearchRequest request = IngredientSearchRequest.builder()
                .moderationStatus(ModerationStatus.PENDING)
                .page(page.getPage(), page.getSize())
                .build();

        DataPage<Ingredient> ingredients = ingredientRepository.search(request);

        List<ModerationQueueItemResponse> items = ingredients.getContent().stream()
                .map(i -> new ModerationQueueItemResponse(
                        ModerationTargetType.INGREDIENT,
                        i.getId(),
                        i.getName(),
                        i.getModerationStatus(),
                        i.getCreatedByType(),
                        i.getCreatedById(),
                        i.getCreatedAt(),
                        i.getUpdatedAt()
                ))
                .collect(Collectors.toList());

        return new DataPage<>(
                items, ingredients.getPage(), ingredients.getSize(), ingredients.getTotalElements()
        );
    }

    private DataPage<ModerationQueueItemResponse> buildQueueFromLocations(PageRequest page) {
        List<DistributionLocation> allPending = locationRepository
                .findByModerationStatus(ModerationStatus.PENDING);

        // Manual pagination (since the repository method returns a list)
        int totalElements = allPending.size();
        int fromIndex = page.getOffset();
        int toIndex = Math.min(fromIndex + page.getSize(), totalElements);

        List<DistributionLocation> pageContent = (fromIndex >= totalElements)
                ? List.of()
                : allPending.subList(fromIndex, toIndex);

        List<ModerationQueueItemResponse> items = pageContent.stream()
                .map(l -> new ModerationQueueItemResponse(
                        ModerationTargetType.DISTRIBUTION_LOCATION,
                        l.getId(),
                        l.getName(),
                        l.getModerationStatus(),
                        UserType.VENDOR,
                        l.getVendor().getId(),
                        l.getCreatedAt(),
                        l.getUpdatedAt()
                ))
                .collect(Collectors.toList());

        return new DataPage<>(items, page.getPage(), page.getSize(), totalElements);
    }

    private DataPage<ModerationQueueItemResponse> buildQueueFromCategories(PageRequest page) {
        CategorySearchRequest request = CategorySearchRequest.builder()
                .moderationStatus(ModerationStatus.PENDING)
                .page(page.getPage(), page.getSize())
                .build();

        DataPage<Category> categories = categoryRepository.search(request);

        List<ModerationQueueItemResponse> items = categories.getContent().stream()
                .map(c -> new ModerationQueueItemResponse(
                        ModerationTargetType.CATEGORY,
                        c.getId(),
                        c.getName(),
                        c.getModerationStatus(),
                        c.getCreatedByType(),
                        c.getCreatedById(),
                        c.getCreatedAt(),
                        c.getUpdatedAt()
                ))
                .collect(Collectors.toList());

        return new DataPage<>(
                items, categories.getPage(), categories.getSize(), categories.getTotalElements()
        );
    }
}