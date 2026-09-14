package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class MealSpecification {

    public static Specification<MealEntity> build(MealSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Keyword (name OR description) ────────────────────
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keyword),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), keyword)
                ));
            }

            // ─── Vendor ID ────────────────────────────────────────
            if (request.getVendorId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("vendorId"), request.getVendorId()));
            }

            // ─── Category IDs (any type) ──────────────────────────
            if (request.getCategoryIds() != null && !request.getCategoryIds().isEmpty()) {
                for (UUID categoryId : request.getCategoryIds()) {
                    predicates.add(criteriaBuilder.isMember(categoryId, root.get("categoryIds")));
                }
            }

            // ─── Ingredient IDs (contains) ────────────────────────
            if (request.getIngredientIds() != null && !request.getIngredientIds().isEmpty()) {
                for (UUID ingredientId : request.getIngredientIds()) {
                    predicates.add(criteriaBuilder.isMember(ingredientId, root.get("ingredientIds")));
                }
            }

            // ─── Exclude Ingredient IDs (allergens) ───────────────
            if (request.getExcludeIngredientIds() != null
                    && !request.getExcludeIngredientIds().isEmpty()) {
                for (UUID excludeId : request.getExcludeIngredientIds()) {
                    predicates.add(criteriaBuilder.isNotMember(excludeId, root.get("ingredientIds")));
                }
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

            // ─── Distribution Location ────────────────────────────
            if (request.getDistributionLocationId() != null) {
                predicates.add(criteriaBuilder.isMember(
                        request.getDistributionLocationId(),
                        root.get("distributionLocationIds")
                ));
            }

            // ─── Moderation status ────────────────────────────────
            if (request.getModerationStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("moderationStatus"),
                        request.getModerationStatus()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}