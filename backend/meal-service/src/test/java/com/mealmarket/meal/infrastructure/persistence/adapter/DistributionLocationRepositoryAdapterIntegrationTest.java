package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.common.pagination.Sort;
import com.mealmarket.meal.application.mapper.CityDtoMapper;
import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.SubscriptionTier;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.domain.repository.criteria.LocationProximity;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CityPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("DistributionLocationRepositoryAdapter (integration)")
class DistributionLocationRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID OWNER_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");

    @Autowired private DistributionLocationRepository locationRepository;
    @Autowired private DistributionLocationJpaRepository locationJpaRepository;
    @Autowired private VendorJpaRepository vendorJpaRepository;
    @Autowired private CityJpaRepository cityJpaRepository;
    @Autowired private CityPersistenceMapper cityPersistenceMapper;
    @Autowired private VendorPersistenceMapper vendorPersistenceMapper;

    private Vendor vendor;
    private City city;
    private CityEntity cityEntity;

    @BeforeEach
    void cleanUp() {
        locationJpaRepository.deleteAll();
        vendorJpaRepository.deleteAll();
        cityJpaRepository.deleteAll();

        // Reference rows every test can rely on.
        cityEntity = seedCity("Douala", "Littoral", "CM");
        city = cityPersistenceMapper.toDomain(cityEntity);
        vendor = vendorPersistenceMapper.toDomain(seedVendor("Vendor One", "vendor1@test.com", city.getId()), cityEntity);
    }

    // ------------------------------------------------------------------
    // Fixtures — seed through JPA repositories so adapters' read paths
    // (which resolve the vendor and city by id) have valid rows.
    // ------------------------------------------------------------------

    private CityEntity seedCity(String name, String region, String countryCode) {
        CityEntity entity = CityEntity.builder()
                .id(UUID.randomUUID())
                .name(name)
                .region(region)
                .countryCode(countryCode)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return cityJpaRepository.save(entity);
    }

    private VendorEntity seedVendor(String businessName, String email,UUID cityId) {
        VendorEntity entity = VendorEntity.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .businessName(businessName)
                .ownerName("Owner")
                .address("1 Main St")
                .cityId(cityId)
                .email(email)
                .phone("+237600000000")
                .subscriptionTier(SubscriptionTier.FREE)
                .ratingAvg(BigDecimal.ZERO)
                .totalRatings(0)
                .status(VendorState.VendorStatus.ACTIVE)
                .deliveryRadius(10)
                .build();
        return vendorJpaRepository.save(entity);
    }

    private DistributionLocation location(
            String name,
            Vendor vendor,
            City city,
            double lat,
            double lng,
            ModerationStatus status) {
        return DistributionLocation.builder()
                .vendor(vendor)
                .name(name)
                .address("Address for " + name)
                .phone("+237600000000")
                .city(city)
                .latitude(lat)
                .longitude(lng)
                .deliveryRadius(10)
                .moderationStatus(status)
                .build();
    }

    private DistributionLocationSearchRequest.Builder requestBuilder() {
        return DistributionLocationSearchRequest.builder();
    }

    private void sleepMillis(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("CRUD")
    class CrudTests {

        @Test
        @DisplayName("save() persists a new location and rehydrates vendor + city")
        void save_persistsNewLocation() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getName()).isEqualTo("Main");
            assertThat(saved.getVendor()).isNotNull();
            assertThat(saved.getCity()).isNotNull();
            assertThat(locationJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("save() updates an existing location")
        void save_updatesExistingLocation() {
            DistributionLocation saved = locationRepository.save(
                    location("Old", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            saved = saved.withName("New");
            DistributionLocation updated = locationRepository.save(saved);

            assertThat(updated.getId()).isEqualTo(saved.getId());
            assertThat(updated.getName()).isEqualTo("New");
            assertThat(locationJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("findById() returns the location with vendor and city")
        void findById_returnsLocationWithRelations() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            Optional<DistributionLocation> found = locationRepository.findById(saved.getId());

            assertThat(found).isPresent();
            assertThat(found.get().getVendor()).isNotNull();
            assertThat(found.get().getVendor().getId()).isEqualTo(vendor.getId());
            assertThat(found.get().getCity()).isNotNull();
            assertThat(found.get().getCity().getId()).isEqualTo(city.getId());
        }

        @Test
        @DisplayName("findById() returns empty for an unknown id")
        void findById_returnsEmptyForUnknownId() {
            assertThat(locationRepository.findById(UUID.randomUUID())).isEmpty();
        }

        @Test
        @DisplayName("existsById() reflects the row's presence")
        void existsById_reflectsPresence() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            assertThat(locationRepository.existsById(saved.getId())).isTrue();
            assertThat(locationRepository.existsById(UUID.randomUUID())).isFalse();
        }

        @Test
        @DisplayName("deleteById() removes the row")
        void deleteById_removesRow() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            locationRepository.deleteById(saved.getId());

            assertThat(locationJpaRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("delete() removes the row")
        void delete_removesRow() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.05, 9.70, ModerationStatus.APPROVED));

            locationRepository.delete(saved);

            assertThat(locationJpaRepository.findById(saved.getId())).isEmpty();
        }

        @Test
        @DisplayName("findByVendorId() returns only that vendor's rows")
        void findByVendorId_returnsOnlyThatVendor() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com", city.getId());

            locationRepository.save(location("V1-A", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V1-B", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V2-A", vendorPersistenceMapper.toDomain(otherVendor,cityEntity), city, 4.2, 9.7, ModerationStatus.APPROVED));

            List<DistributionLocation> result = locationRepository.findByVendorId(vendor.getId());

            assertThat(result).hasSize(2);
            assertThat(result).extracting(DistributionLocation::getName)
                    .containsExactlyInAnyOrder("V1-A", "V1-B");
        }

        @Test
        @DisplayName("countByVendorId() counts only that vendor's rows")
        void countByVendorId_countsOnlyThatVendor() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com", city.getId());

            locationRepository.save(location("V1-A", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V1-B", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V2-A", vendorPersistenceMapper.toDomain(otherVendor,cityEntity), city, 4.2, 9.7, ModerationStatus.APPROVED));

            assertThat(locationRepository.countByVendorId(vendor.getId())).isEqualTo(2);
            assertThat(locationRepository.countByVendorId(otherVendor.getId())).isEqualTo(1);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Uniqueness")
    class UniquenessTests {

        @Test
        @DisplayName("existsByVendorIdAndName() is true for a duplicate")
        void existsByVendorIdAndName_trueForDuplicate() {
            locationRepository.save(location("Main", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));

            assertThat(locationRepository.existsByVendorIdAndName(vendor.getId(), "Main")).isTrue();
        }

        @Test
        @DisplayName("existsByVendorIdAndName() is false for a different vendor")
        void existsByVendorIdAndName_falseForDifferentVendor() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com",city.getId());
            locationRepository.save(location("Main", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));

            assertThat(locationRepository.existsByVendorIdAndName(otherVendor.getId(), "Main")).isFalse();
        }

        @Test
        @DisplayName("findByVendorIdAndName() returns the match")
        void findByVendorIdAndName_returnsMatch() {
            DistributionLocation saved = locationRepository.save(
                    location("Main", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));

            Optional<DistributionLocation> found =
                    locationRepository.findByVendorIdAndName(vendor.getId(), "Main");

            assertThat(found).isPresent();
            assertThat(found.get().getId()).isEqualTo(saved.getId());
        }

        @Test
        @DisplayName("findByVendorIdAndName() returns empty for a miss")
        void findByVendorIdAndName_returnsEmptyForMiss() {
            assertThat(locationRepository.findByVendorIdAndName(vendor.getId(), "Unknown")).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk lookup
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Bulk lookup")
    class BulkLookupTests {

        @Test
        @DisplayName("findAllById() returns every matching row")
        void findAllById_returnsEveryMatch() {
            DistributionLocation a = locationRepository.save(
                    location("Alma", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            DistributionLocation b = locationRepository.save(
                    location("Balm", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Calm", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            List<DistributionLocation> found =
                    locationRepository.findAllById(List.of(a.getId(), b.getId()));

            assertThat(found).hasSize(2);
            assertThat(found).extracting(DistributionLocation::getName)
                    .containsExactlyInAnyOrder("Alma", "Balm");
        }

        @Test
        @DisplayName("findAllById() short-circuits on an empty list")
        void findAllById_handlesEmptyList() {
            assertThat(locationRepository.findAllById(List.of())).isEmpty();
            assertThat(locationRepository.findAllById(null)).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Filtering (Criteria path)
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Filtering (Criteria path)")
    class FilteringTests {

        @Test
        @DisplayName("search() filters by moderationStatus")
        void search_filtersByModerationStatus() {
            locationRepository.save(location("Alma", vendor, city, 4.0, 9.7, ModerationStatus.PENDING));
            locationRepository.save(location("Balm", vendor, city, 4.1, 9.7, ModerationStatus.PENDING));
            locationRepository.save(location("Calm", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(DistributionLocation::getModerationStatus)
                    .containsOnly(ModerationStatus.PENDING);
        }

        @Test
        @DisplayName("search() filters by vendorId")
        void search_filtersByVendorId() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com",city.getId());
            locationRepository.save(location("V1-A", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V1-B", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V2-A", vendorPersistenceMapper.toDomain(otherVendor, cityEntity), city, 4.2, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .vendorId(vendor.getId())
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactlyInAnyOrder("V1-A", "V1-B");
        }

        @Test
        @DisplayName("search() filters by cityIds")
        void search_filtersByCityIds() {
            CityEntity otherCity = seedCity("Yaoundé", "Centre", "CM");
            locationRepository.save(location("InDouala", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("InYaounde", vendor, cityPersistenceMapper.toDomain(otherCity), 3.8, 11.5, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .cityIds(List.of(city.getId()))
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("InDouala");
        }

        @Test
        @DisplayName("search() keyword matches name")
        void search_keywordMatchesName() {
            locationRepository.save(location("Marché Central", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Marché Mokolo", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Akwa", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .keyword("marché")
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
        }

        @Test
        @DisplayName("search() combines moderationStatus and vendorId")
        void search_combinesStatusAndVendor() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com", city.getId());
            locationRepository.save(location("V1-Pending", vendor, city, 4.0, 9.7, ModerationStatus.PENDING));
            locationRepository.save(location("V1-Approved", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("V2-Pending", vendorPersistenceMapper.toDomain(otherVendor,cityEntity), city, 4.2, 9.7, ModerationStatus.PENDING));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .vendorId(vendor.getId())
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("V1-Pending");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Sorting (Criteria path)
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Sorting (Criteria path)")
    class SortingTests {

        @Test
        @DisplayName("search() sorts by name ascending")
        void search_sortsByNameAscending() {
            locationRepository.save(location("Zebra", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Apple", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Mango", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }

        @Test
        @DisplayName("search() sorts by name descending")
        void search_sortsByNameDescending() {
            locationRepository.save(location("Zebra", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Apple", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));
            locationRepository.save(location("Mango", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.DESC)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Zebra", "Mango", "Apple");
        }

        @Test
        @DisplayName("search() sorts by createdAt descending")
        void search_sortsByCreatedAtDescending() {
            DistributionLocation first = locationRepository.save(
                    location("First", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED));
            sleepMillis(5);
            DistributionLocation second = locationRepository.save(
                    location("Second", vendor, city, 4.1, 9.7, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("createdAt", Sort.Direction.DESC)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(DistributionLocation::getId)
                    .containsExactly(second.getId(), first.getId());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Proximity path
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Proximity path")
    class ProximityTests {

        // Douala is roughly 4.05 / 9.70.
        private static final double CENTER_LAT = 4.05;
        private static final double CENTER_LNG = 9.70;

        @Test
        @DisplayName("inside-radius location is returned")
        void insideRadius_isReturned() {
            locationRepository.save(location("Near", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("Far", vendor, city, 40.7128, -74.0060, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(CENTER_LAT, CENTER_LNG, 5))
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Near");
        }

        @Test
        @DisplayName("outside-radius location is excluded")
        void outsideRadius_isExcluded() {
            locationRepository.save(location("Far", vendor, city, 40.7128, -74.0060, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(CENTER_LAT, CENTER_LNG, 5))
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).isEmpty();
        }

        @Test
        @DisplayName("proximity path sorts by default by name ascending")
        void proximityPath_sortsByNameAscending() {
            locationRepository.save(location("Zebra", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("Apple", vendor, city, 4.052, 9.702, ModerationStatus.APPROVED));
            locationRepository.save(location("Mango", vendor, city, 4.053, 9.703, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(4.05, 9.70, 5))
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(DistributionLocation::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }


        @Test
        @DisplayName("empty cityIds disables the city filter on the proximity path")
        void proximityPath_emptyCityIdsDisablesFilter() {
            CityEntity otherCity = seedCity("Yaoundé", "Centre", "CM");
            locationRepository.save(location("InDouala", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("InYaounde", vendor, cityPersistenceMapper.toDomain(otherCity), 4.052, 9.702, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(4.05, 9.70, 500))
                    .cityIds(List.of())
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
        }

        @Test
        @DisplayName("non-empty cityIds filters on the proximity path")
        void proximityPath_nonEmptyCityIdsFilters() {
            CityEntity otherCity = seedCity("Yaoundé", "Centre", "CM");
            locationRepository.save(location("InDouala", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("InYaounde", vendor, cityPersistenceMapper.toDomain(otherCity), 4.052, 9.702, ModerationStatus.APPROVED));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(4.05, 9.70, 500))
                    .cityIds(List.of(city.getId()))
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("InDouala");
        }

        @Test
        @DisplayName("proximity path filters by moderationStatus")
        void proximityPath_filtersByModerationStatus() {
            locationRepository.save(location("Approved", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("Pending", vendor, city, 4.052, 9.702, ModerationStatus.PENDING));

            DistributionLocationSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .locationProximity(LocationProximity.of(4.05, 9.70, 5))
                    .moderationStatus(ModerationStatus.PENDING)
                    .build();

            DataPage<DistributionLocation> page = locationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Pending");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Dedicated JPA methods
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Dedicated JPA methods")
    class DedicatedMethodTests {

        @Test
        @DisplayName("findNearbyByVendorId() returns only that vendor's near rows")
        void findNearbyByVendorId_returnsOnlyThatVendor() {
            VendorEntity otherVendor = seedVendor("Vendor Two", "vendor2@test.com", city.getId());
            locationRepository.save(location("NearV1", vendor, city, 4.051, 9.701, ModerationStatus.APPROVED));
            locationRepository.save(location("NearV2", vendorPersistenceMapper.toDomain(otherVendor, cityEntity), city, 4.052, 9.702, ModerationStatus.APPROVED));

            List<DistributionLocation> result = locationRepository
                    .findNearbyByVendorId(vendor.getId(), 4.05, 9.70, 5);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("NearV1");
        }

        @Test
        @DisplayName("findByModerationStatus() returns rows in createdAt ASC order")
        void findByModerationStatus_returnsInCreatedAtAscOrder() {
            DistributionLocation first = locationRepository.save(
                    location("First", vendor, city, 4.0, 9.7, ModerationStatus.PENDING));
            sleepMillis(5);
            DistributionLocation second = locationRepository.save(
                    location("Second", vendor, city, 4.1, 9.7, ModerationStatus.PENDING));
            locationRepository.save(location("Approved", vendor, city, 4.2, 9.7, ModerationStatus.APPROVED));

            List<DistributionLocation> pending =
                    locationRepository.findByModerationStatus(ModerationStatus.PENDING);

            assertThat(pending)
                    .extracting(DistributionLocation::getId)
                    .containsExactly(first.getId(), second.getId());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Error paths
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Error paths")
    class ErrorPathTests {

        @Test
        @DisplayName("a missing vendor row throws ResourceNotFoundException")
        void missingVendor_throws() {
            Vendor vendor = Vendor.builder()
                    .id(UUID.randomUUID())
                    .businessName("The vendor")
                    .ownerName("Owner")
                    .userId(UUID.randomUUID())
                    .address("1 Main St")
                    .city(city)
                    .email("test@test.com")
                    .phone("+237600000000")
                    .subscriptionTier(SubscriptionTier.FREE)
                    .ratingAvg(BigDecimal.ZERO)
                    .totalRatings(0)
                    .state(VendorState.pending())
                    .deliveryRadius(10)
                    .build();

            assertThatThrownBy(() -> locationRepository.save(
                    location("OrphanVendor", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED)))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Vendor not found");
        }

        @Test
        @DisplayName("a missing city row throws ResourceNotFoundException")
        void missingCity_throws() {
            City city = City.builder()
                    .id(UUID.randomUUID())
                    .name("The city")
                    .region("Region")
                    .countryCode("CM")
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            assertThatThrownBy(() -> locationRepository.save(
                    location("OrphanCity", vendor, city, 4.0, 9.7, ModerationStatus.APPROVED)))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}