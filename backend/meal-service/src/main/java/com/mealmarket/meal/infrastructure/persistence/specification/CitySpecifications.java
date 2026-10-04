package com.mealmarket.meal.infrastructure.persistence.specification;

import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import org.springframework.data.jpa.domain.Specification;

public final class CitySpecifications {

    private CitySpecifications() {}

    public static Specification<CityEntity> from(CitySearchRequest request) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String pattern = "%" + request.getKeyword().trim().toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("region")), pattern)
                ));
            }

            if (request.getRegion() != null && !request.getRegion().isBlank()) {
                predicates = cb.and(predicates,
                        cb.like(cb.lower(root.get("region")),
                                "%" + request.getRegion().trim().toLowerCase() + "%"));
            }

            if (request.getCountryCode() != null && !request.getCountryCode().isBlank()) {
                predicates = cb.and(predicates,
                        cb.equal(root.get("countryCode"),
                                request.getCountryCode().toUpperCase()));
            }

            return predicates;
        };
    }
}