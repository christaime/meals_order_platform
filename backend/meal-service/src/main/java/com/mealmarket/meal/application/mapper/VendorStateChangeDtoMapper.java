package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.VendorStateChangeResponse;
import com.mealmarket.meal.application.dto.VendorStateChangeSummaryResponse;
import com.mealmarket.meal.domain.model.VendorStateChange;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VendorStateChangeDtoMapper {

    VendorStateChangeDtoMapper INSTANCE = Mappers.getMapper(VendorStateChangeDtoMapper.class);

    VendorStateChangeResponse toResponse(VendorStateChange change);

    List<VendorStateChangeResponse> toResponseList(List<VendorStateChange> changes);

    VendorStateChangeSummaryResponse toSummary(VendorStateChange change);

    List<VendorStateChangeSummaryResponse> toSummaryList(List<VendorStateChange> changes);
}