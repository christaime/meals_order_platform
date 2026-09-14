package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.infrastructure.persistence.entity.ModerationDataEntity;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link ModerationData} (domain) and
 * {@link ModerationDataEntity} (JPA).
 *
 * All fields map directly by name — no custom helpers needed.
 */
@Mapper(componentModel = "spring")
public interface ModerationDataPersistenceMapper {

    ModerationDataPersistenceMapper INSTANCE =
            Mappers.getMapper(ModerationDataPersistenceMapper.class);

    // ─── Domain → Entity ───────────────────────────────────────

    ModerationDataEntity toEntity(ModerationData data);

    List<ModerationDataEntity> toEntityList(List<ModerationData> data);

    // ─── Entity → Domain ───────────────────────────────────────

    ModerationData toDomain(ModerationDataEntity entity);

    List<ModerationData> toDomainList(List<ModerationDataEntity> entities);
}