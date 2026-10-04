package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorSummaryResponse;
import com.mealmarket.meal.application.mapper.*;
import com.mealmarket.meal.domain.model.Vendor;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring",
        uses = {
                CityDtoMapper.class,
                CategoryDtoMapper.class,
                LocationDtoMapper.class,
                SharedSummaryMappings.class,
                MediaUrlResolver.class
        })
public interface VendorDtoMapper {

    VendorDtoMapper INSTANCE = Mappers.getMapper(VendorDtoMapper.class);

    @Mapping(target = "status", source = "state.status")
    @Mapping(target = "statusReason", source = "state.reason")
    @Mapping(target = "statusChangedAt", source = "state.changedAt")
    @Mapping(target = "statusChangedBy", source = "state.changedBy")
    @Mapping(target = "statusChangeType", source = "state.changeType")
    @Mapping(target = "city", source = "city")
    @Mapping(target = "profileImageUrl",        source = "profileImageStorageRef", qualifiedByName = "toUrl")
    @Mapping(target = "profileImageStorageRef", source = "profileImageStorageRef")
    @Mapping(target = "coverImageUrl",          source = "coverImageStorageRef",   qualifiedByName = "toUrl")
    @Mapping(target = "coverImageStorageRef",   source = "coverImageStorageRef")
    @Mapping(target = "idCardFrontUrl",         source = "idCardFrontStorageRef",  qualifiedByName = "toUrl")
    @Mapping(target = "idCardFrontStorageRef",  source = "idCardFrontStorageRef")
    @Mapping(target = "idCardBackUrl",          source = "idCardBackStorageRef",   qualifiedByName = "toUrl")
    @Mapping(target = "idCardBackStorageRef",   source = "idCardBackStorageRef")
    @Mapping(target = "cuisines",               source = "categories",            qualifiedByName = "mapCuisines")
    @Mapping(target = "distributionLocations",  source = "distributionLocations", qualifiedByName = "mapLocationSummaries")
    VendorResponse toResponse(Vendor vendor, @Context CategoryDtoMapper cm, @Context LocationDtoMapper lm);

    List<VendorResponse> toResponseList(List<Vendor> vendors);

    @Mapping(target = "status", source = "state.status")
    @Mapping(target = "city", source = "city")
    @Mapping(target = "profileImageUrl", source = "profileImageStorageRef", qualifiedByName = "toUrl")
    @Mapping(target = "cuisines", source = "categories", qualifiedByName = "mapCuisines")
    VendorSummaryResponse toSummary(Vendor vendor, @Context CategoryDtoMapper cm);

    List<VendorSummaryResponse> toSummaryList(List<Vendor> vendors);
}