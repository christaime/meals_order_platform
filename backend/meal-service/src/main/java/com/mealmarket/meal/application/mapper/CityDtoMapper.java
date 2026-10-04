package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CityResponse;
import com.mealmarket.meal.domain.model.City;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CityDtoMapper {

    @Mapping(target = "id",          source = "id")
    @Mapping(target = "name",        source = "name")
    @Mapping(target = "region",      source = "region")
    @Mapping(target = "countryCode", source = "countryCode")
    CityResponse toResponse(City city);

    List<CityResponse> toResponseList(List<City> cities);
}