package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.CategoryEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CategorySpecification {

    public static Specification<CategoryEntity> build(CategorySearchRequest request) {
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

            // ─── Exact name ───────────────────────────────────────
            if (request.getName() != null && !request.getName().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("name")),
                        request.getName().toLowerCase()
                ));
            }

            // ─── Type (CUISINE / DISH_TYPE) ───────────────────────
            if (request.getType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), request.getType()));
            }

            // ─── Moderation status ────────────────────────────────
            if (request.getModerationStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("moderationStatus"),
                        request.getModerationStatus()
                ));
            }

            // ─── Created by type (ADMIN / VENDOR) ─────────────────
            if (request.getCreatedByType() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("createdByType"),
                        request.getCreatedByType()
                ));
            }

            // ─── Created by ID ────────────────────────────────────
            if (request.getCreatedById() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("createdById"),
                        request.getCreatedById()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}