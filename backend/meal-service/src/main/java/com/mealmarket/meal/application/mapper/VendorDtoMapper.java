package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.CategorySummaryResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorSummaryResponse;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps between {@link Vendor} (domain) and its DTOs.
 *
 * Handles:
 * - State flattening (VendorState → individual fields)
 * - Cusines filter (only CUISINE categories)
 * - Location summarization
 * - Category summarization
 */
@Mapper(componentModel = "spring")
public interface VendorDtoMapper {

    VendorDtoMapper INSTANCE = Mappers.getMapper(VendorDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "status", source = "state.status")
    @Mapping(target = "statusReason", source = "state.reason")
    @Mapping(target = "statusChangedAt", source = "state.changedAt")
    @Mapping(target = "statusChangedBy", source = "state.changedBy")
    @Mapping(target = "statusChangeType", source = "state.changeType")
    @Mapping(target = "cuisines", source = "categories", qualifiedByName = "mapCuisines")
    @Mapping(target = "distributionLocations", source = "distributionLocations", qualifiedByName = "mapLocationSummaries")
    VendorResponse toResponse(Vendor vendor);

    List<VendorResponse> toResponseList(List<Vendor> vendors);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "status", source = "state.status")
    @Mapping(target = "cuisines", source = "categories", qualifiedByName = "mapCuisines")
    VendorSummaryResponse toSummary(Vendor vendor);

    List<VendorSummaryResponse> toSummaryList(List<Vendor> vendors);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("mapCuisines")
    default List<CategorySummaryResponse> mapCuisines(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.CUISINE)
                .map(c -> new CategorySummaryResponse(
                        c.getId(),
                        c.getName(),
                        c.getIconUrl(),
                        c.getType()
                ))
                .collect(Collectors.toList());
    }

    @Named("mapLocationSummaries")
    default List<LocationSummaryResponse> mapLocationSummaries(List<DistributionLocation> locations) {
        if (locations == null || locations.isEmpty()) {
            return List.of();
        }
        return locations.stream()
                .map(loc -> new LocationSummaryResponse(
                        loc.getId(),
                        loc.getName(),
                        loc.getAddress(),
                        loc.getModerationStatus()
                ))
                .collect(Collectors.toList());
    }
}