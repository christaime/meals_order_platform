package com.mealmarket.meal.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Persistence entity for {@link com.mealmarket.meal.domain.model.City}.
 *
 * Reference data — no {@code @SQLRestriction}, no moderation columns.
 * Uniqueness of (name, country_code) is enforced by the SQL constraint.
 */
@Entity
@Table(
        name = "city",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_city_name_country",
                columnNames = {"name", "country_code"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CityEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "region", length = 120)
    private String region;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}