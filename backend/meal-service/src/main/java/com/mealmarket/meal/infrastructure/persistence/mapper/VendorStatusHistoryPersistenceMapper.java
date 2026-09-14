package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorStatusHistoryEntity;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * Maps between {@link VendorStateChange} (domain) and
 * {@link VendorStatusHistoryEntity} (JPA).
 *
 * VendorStateChange is a standalone entity — no relationships to load.
 * All fields map directly.
 */
@Mapper(componentModel = "spring")
public interface VendorStatusHistoryPersistenceMapper {

    VendorStatusHistoryPersistenceMapper INSTANCE =
            Mappers.getMapper(VendorStatusHistoryPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    VendorStatusHistoryEntity toEntity(VendorStateChange change);

    List<VendorStatusHistoryEntity> toEntityList(List<VendorStateChange> changes);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain
    // ═══════════════════════════════════════════════════════════

    VendorStateChange toDomain(VendorStatusHistoryEntity entity);

    List<VendorStateChange> toDomainList(List<VendorStatusHistoryEntity> entities);
}