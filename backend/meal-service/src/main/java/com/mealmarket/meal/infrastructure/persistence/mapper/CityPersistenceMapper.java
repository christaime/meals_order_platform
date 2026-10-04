package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CityPersistenceMapper {

    @Mapping(target = "id",          source = "id")
    @Mapping(target = "name",        source = "name")
    @Mapping(target = "region",      source = "region")
    @Mapping(target = "countryCode", source = "countryCode")
    @Mapping(target = "createdAt",   source = "createdAt")
    @Mapping(target = "updatedAt",   source = "updatedAt")
    City toDomain(CityEntity entity);

    @Mapping(target = "id",          source = "id")
    @Mapping(target = "name",        source = "name")
    @Mapping(target = "region",      source = "region")
    @Mapping(target = "countryCode", source = "countryCode")
    @Mapping(target = "createdAt",   source = "createdAt")
    @Mapping(target = "updatedAt",   source = "updatedAt")
    CityEntity toEntity(City city);
}