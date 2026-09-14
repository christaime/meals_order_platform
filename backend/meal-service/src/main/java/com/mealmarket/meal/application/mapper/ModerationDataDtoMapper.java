package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.dto.ModerationDataResponse;
import com.mealmarket.meal.application.dto.ModerationSummaryResponse;
import com.mealmarket.meal.domain.model.ModerationData;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link ModerationData} (domain) and its DTOs.
 *
 * All fields map directly by name — no custom helpers needed.
 */
@Mapper(componentModel = "spring")
public interface ModerationDataDtoMapper {

    ModerationDataDtoMapper INSTANCE = Mappers.getMapper(ModerationDataDtoMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Full Response
    // ═══════════════════════════════════════════════════════════

    ModerationDataResponse toResponse(ModerationData data);

    List<ModerationDataResponse> toResponseList(List<ModerationData> data);

    // ═══════════════════════════════════════════════════════════
    //  Summary Response
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "toStatus", source = "toStatus")
    @Mapping(target = "performedByType", source = "performedByType")
    ModerationSummaryResponse toSummary(ModerationData data);

    List<ModerationSummaryResponse> toSummaryList(List<ModerationData> data);
}