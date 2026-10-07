package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.LocationProximity;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

            // ─── Vendor ID (optional) ────────────────────────────
            if (request.getVendorId() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("vendorId"),
                        request.getVendorId()
                ));
            }

            // ─── Exact city ids ──────────────────────────────────
            if (request.getCityIds() != null && !request.getCityIds().isEmpty()) {
                predicates.add(root.get("cityId").in(request.getCityIds()));
            }

            // ─── City name / region substring (subquery) ─────────
            //
            // Only fires when the caller explicitly asked for it.
            // Searches CityEntity for a matching name OR region, then
            // constrains the location's cityId to that set.
            //
            // A subquery (rather than a @ManyToOne join) keeps the
            // location entity association-free, in line with the
            // project convention.
            if (request.getCityNameLike() != null
                    && !request.getCityNameLike().isBlank()) {
                String pattern = "%"
                        + request.getCityNameLike().toLowerCase().trim()
                        + "%";
                predicates.add(root.get("cityId").in(
                        matchingCityIds(pattern, query, criteriaBuilder)
                ));
            }

            // ─── Keyword (name OR address only) ──────────────────
            //
            // Location-level fields only. The city is filtered
            // separately by cityNameLike so the two concerns stay
            // decoupled and the keyword search stays cheap.
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = "%" + request.getKeyword().toLowerCase().trim() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")), keyword),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("address")), keyword)
                ));
            }

            // ─── Exact name ──────────────────────────────────────
            if (request.getName() != null && !request.getName().isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("name")),
                        request.getName().toLowerCase()
                ));
            }

            // ─── Moderation status ───────────────────────────────
            if (request.getModerationStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("moderationStatus"),
                        request.getModerationStatus()
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    /**
     * Subquery: ids of cities whose name OR region matches the given
     * LIKE pattern.
     *
     * The pattern is expected to already contain % wildcards and be
     * lowercased — the caller prepares it.
     *
     * Used by the cityNameLike filter. Not invoked unless the caller
     * sets cityNameLike on the request, so the subquery never appears
     * in the SQL for location-only searches.
     */
    private static Subquery<UUID> matchingCityIds(
            String pattern,
            CriteriaQuery<?> query,
            CriteriaBuilder cb
    ) {
        Subquery<UUID> sub = query.subquery(UUID.class);
        Root<CityEntity> cityRoot = sub.from(CityEntity.class);
        sub.select(cityRoot.get("id"))
                .where(cb.or(
                        cb.like(cb.lower(cityRoot.get("name")), pattern),
                        cb.like(cb.lower(cityRoot.get("region")), pattern)
                ));
        return sub;
    }
}