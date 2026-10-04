package com.mealmarket.meal.infrastructure.persistence.mapper;

import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
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
 * Multi-parameter methods (Entity → Domain):
 *   Every {@code @Mapping} source is prefixed with its parameter name.
 *   MapStruct cannot disambiguate implicit sources across parameters,
 *   and three fields — {@code id}, {@code createdAt}, {@code updatedAt} —
 *   exist on both {@code VendorEntity} and {@code CityEntity}.
 *
 * City handling:
 *   The entity stores only {@code UUID cityId}; the {@code CityEntity}
 *   is resolved by the adapter and passed in.
 */
@Mapper(
        componentModel = "spring",
        uses = { CityPersistenceMapper.class }
)
public interface VendorPersistenceMapper {

    VendorPersistenceMapper INSTANCE = Mappers.getMapper(VendorPersistenceMapper.class);

    // ═══════════════════════════════════════════════════════════
    //  Domain → Entity  (single parameter — no prefix needed)
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "categoryIds",             source = "categories",            qualifiedByName = "mapCategoryIds")
    @Mapping(target = "distributionLocationIds", source = "distributionLocations", qualifiedByName = "mapLocationIds")
    @Mapping(target = "status",                  source = "state.status")
    @Mapping(target = "statusReason",            source = "state.reason")
    @Mapping(target = "statusChangedAt",         source = "state.changedAt")
    @Mapping(target = "statusChangedBy",         source = "state.changedBy")
    @Mapping(target = "statusChangeType",        source = "state.changeType")
    @Mapping(target = "cityId",                  source = "city.id")
    VendorEntity toEntity(Vendor vendor);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain  (full)
    //
    //  Two parameters → every source must be prefixed.
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "id",             source = "entity.id")
    @Mapping(target = "userId",         source = "entity.userId")
    @Mapping(target = "businessName",   source = "entity.businessName")
    @Mapping(target = "ownerName",      source = "entity.ownerName")
    @Mapping(target = "description",    source = "entity.description")
    @Mapping(target = "address",        source = "entity.address")
    @Mapping(target = "email",          source = "entity.email")
    @Mapping(target = "phone",          source = "entity.phone")
    @Mapping(target = "city",           source = "city")
    @Mapping(target = "ratingAvg",      source = "entity.ratingAvg")
    @Mapping(target = "totalRatings",   source = "entity.totalRatings")
    @Mapping(target = "state",          source = "entity", qualifiedByName = "buildState")
    @Mapping(target = "deliveryRadius", source = "entity.deliveryRadius")
    @Mapping(target = "pickupAddress",  source = "entity.pickupAddress")

    @Mapping(target = "profileImageStorageRef", source = "entity.profileImageStorageRef")
    @Mapping(target = "coverImageStorageRef",   source = "entity.coverImageStorageRef")
    @Mapping(target = "idCardFrontStorageRef",  source = "entity.idCardFrontStorageRef")
    @Mapping(target = "idCardBackStorageRef",   source = "entity.idCardBackStorageRef")

    @Mapping(target = "subscriptionTier",  source = "entity.subscriptionTier")
    @Mapping(target = "createdAt",         source = "entity.createdAt")
    @Mapping(target = "updatedAt",         source = "entity.updatedAt")

    // Loaded separately by the adapter — do not attempt to map.
    @Mapping(target = "categories",            ignore = true)
    @Mapping(target = "distributionLocations", ignore = true)
    Vendor toDomain(VendorEntity entity, CityEntity city);

    // ═══════════════════════════════════════════════════════════
    //  Entity → Domain  (minimal)
    //
    //  Used to build the {@code vendor} field of a location / meal.
    //  Populates only fields required by {@code Vendor}'s own
    //  validation. Everything else is ignored.
    // ═══════════════════════════════════════════════════════════

    @Named("toMinimalDomain")
    @Mapping(target = "id",             source = "entity.id")
    @Mapping(target = "userId",         source = "entity.userId")
    @Mapping(target = "businessName",   source = "entity.businessName")
    @Mapping(target = "ownerName",      source = "entity.ownerName")
    @Mapping(target = "address",        source = "entity.address")
    @Mapping(target = "email",          source = "entity.email")
    @Mapping(target = "phone",          source = "entity.phone")
    @Mapping(target = "city",           source = "city")
    @Mapping(target = "state",          source = "entity", qualifiedByName = "buildState")
    @Mapping(target = "subscriptionTier", source = "entity.subscriptionTier", defaultValue = "FREE")

    // Not needed by a location / meal referencing a vendor.
    @Mapping(target = "description",            ignore = true)
    @Mapping(target = "ratingAvg",              ignore = true)
    @Mapping(target = "totalRatings",           ignore = true)
    @Mapping(target = "deliveryRadius",         ignore = true)
    @Mapping(target = "pickupAddress",          ignore = true)
    @Mapping(target = "profileImageStorageRef", ignore = true)
    @Mapping(target = "coverImageStorageRef",   ignore = true)
    @Mapping(target = "idCardFrontStorageRef",  ignore = true)
    @Mapping(target = "idCardBackStorageRef",   ignore = true)
    @Mapping(target = "categories",             ignore = true)
    @Mapping(target = "distributionLocations",  ignore = true)
    @Mapping(target = "createdAt",              ignore = true)
    @Mapping(target = "updatedAt",              ignore = true)
    Vendor toMinimalDomain(VendorEntity entity, CityEntity city);

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