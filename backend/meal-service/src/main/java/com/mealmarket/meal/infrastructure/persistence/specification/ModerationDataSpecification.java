package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.ModerationDataSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.ModerationDataEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ModerationDataSpecification {

    public static Specification<ModerationDataEntity> build(ModerationDataSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Target type ──────────────────────────────────────
            if (request.getTargetType() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("targetType"),
                        request.getTargetType()
                ));
            }

            // ─── Target ID ────────────────────────────────────────
            if (request.getTargetId() != null ) {
                predicates.add(criteriaBuilder.equal(root.get("targetId"), request.getTargetId()));
            }

            // ─── From status ──────────────────────────────────────
            if (request.getFromStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("fromStatus"),
                        request.getFromStatus()
                ));
            }

            // ─── To status ────────────────────────────────────────
            if (request.getToStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("toStatus"),
                        request.getToStatus()
                ));
            }

            // ─── Performed by type ────────────────────────────────
            if (request.getPerformedByType() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("performedByType"),
                        request.getPerformedByType()
                ));
            }

            // ─── Performed by ID ──────────────────────────────────
            if (request.getPerformedById() != null ) {
                predicates.add(criteriaBuilder.equal(
                        root.get("performedById"),
                        request.getPerformedById()
                ));
            }

            // ─── Performed date range ─────────────────────────────
            if (request.getPerformedFrom() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("performedAt"),
                        request.getPerformedFrom()
                ));
            }

            if (request.getPerformedTo() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("performedAt"),
                        request.getPerformedTo()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}