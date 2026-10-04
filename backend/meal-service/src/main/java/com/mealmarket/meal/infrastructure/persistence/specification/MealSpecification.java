package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MealSpecification {

    private final AllergenIngredientProvider allergenProvider;

    public Specification<MealEntity> build(MealSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Keyword (name OR description) ────────────────────
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase().trim() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keyword),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), keyword)
                ));
            }

            // ─── Vendor ID ────────────────────────────────────────
            if (request.getVendorId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("vendorId"), request.getVendorId()));
            }

            // ─── Category IDs (ANY of these) ──────────────────────
            if (request.getCategoryIds() != null && !request.getCategoryIds().isEmpty()) {
                Predicate[] anyOfCategories = request.getCategoryIds().stream()
                        .map(id -> criteriaBuilder.isMember(id, root.get("categoryIds")))
                        .toArray(Predicate[]::new);
                predicates.add(criteriaBuilder.or(anyOfCategories));
            }

            // ─── Any ingredient (OR) ──────────────────────────────
            //
            // "sauce d'arachide ou tomate" → at least one must be present.
            if (request.getAnyIngredientIds() != null
                    && !request.getAnyIngredientIds().isEmpty()) {
                Predicate[] anyOf = request.getAnyIngredientIds().stream()
                        .map(id -> criteriaBuilder.isMember(id, root.get("ingredientIds")))
                        .toArray(Predicate[]::new);
                predicates.add(criteriaBuilder.or(anyOf));
            }

            // ─── All ingredients (AND) ────────────────────────────
            //
            // "Koki plantain" → every one must be present.
            if (request.getAllIngredientIds() != null
                    && !request.getAllIngredientIds().isEmpty()) {
                for (UUID id : request.getAllIngredientIds()) {
                    predicates.add(criteriaBuilder.isMember(id, root.get("ingredientIds")));
                }
            }

            // ─── Excluded ingredients (must not contain any) ──────
            if (request.getExcludeIngredientIds() != null
                    && !request.getExcludeIngredientIds().isEmpty()) {
                for (UUID excludeId : request.getExcludeIngredientIds()) {
                    predicates.add(criteriaBuilder.isNotMember(
                            excludeId, root.get("ingredientIds")));
                }
            }

            // ─── Allergen flag ────────────────────────────────────
            if (request.getHasAllergens() != null) {
                Set<UUID> allergenIds = allergenProvider.allergenIngredientIds();

                if (allergenIds.isEmpty()) {
                    if (Boolean.TRUE.equals(request.getHasAllergens())) {
                        predicates.add(criteriaBuilder.disjunction());
                    }
                    // hasAllergens=false → no constraint, all rows pass.
                } else if (Boolean.TRUE.equals(request.getHasAllergens())) {
                    Predicate[] anyAllergen = allergenIds.stream()
                            .map(id -> criteriaBuilder.isMember(id, root.get("ingredientIds")))
                            .toArray(Predicate[]::new);
                    predicates.add(criteriaBuilder.or(anyAllergen));
                } else {
                    for (UUID id : allergenIds) {
                        predicates.add(criteriaBuilder.isNotMember(
                                id, root.get("ingredientIds")));
                    }
                }
            }

            // ─── Distribution locations (ANY of these) ────────────
            if (request.getDistributionLocationIds() != null
                    && !request.getDistributionLocationIds().isEmpty()) {
                Predicate[] anyOfLocations = request.getDistributionLocationIds().stream()
                        .map(id -> criteriaBuilder.isMember(id, root.get("distributionLocationIds")))
                        .toArray(Predicate[]::new);
                predicates.add(criteriaBuilder.or(anyOfLocations));
            }

            // ─── Price range ──────────────────────────────────────
            if (request.getMinPrice() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("price"), request.getMinPrice()));
            }
            if (request.getMaxPrice() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("price"), request.getMaxPrice()));
            }

            // ─── Rating range ─────────────────────────────────────
            if (request.getMinRating() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("averageRating"), request.getMinRating()));
            }
            if (request.getMaxRating() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("averageRating"), request.getMaxRating()));
            }

            // ─── Availability ─────────────────────────────────────
            if (request.getIsAvailable() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("isAvailable"), request.getIsAvailable()));
            }

            // ─── Moderation status ────────────────────────────────
            if (request.getModerationStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("moderationStatus"), request.getModerationStatus()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}