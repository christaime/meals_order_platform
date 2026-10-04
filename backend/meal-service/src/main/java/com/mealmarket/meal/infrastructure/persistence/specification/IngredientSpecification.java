package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.IngredientEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class IngredientSpecification {

    public static Specification<IngredientEntity> build(IngredientSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Keyword (name LIKE) ──────────────────────────────
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        keyword
                ));
            }

            // ─── Exact name ───────────────────────────────────────
            if (request.getName() != null && !request.getName().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("name")),
                        request.getName().toLowerCase()
                ));
            }

            // ─── isAllergen ───────────────────────────────────────
            if (request.getIsAllergen() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("isAllergen"),
                        request.getIsAllergen()
                ));
            }

            // ─── Ownership + moderation visibility ─────────────────────
            //
            // Two ways an ingredient is visible to the caller:
            //   1. It was created by them AND is PENDING (they can see their own
            //      pending submissions).
            //   2. It is APPROVED (visible to everyone).
            //
            // When createdById is set, the OR applies. When it isn't, only
            // the moderation filter applies as a standalone predicate.
            if (request.getCreatedById() != null) {
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("createdById"),
                                        request.getCreatedById()),
                                criteriaBuilder.equal(root.get("moderationStatus"),
                                        ModerationStatus.PENDING)
                        ),
                        criteriaBuilder.equal(root.get("moderationStatus"),
                                ModerationStatus.APPROVED)
                ));
            } else if (request.getModerationStatus() != null) {
                // No owner scoping — respect whatever moderation filter was requested.
                predicates.add(criteriaBuilder.equal(
                        root.get("moderationStatus"),
                        request.getModerationStatus()
                ));
            }else if (request.getCreatedByType() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("createdByType"),
                        request.getCreatedByType()
                ));
            }

            // ─── Created by ID ────────────────────────────────────
            if (request.getCreatedById() != null ) {
                predicates.add(criteriaBuilder.equal(
                        root.get("createdById"),
                        request.getCreatedById()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}