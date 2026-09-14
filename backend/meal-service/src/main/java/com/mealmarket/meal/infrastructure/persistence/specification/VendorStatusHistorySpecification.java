package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.VendorStatusHistorySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorStatusHistoryEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class VendorStatusHistorySpecification {

    public static Specification<VendorStatusHistoryEntity> build(
            VendorStatusHistorySearchRequest request
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Vendor ID ────────────────────────────────────────
            if (request.getVendorId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("vendorId"), request.getVendorId()));
            }

            // ─── From status ──────────────────────────────────────
            if (request.getFromStatus() != null) {
                predicates.add(criteriaBuilder.equal(root.get("fromStatus"), request.getFromStatus()));
            }

            // ─── To status ────────────────────────────────────────
            if (request.getToStatus() != null) {
                predicates.add(criteriaBuilder.equal(root.get("toStatus"), request.getToStatus()));
            }

            // ─── Changed by (actor) ───────────────────────────────
            if (request.getChangedBy() != null ) {
                predicates.add(criteriaBuilder.equal(root.get("changedBy"), request.getChangedBy()));
            }

            // ─── Change type ──────────────────────────────────────
            if (request.getChangeType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("changeType"), request.getChangeType()));
            }

            // ─── Changed date range ───────────────────────────────
            if (request.getChangedFrom() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("changedAt"),
                        request.getChangedFrom()
                ));
            }

            if (request.getChangedTo() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("changedAt"),
                        request.getChangedTo()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}