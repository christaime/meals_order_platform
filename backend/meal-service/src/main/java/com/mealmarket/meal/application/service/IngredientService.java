package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateIngredientRequest;
import com.mealmarket.meal.application.dto.IngredientResponse;
import com.mealmarket.meal.application.dto.IngredientSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateIngredientRequest;
import com.mealmarket.meal.application.mapper.IngredientDtoMapper;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.mealmarket.meal.domain.model.ModerationStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final ModerationDataRepository moderationDataRepository;
    private final IngredientDtoMapper dtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Creation
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public IngredientResponse createIngredient(
            CreateIngredientRequest request,
            UserType createdByType,
            UUID createdById
    ) {
        log.info("Creating ingredient '{}' by {}", request.name(), createdByType);

        // 1. Uniqueness (case-insensitive via DB)
        if (ingredientRepository.existsByName(request.name())) {
            throw new ConflictException(
                    "An ingredient named '" + request.name() + "' already exists"
            );
        }

        // 2. Create domain object (always PENDING)
        Ingredient ingredient = Ingredient.create(
                request.name(),
                request.isAllergen(),
                createdByType,
                createdById
        );

        Ingredient saved = ingredientRepository.save(ingredient);

        // 3. Record initial moderation entry
        moderationDataRepository.save(
                ModerationData.created(
                        ModerationTargetType.INGREDIENT,
                        saved.getId(),
                        createdByType,
                        createdById
                )
        );

        log.info("Ingredient created with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public IngredientResponse getIngredientById(UUID ingredientId) {
        log.debug("Fetching ingredient: {}", ingredientId);
        Ingredient ingredient = findIngredientOrThrow(ingredientId);
        return dtoMapper.toResponse(ingredient);
    }

    /**
     * Fetch an ingredient only if it is APPROVED.
     * Used by public-facing endpoints and meal detail views.
     */
    @Transactional(readOnly = true)
    public IngredientResponse getApprovedIngredientById(UUID ingredientId) {
        log.debug("Fetching approved ingredient: {}", ingredientId);
        Ingredient ingredient = findIngredientOrThrow(ingredientId);

        if (ingredient.getModerationStatus() != APPROVED) {
            throw new ResourceNotFoundException(
                    "Ingredient not found or not approved: " + ingredientId
            );
        }

        return dtoMapper.toResponse(ingredient);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<IngredientResponse> searchIngredients(IngredientSearchRequest request) {
        log.debug("Searching ingredients with filters");
        return ingredientRepository.search(request).map(dtoMapper::toResponse);
    }

    /**
     * Search only approved ingredients.
     * Forces moderationStatus = APPROVED and returns summaries.
     * Used by meal creation forms and public meal detail views.
     */
    @Transactional(readOnly = true)
    public DataPage<IngredientSummaryResponse> searchApprovedIngredients(
            IngredientSearchRequest request
    ) {
        log.debug("Searching approved ingredients");

        IngredientSearchRequest approvedRequest = IngredientSearchRequest.builder()
                .keyword(request.getKeyword())
                .name(request.getName())
                .isAllergen(request.getIsAllergen())
                .moderationStatus(APPROVED)   // ← forced
                .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                .build();

        return ingredientRepository.search(approvedRequest).map(dtoMapper::toSummary);
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup (used by MealService for relationship assembly)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<IngredientResponse> getIngredientsByIds(List<UUID> ingredientIds) {
        if (ingredientIds == null || ingredientIds.isEmpty()) {
            return List.of();
        }
        return ingredientRepository.findAllById(ingredientIds).stream()
                .map(dtoMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Update
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public IngredientResponse updateIngredient(
            UUID ingredientId,
            UpdateIngredientRequest request,
            UUID adminId
    ) {
        log.info("Updating ingredient: {} by admin: {}", ingredientId, adminId);

        Ingredient existing = findIngredientOrThrow(ingredientId);

        // Uniqueness re-check if name is being changed
        if (request.name() != null
                && !request.name().equalsIgnoreCase(existing.getName())
                && ingredientRepository.existsByName(request.name())) {
            throw new ConflictException(
                    "An ingredient named '" + request.name() + "' already exists"
            );
        }

        Ingredient updated = existing.withUpdatedDetails(
                request.name(),
                request.isAllergen()
        );

        Ingredient saved = ingredientRepository.save(updated);
        log.info("Ingredient updated: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware logic)
    // ═══════════════════════════════════════════════════════════

    /**
     * Deletes an ingredient following the moderation-aware rule:
     * - PENDING / REJECTED → hard delete
     * - APPROVED → transition to DISABLED + record moderation
     * - DISABLED → reject with ConflictException
     */
    @Transactional
    public void deleteIngredient(UUID ingredientId, UUID adminId) {
        log.info("Deleting ingredient: {} by admin: {}", ingredientId, adminId);

        Ingredient existing = findIngredientOrThrow(ingredientId);

        switch (existing.getModerationStatus()) {

            case PENDING, REJECTED -> {
                log.info("Ingredient {} is {} — performing hard delete",
                        ingredientId, existing.getModerationStatus());
                ingredientRepository.deleteById(ingredientId);
            }

            case APPROVED -> {
                log.info("Ingredient {} is APPROVED — disabling instead of deleting",
                        ingredientId);

                Ingredient disabled = existing.withModerationStatus(ModerationStatus.DISABLED);
                ingredientRepository.save(disabled);

                moderationDataRepository.save(
                        ModerationData.disabled(
                                ModerationTargetType.INGREDIENT,
                                ingredientId,
                                "Admin requested deletion — ingredient was approved",
                                adminId
                        )
                );
            }

            case DISABLED -> throw new ConflictException(
                    "Ingredient is already disabled and cannot be deleted"
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countAll() {
        return ingredientRepository.count();
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private Ingredient findIngredientOrThrow(UUID ingredientId) {
        return ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ingredient not found: " + ingredientId));
    }
}