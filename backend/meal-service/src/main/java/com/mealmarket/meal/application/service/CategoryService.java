package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CategoryResponse;
import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.CreateCategoryRequest;
import com.mealmarket.meal.application.dto.UpdateCategoryRequest;
import com.mealmarket.meal.application.mapper.CategoryDtoMapper;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ModerationDataRepository moderationDataRepository;
    private final CategoryDtoMapper dtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Creation
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public CategoryResponse createCategory(
            CreateCategoryRequest request,
            UserType createdByType,
            UUID createdById
    ) {
        log.info("Creating category '{}' of type {} by {}",
                request.name(), request.type(), createdByType);

        // 1. Business rule: uniqueness of (name, type)
        if (categoryRepository.existsByNameAndType(request.name(), request.type())) {
            throw new ConflictException(
                    "A category named '" + request.name()
                            + "' of type " + request.type() + " already exists"
            );
        }

        // 2. Create the domain object (always PENDING)
        Category category = Category.create(
                request.name(),
                request.description(),
                request.iconUrl(),
                request.type(),
                createdByType,
                createdById
        );

        Category saved = categoryRepository.save(category);

        // 3. Record initial moderation entry
        moderationDataRepository.save(
                ModerationData.created(
                        ModerationTargetType.CATEGORY,
                        saved.getId(),
                        createdByType,
                        createdById
                )
        );

        log.info("Category created with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(UUID categoryId) {
        log.debug("Fetching category: {}", categoryId);
        Category category = findCategoryOrThrow(categoryId);
        return dtoMapper.toResponse(category);
    }

    /**
     * Fetch a category only if it is APPROVED.
     * Used by public-facing endpoints and vendor registration.
     */
    @Transactional(readOnly = true)
    public CategoryResponse getApprovedCategoryById(UUID categoryId) {
        log.debug("Fetching approved category: {}", categoryId);
        Category category = findCategoryOrThrow(categoryId);

        if (category.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new ResourceNotFoundException(
                    "Category not found or not approved: " + categoryId
            );
        }

        return dtoMapper.toResponse(category);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<CategoryResponse> searchCategories(CategorySearchRequest request) {
        log.debug("Searching categories with filters");
        return categoryRepository.search(request).map(dtoMapper::toResponse);
    }

    /**
     * Search only approved categories.
     * Forces moderationStatus = APPROVED and returns summaries.
     */
    @Transactional(readOnly = true)
    public DataPage<CategorySummaryResponse> searchApprovedCategories(
            CategorySearchRequest request
    ) {
        log.debug("Searching approved categories");

        CategorySearchRequest approvedRequest = CategorySearchRequest.builder()
                .keyword(request.getKeyword())
                .name(request.getName())
                .type(request.getType())
                .moderationStatus(ModerationStatus.APPROVED)   // ← forced
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return categoryRepository.search(approvedRequest).map(dtoMapper::toSummary);
    }

    // ═══════════════════════════════════════════════════════════
    //  Update
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public CategoryResponse updateCategory(
            UUID categoryId,
            UpdateCategoryRequest request,
            UUID adminId
    ) {
        log.info("Updating category: {} by admin: {}", categoryId, adminId);

        Category existing = findCategoryOrThrow(categoryId);

        // Uniqueness re-check if name is being changed
        if (request.name() != null
                && !request.name().equalsIgnoreCase(existing.getName())
                && categoryRepository.existsByNameAndType(request.name(), existing.getType())) {
            throw new ConflictException(
                    "A category named '" + request.name()
                            + "' of type " + existing.getType() + " already exists"
            );
        }

        Category updated = existing.withUpdatedDetails(
                request.name(),
                request.description(),
                request.iconUrl()
        );

        Category saved = categoryRepository.save(updated);
        log.info("Category updated: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware logic)
    // ═══════════════════════════════════════════════════════════

    /**
     * Deletes a category following the moderation-aware rule:
     * - PENDING / REJECTED → hard delete
     * - APPROVED → transition to DISABLED + record moderation
     * - DISABLED → reject with ConflictException
     */
    @Transactional
    public void deleteCategory(UUID categoryId, UUID adminId) {
        log.info("Deleting category: {} by admin: {}", categoryId, adminId);

        Category existing = findCategoryOrThrow(categoryId);

        switch (existing.getModerationStatus()) {

            case PENDING, REJECTED -> {
                log.info("Category {} is {} — performing hard delete",
                        categoryId, existing.getModerationStatus());
                categoryRepository.deleteById(categoryId);
            }

            case APPROVED -> {
                log.info("Category {} is APPROVED — disabling instead of deleting",
                        categoryId);

                Category disabled = existing.withModerationStatus(ModerationStatus.DISABLED);
                categoryRepository.save(disabled);

                moderationDataRepository.save(
                        ModerationData.disabled(
                                ModerationTargetType.CATEGORY,
                                categoryId,
                                "Admin requested deletion — category was approved",
                                adminId
                        )
                );
            }

            case DISABLED -> throw new ConflictException(
                    "Category is already disabled and cannot be deleted"
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countByType(CategoryType type) {
        return categoryRepository.countByType(type);
    }

    @Transactional(readOnly = true)
    public long countAll() {
        return categoryRepository.count();
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Category findCategoryOrThrow(UUID categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found: " + categoryId));
    }
}