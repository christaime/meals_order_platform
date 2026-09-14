package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class VendorSpecification {

    public static Specification<VendorEntity> build(VendorSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request == null) {
                return criteriaBuilder.conjunction();
            }

            // ─── Keyword (businessName OR description) ────────────
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("businessName")), keyword),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), keyword)
                ));
            }

            // ─── Business name (exact, case-insensitive) ─────────
            if (request.getBusinessName() != null && !request.getBusinessName().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("businessName")),
                        request.getBusinessName().toLowerCase()
                ));
            }

            // ─── Email ────────────────────────────────────────────
            if (request.getEmail() != null && !request.getEmail().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("email")),
                        request.getEmail().toLowerCase()
                ));
            }

            // ─── Phone ────────────────────────────────────────────
            if (request.getPhone() != null && !request.getPhone().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("phone"), request.getPhone()));
            }

            // ─── Status ───────────────────────────────────────────
            if (request.getStatus() != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), request.getStatus()));
            }

            // ─── Rating range ─────────────────────────────────────
            if (request.getMinRating() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("ratingAvg"),
                        BigDecimal.valueOf(request.getMinRating())
                ));
            }
            if (request.getMaxRating() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("ratingAvg"),
                        BigDecimal.valueOf(request.getMaxRating())
                ));
            }

            // ─── Categories (CUISINE) ─────────────────────────────
            if (request.getCategoryIds() != null && !request.getCategoryIds().isEmpty()) {
                for (UUID categoryId : request.getCategoryIds()) {
                    predicates.add(criteriaBuilder.isMember(categoryId, root.get("categoryIds")));
                }
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}