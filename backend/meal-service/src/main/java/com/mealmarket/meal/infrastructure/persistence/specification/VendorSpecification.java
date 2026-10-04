package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
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

            // ─── City (vendor's registered city OR any approved location's city) ──
            if (request.getCityId() != null) {
                UUID cityId = request.getCityId();

                // Subquery: vendors that have at least one APPROVED distribution
                // location in the requested city.
                Subquery<UUID> locationVendorIds = query.subquery(UUID.class);
                Root<DistributionLocationEntity> locRoot =
                        locationVendorIds.from(DistributionLocationEntity.class);
                locationVendorIds.select(locRoot.get("vendorId"))
                        .where(criteriaBuilder.and(
                                criteriaBuilder.equal(locRoot.get("cityId"), cityId),
                                criteriaBuilder.equal(locRoot.get("moderationStatus"),
                                        ModerationStatus.APPROVED)
                        ));

                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("cityId"), cityId),
                        root.get("id").in(locationVendorIds)
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