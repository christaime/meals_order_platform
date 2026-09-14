package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.UUID;

/**
 * Maps between {@link Vendor} (domain) and {@link VendorEntity} (JPA).
 *
 * Relationship handling:
 * - {@code categories} and {@code distributionLocations} are IGNORED on the
 *   entity → domain direction. The adapter loads them separately via their
 *   respective repositories and reassembles the full domain object.
 * - On the domain → entity direction, only IDs are extracted from the objects.
 */
@Mapper(componentModel = "spring")
public interface VendorPersistenceMapper {

    VendorPersistenceMapper INSTANCE = Mappers.getMapper(VendorPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "categoryIds", source = "categories", qualifiedByName = "mapCategoryIds")
    @Mapping(target = "distributionLocationIds", source = "distributionLocations", qualifiedByName = "mapLocationIds")
    @Mapping(target = "status", source = "state.status")
    @Mapping(target = "statusReason", source = "state.reason")
    @Mapping(target = "statusChangedAt", source = "state.changedAt")
    @Mapping(target = "statusChangedBy", source = "state.changedBy")
    @Mapping(target = "statusChangeType", source = "state.changeType")
    VendorEntity toEntity(Vendor vendor);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain (lightweight)
    //  Relationships are loaded separately by the adapter
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "state", source = ".", qualifiedByName = "buildState")
    @Mapping(target = "categories", ignore = true)
    @Mapping(target = "distributionLocations", ignore = true)
    Vendor toDomain(VendorEntity entity);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("buildState")
    default VendorState buildState(VendorEntity entity) {
        if (entity.getStatus() == null) {
            return null;
        }
        return new VendorState(
                entity.getStatus(),
                entity.getStatusReason(),
                entity.getStatusChangedAt(),
                entity.getStatusChangedBy(),
                entity.getStatusChangeType()
        );
    }

    @Named("mapCategoryIds")
    default List<UUID> mapCategoryIds(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
                .map(Category::getId)
                .toList();
    }

    @Named("mapLocationIds")
    default List<UUID> mapLocationIds(List<DistributionLocation> locations) {
        if (locations == null || locations.isEmpty()) {
            return List.of();
        }
        return locations.stream()
                .map(DistributionLocation::getId)
                .toList();
    }
}