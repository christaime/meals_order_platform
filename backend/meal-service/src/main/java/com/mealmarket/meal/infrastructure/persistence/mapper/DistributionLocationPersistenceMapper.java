package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.UUID;

/**
 * Maps between {@link DistributionLocation} (domain) and
 * {@link DistributionLocationEntity} (JPA).
 *
 * Relationship handling:
 * - The domain has a full {@code Vendor} object.
 * - The entity stores only {@code vendorId}.
 * - On Domain → Entity: extract {@code vendor.id} into {@code vendorId}.
 * - On Entity → Domain: {@code vendor} is IGNORED — the adapter loads it
 *   separately via the vendor repository and reassembles the domain object.
 */
@Mapper(componentModel = "spring")
public interface DistributionLocationPersistenceMapper {

    DistributionLocationPersistenceMapper INSTANCE =
            Mappers.getMapper(DistributionLocationPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId", source = "vendor", qualifiedByName = "extractVendorId")
    DistributionLocationEntity toEntity(DistributionLocation location);

    List<DistributionLocationEntity> toEntityList(List<DistributionLocation> locations);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain (lightweight)
    //  Vendor is loaded separately by the adapter
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendor", ignore = true)
    DistributionLocation toDomain(DistributionLocationEntity entity);

    List<DistributionLocation> toDomainList(List<DistributionLocationEntity> entities);

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("extractVendorId")
    default UUID extractVendorId(com.mealmarket.meal.domain.model.Vendor vendor) {
        return vendor != null ? vendor.getId() : null;
    }
}