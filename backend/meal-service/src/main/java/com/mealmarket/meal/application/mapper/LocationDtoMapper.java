package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.domain.model.DistributionLocation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring", uses = { CityDtoMapper.class })
public interface LocationDtoMapper {

    LocationDtoMapper INSTANCE = Mappers.getMapper(LocationDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId",           source = "vendor.id")
    @Mapping(target = "vendorBusinessName", source = "vendor.businessName")
    @Mapping(target = "city",               source = "city")               // NEW
    @Mapping(target = "isActive",           source = ".", qualifiedByName = "deriveIsActive")
    LocationResponse toResponse(DistributionLocation location);

    List<LocationResponse> toResponseList(List<DistributionLocation> locations);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId",           source = "vendor.id")
    @Mapping(target = "vendorBusinessName", source = "vendor.businessName")
    @Mapping(target = "city",               source = "city")               // NEW
    LocationSummaryResponse toSummary(DistributionLocation location);

    List<LocationSummaryResponse> toSummaryList(List<DistributionLocation> locations);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("deriveIsActive")
    default Boolean deriveIsActive(DistributionLocation location) {
        return location != null && location.isActive();
    }
}