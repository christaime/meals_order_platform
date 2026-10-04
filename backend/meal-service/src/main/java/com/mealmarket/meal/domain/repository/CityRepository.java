package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CityRepository {

    Optional<City> findById(UUID id);

    DataPage<City> search(CitySearchRequest request);

    List<City> findAll();

    City save(City city);

    void deleteById(UUID id);

    boolean existsByNameAndCountryCode(String name, String countryCode);
}