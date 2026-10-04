package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface CityJpaRepository
        extends JpaRepository<CityEntity, UUID>, JpaSpecificationExecutor<CityEntity> {

    boolean existsByNameIgnoreCaseAndCountryCode(String name, String countryCode);
}
