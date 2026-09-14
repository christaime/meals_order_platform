package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DistributionLocationSpecification {

    public static Specification<DistributionLocationEntity> build(
            DistributionLocationSearchRequest request
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Vendor ID (required scope) ──────────────────────
            if (request.getVendorId() == null ) {
                throw new IllegalArgumentException(
                        "vendorId is required when searching distribution locations"
                );
            }
            predicates.add(criteriaBuilder.equal(
                    root.get("vendorId"),
                    request.getVendorId()
            ));

            // ─── Keyword (name OR address) ────────────────────────
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keyword),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("address")), keyword)
                ));
            }

            // ─── Exact name ───────────────────────────────────────
            if (request.getName() != null && !request.getName().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("name")),
                        request.getName().toLowerCase()
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