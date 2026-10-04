package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
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
 * City handling:
 *   The entity stores only {@code UUID cityId}. A {@link CityEntity} is
 *   passed in on the Entity → Domain direction by the adapter.
 *
 * Vendor handling:
 *   The mapper receives the fully-assembled domain {@link Vendor} — the
 *   adapter resolves it (minimal — no locations, no categories) to break
 *   the recursion between locations and vendors.
 */
@Mapper(
        componentModel = "spring",
        uses = { CityPersistenceMapper.class }
)
public interface DistributionLocationPersistenceMapper {

    DistributionLocationPersistenceMapper INSTANCE =
            Mappers.getMapper(DistributionLocationPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "vendorId", source = "vendor", qualifiedByName = "extractVendorId")
    @Mapping(target = "cityId",   source = "city.id")
    DistributionLocationEntity toEntity(DistributionLocation location);

    List<DistributionLocationEntity> toEntityList(List<DistributionLocation> locations);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "id",               source = "entity.id")
    @Mapping(target = "name",             source = "entity.name")
    @Mapping(target = "city",             source = "city")
    @Mapping(target = "address",          source = "entity.address")
    @Mapping(target = "phone",            source = "entity.phone")
    @Mapping(target = "latitude",         source = "entity.latitude")
    @Mapping(target = "longitude",        source = "entity.longitude")
    @Mapping(target = "deliveryRadius",   source = "entity.deliveryRadius")
    @Mapping(target = "moderationStatus", source = "entity.moderationStatus")
    @Mapping(target = "createdAt",        source = "entity.createdAt")
    @Mapping(target = "updatedAt",        source = "entity.updatedAt")
    @Mapping(target = "vendor",           source = "vendor")
    DistributionLocation toDomain(
            DistributionLocationEntity entity,
            Vendor vendor,
            CityEntity city
    );

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    @Named("extractVendorId")
    default UUID extractVendorId(Vendor vendor) {
        return vendor != null ? vendor.getId() : null;
    }
}