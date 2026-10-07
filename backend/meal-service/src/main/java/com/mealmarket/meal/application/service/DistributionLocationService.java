package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ForbiddenException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CreateLocationRequest;
import com.mealmarket.meal.application.dto.LocationResponse;
import com.mealmarket.meal.application.dto.LocationSummaryResponse;
import com.mealmarket.meal.application.dto.UpdateLocationRequest;
import com.mealmarket.meal.application.mapper.LocationDtoMapper;
import com.mealmarket.meal.domain.model.City;                                    // NEW
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.CityRepository;                     // NEW
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.LocationProximity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DistributionLocationService {

    private final DistributionLocationRepository locationRepository;
    private final CityRepository cityRepository;                                // NEW
    private final ModerationDataRepository moderationDataRepository;
    private final LocationDtoMapper dtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Creation
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public LocationResponse createLocation(CreateLocationRequest request, Vendor vendor) {
        log.info("Creating location '{}' for vendor: {}",
                request.name(), vendor.getId());

        // 1. Uniqueness per vendor
        if (locationRepository.existsByVendorIdAndName(vendor.getId(), request.name())) {
            throw new ConflictException(
                    "A location named '" + request.name()
                            + "' already exists for this vendor"
            );
        }

        // 2. Resolve city                                                      // NEW
        City city = cityRepository.findById(request.cityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + request.cityId()));

        // 3. Create the domain object (always PENDING)
        DistributionLocation location = DistributionLocation.create(
                vendor,
                request.name(),
                city,                                                           // NEW
                request.address(),
                request.phone(),
                request.latitude(),
                request.longitude(),
                request.deliveryRadius()
        );

        DistributionLocation saved = locationRepository.save(location);

        // 4. Record initial moderation entry
        moderationDataRepository.save(
                ModerationData.created(
                        ModerationTargetType.DISTRIBUTION_LOCATION,
                        saved.getId(),
                        com.mealmarket.meal.domain.model.UserType.VENDOR,
                        vendor.getId()
                )
        );

        log.info("Location created with ID: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (Single)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public LocationResponse getLocationById(UUID locationId) {
        log.debug("Fetching location: {}", locationId);
        DistributionLocation location = findLocationOrThrow(locationId);
        return dtoMapper.toResponse(location);
    }

    @Transactional(readOnly = true)
    public LocationResponse getApprovedLocationById(UUID locationId) {
        log.debug("Fetching approved location: {}", locationId);
        DistributionLocation location = findLocationOrThrow(locationId);

        if (location.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new ResourceNotFoundException(
                    "Location not found or not approved: " + locationId
            );
        }

        return dtoMapper.toResponse(location);
    }

    /**
     * Fetch a location only if it belongs to the given vendor.
     * Used by vendors to manage their own locations.
     */
    @Transactional(readOnly = true)
    public LocationResponse getVendorLocationById(UUID locationId, UUID vendorId) {
        log.debug("Fetching location: {} for vendor: {}", locationId, vendorId);

        DistributionLocation location = findLocationOrThrow(locationId);

        if (!location.belongsTo(vendorId)) {
            throw new ForbiddenException(
                    "This location does not belong to you"
            );
        }

        return dtoMapper.toResponse(location);
    }

    // ═══════════════════════════════════════════════════════════
    //  Read (List / Search)
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DataPage<LocationResponse> searchLocations(
            DistributionLocationSearchRequest request
    ) {
        log.debug("Searching locations with filters");
        return locationRepository.search(request).map(dtoMapper::toResponse);
    }

    /**
     * Vendor's own locations — any moderation status.
     * Forces the vendorId on the criteria.
     */
    @Transactional(readOnly = true)
    public DataPage<LocationResponse> searchMyLocations(
            DistributionLocationSearchRequest request,
            UUID vendorId
    ) {
        log.debug("Searching locations for vendor: {}", vendorId);

        DistributionLocationSearchRequest scopedRequest =
                DistributionLocationSearchRequest.builder()
                        .vendorId(vendorId)                              // ← forced
                        .keyword(request.getKeyword())
                        .name(request.getName())
                        .moderationStatus(request.getModerationStatus())
                        .sort(request.getSort())
                        .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                        .build();

        return locationRepository.search(scopedRequest).map(dtoMapper::toResponse);
    }

    /**
     * Approved locations only — used for public-facing endpoints.
     * Forces moderationStatus = APPROVED and returns summaries.
     */
    @Transactional(readOnly = true)
    public DataPage<LocationSummaryResponse> searchApprovedLocations(
            DistributionLocationSearchRequest request
    ) {
        log.debug("Searching approved locations");

        DistributionLocationSearchRequest approvedRequest =
                DistributionLocationSearchRequest.builder()
                        .vendorId(request.getVendorId())
                        .keyword(request.getKeyword())
                        .name(request.getName())
                        .moderationStatus(ModerationStatus.APPROVED)
                        .cityNameLike(request.getCityNameLike())
                        .cityIds(request.getCityIds())
                        .locationProximity(request.getLocationProximity())
                        .sort(request.getSort())
                        .page(request.getPageRequest().getPage(), request.getPageRequest().getSize())
                        .build();

        return locationRepository.search(approvedRequest).map(dtoMapper::toSummary);
    }

    // ═══════════════════════════════════════════════════════════
    //  Proximity Search
    // ═══════════════════════════════════════════════════════════

    /**
     * Find a vendor's approved locations within a radius of a point.
     * Used for "does this vendor deliver to my area?" checks.
     */
    @Transactional(readOnly = true)
    public List<LocationResponse> findNearbyLocationsOfVendor(
            UUID vendorId,
            double latitude,
            double longitude,
            int radiusKm
    ) {
        log.debug("Finding nearby locations for vendor: {} around ({}, {}) within {} km",
                vendorId, latitude, longitude, radiusKm);

        return locationRepository
                .findNearbyByVendorId(vendorId, latitude, longitude, radiusKm)
                .stream()
                .map(dtoMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Update
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public LocationResponse updateLocation(
            UUID locationId,
            UpdateLocationRequest request,
            UUID vendorId
    ) {
        log.info("Updating location: {} by vendor: {}", locationId, vendorId);

        DistributionLocation existing = findLocationOrThrow(locationId);
        // Only pending location can be edit
        if (!existing.getModerationStatus().equals(ModerationStatus.PENDING)) {
            throw new ConflictException(
                    "Location can only be edited while PENDING — current status: "
                            + existing.getModerationStatus());
        }
        // Ownership check
        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This location does not belong to you");
        }

        // Uniqueness re-check if name is being changed
        if (request.name() != null
                && !request.name().equalsIgnoreCase(existing.getName())
                && locationRepository.existsByVendorIdAndName(vendorId, request.name())) {
            throw new ConflictException(
                    "A location named '" + request.name()
                            + "' already exists for this vendor"
            );
        }

        // Resolve city only when provided (null = unchanged)                  // NEW
        City city = request.cityId() != null
                ? cityRepository.findById(request.cityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + request.cityId()))
                : null;

        DistributionLocation updated = existing.withUpdatedDetails(
                request.name(),
                city,                                                           // NEW
                request.address(),
                request.phone(),
                request.latitude(),
                request.longitude(),
                request.deliveryRadius()
        );

        DistributionLocation saved = locationRepository.save(updated);
        log.info("Location updated: {}", saved.getId());
        return dtoMapper.toResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete (Moderation-aware logic)
    // ═══════════════════════════════════════════════════════════

    /**
     * Vendor deletes their own location following the moderation-aware rule:
     * - PENDING / REJECTED → hard delete
     * - APPROVED → transition to DISABLED + record moderation
     * - DISABLED → reject with ConflictException
     */
    @Transactional
    public void deleteLocation(UUID locationId, UUID vendorId) {
        log.info("Deleting location: {} by vendor: {}", locationId, vendorId);

        DistributionLocation existing = findLocationOrThrow(locationId);

        // Ownership check
        if (!existing.belongsTo(vendorId)) {
            throw new ForbiddenException("This location does not belong to you");
        }

        switch (existing.getModerationStatus()) {

            case PENDING, REJECTED -> {
                log.info("Location {} is {} — performing hard delete",
                        locationId, existing.getModerationStatus());
                locationRepository.deleteById(locationId);
            }

            case APPROVED -> {
                log.info("Location {} is APPROVED — disabling instead of deleting",
                        locationId);

                DistributionLocation disabled =
                        existing.withModerationStatus(ModerationStatus.DISABLED);
                locationRepository.save(disabled);

                moderationDataRepository.save(
                        ModerationData.disabled(
                                ModerationTargetType.DISTRIBUTION_LOCATION,
                                locationId,
                                "Vendor requested deletion — location was approved",
                                vendorId
                        )
                );
            }

            case DISABLED -> throw new ConflictException(
                    "Location is already disabled and cannot be deleted"
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public long countMyLocations(UUID vendorId) {
        return locationRepository.countByVendorId(vendorId);
    }

    @Transactional(readOnly = true)
    public long countMyApprovedLocations(UUID vendorId) {
        DistributionLocationSearchRequest request =
                DistributionLocationSearchRequest.builder()
                        .vendorId(vendorId)
                        .moderationStatus(ModerationStatus.APPROVED)
                        .page(0, 1)
                        .build();

        return locationRepository.search(request).getTotalElements();
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DistributionLocation findLocationOrThrow(UUID locationId) {
        return locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Location not found: " + locationId));
    }
}