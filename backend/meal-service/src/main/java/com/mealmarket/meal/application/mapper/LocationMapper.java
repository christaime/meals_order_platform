package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.domain.model.DistributionLocation;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE)
public interface LocationMapper {

  LocationMapper INSTANCE = Mappers.getMapper(LocationMapper.class);

  LocationResponse toResponse(DistributionLocation location);

  List<LocationResponse> toResponseList(List<DistributionLocation> locations);
}
