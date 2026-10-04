package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.domain.model.*;
import com.mealmarket.meal.domain.repository.CityRepository;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.criteria.DistributionLocationSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for {@link DistributionLocationRepositoryAdapter}.
 *
 * <p>All {@link DistributionLocation} instances are built through the
 * domain factory methods ({@code create}, {@code withModerationStatus},
 * {@code withUpdatedDetails}) — never through the raw builder. This way the
 * tests also exercise the domain invariants (default PENDING, default radius,
 * non-null timestamps).</p>
 */
@DisplayName("DistributionLocationRepositoryAdapter (integration)")
class DistributionLocationRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    private static final double YAOUNDE_LAT = 3.8480;
    private static final double YAOUNDE_LNG = 11.5021;
    private static final double DOUALA_LAT = 4.0511;
    private static final double DOUALA_LNG = 9.7679;
    private City yaounde;

    @Autowired
    private DistributionLocationRepository locationRepository;

    @Autowired
    private DistributionLocationJpaRepository locationJpaRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorJpaRepository vendorJpaRepository;

    @Autowired
    private CityJpaRepository cityJpaRepository;

    @Autowired
    private CityRepository cityRepository;

    @BeforeEach
    void cleanUp() {
        // FK order: locations first, then vendors.
        locationJpaRepository.deleteAll();
        vendorJpaRepository.deleteAll();
        cityJpaRepository.deleteAll();
        yaounde = persistCity("Yaoundé","Centre","CM");
    }

    // ------------------------------------------------------------------
    // Helpers — all go through the domain API
    // ------------------------------------------------------------------

    private Vendor persistVendor(String businessName, String email) {
        return vendorRepository.save(Vendor.builder()
                .userId(UUID.randomUUID())
                .businessName(businessName)
                .city(yaounde)
                .ownerName("owner")
                .description("Description for " + businessName)
                .address("123 Main Street, Yaoundé")
                .email(email)
                .phone("+237612345678")
                .state(VendorState.active(ADMIN_ID))
                .build());
    }

    private City persistCity(String name, String region, String countryCode) {
        return cityRepository.save(City.create(name, region,countryCode));
    }

    /** Factory-built location — always starts as PENDING with radius 10. */
    private DistributionLocation newPendingLocation(
            Vendor vendor,
            String name,
            double lat,
            double lng
    ) {
        return DistributionLocation.create(
                vendor,
                name,
                yaounde,
                "Address for " + name,
                "+237699999999",
                lat,
                lng,
                10
        );
    }

    /** Factory-built location moved to a specific status via the domain API. */
    private DistributionLocation newLocationInStatus(
            Vendor vendor,
            String name,
            double lat,
            double lng,
            ModerationStatus status
    ) {
        DistributionLocation pending = newPendingLocation(vendor, name, lat, lng);
        return status == ModerationStatus.PENDING
                ? pending
                : pending.withModerationStatus(status);
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. save() — round-trip through the domain factory
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("save() persists a location created via the domain factory")
    void save_persistsLocationCreatedViaFactory() {
        // Given
        final Vendor vendor = persistVendor("Delicious Bites", "vendor@db.com");
        final DistributionLocation location = newPendingLocation(
                vendor, "Main Branch", YAOUNDE_LAT, YAOUNDE_LNG
        );

        // Sanity check on the factory
        assertThat(location.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(location.getDeliveryRadius()).isEqualTo(10);

        // When
        final DistributionLocation saved = locationRepository.save(location);

        // Then
        assertThat(saved).isNotNull();
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Main Branch");
        assertThat(saved.getModerationStatus()).isEqualTo(ModerationStatus.PENDING);
        assertThat(locationJpaRepository.count()).isEqualTo(1);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. findById() — vendor assembly
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findById() returns the location with the Vendor assembled")
    void findById_returnsLocationWithVendorAssembled() {
        // Given — create, persist, then transition via the domain API
        final Vendor vendor = persistVendor("Delicious Bites", "vendor@db.com");
        final DistributionLocation approved = newPendingLocation(
                vendor, "Main Branch", YAOUNDE_LAT, YAOUNDE_LNG
        ).withModerationStatus(ModerationStatus.APPROVED);

        final DistributionLocation saved = locationRepository.save(approved);

        // When
        final Optional<DistributionLocation> found = locationRepository.findById(saved.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getVendor()).isNotNull();
        assertThat(found.get().getVendor().getId()).isEqualTo(vendor.getId());
        assertThat(found.get().getVendor().getBusinessName()).isEqualTo("Delicious Bites");
        assertThat(found.get().getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. existsByVendorIdAndName() — uniqueness per vendor
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("existsByVendorIdAndName() is scoped to the vendor")
    void existsByVendorIdAndName_isScopedToVendor() {
        // Given — two vendors, same location name
        final Vendor vendorA = persistVendor("Vendor A", "a@db.com");
        final Vendor vendorB = persistVendor("Vendor B", "b@db.com");

        locationRepository.save(newLocationInStatus(
                vendorA, "Main Branch", YAOUNDE_LAT, YAOUNDE_LNG,
                ModerationStatus.APPROVED
        ));

        // When / Then — exists under A, not under B
        assertThat(locationRepository.existsByVendorIdAndName(vendorA.getId(), "Main Branch"))
                .isTrue();
        assertThat(locationRepository.existsByVendorIdAndName(vendorB.getId(), "Main Branch"))
                .isFalse();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. findByVendorId() — scoping
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findByVendorId() returns only that vendor's locations")
    void findByVendorId_returnsOnlyThatVendorsLocations() {
        // Given
        final Vendor vendorA = persistVendor("Vendor A", "a@db.com");
        final Vendor vendorB = persistVendor("Vendor B", "b@db.com");

        locationRepository.save(newLocationInStatus(
                vendorA, "A - Main", YAOUNDE_LAT, YAOUNDE_LNG,
                ModerationStatus.APPROVED));
        locationRepository.save(newPendingLocation(
                vendorA, "A - Annex", YAOUNDE_LAT, YAOUNDE_LNG));
        locationRepository.save(newLocationInStatus(
                vendorB, "B - Main", DOUALA_LAT, DOUALA_LNG,
                ModerationStatus.APPROVED));

        // When
        final List<DistributionLocation> aLocations =
                locationRepository.findByVendorId(vendorA.getId());

        // Then
        assertThat(aLocations).hasSize(2);
        assertThat(aLocations)
                .extracting(DistributionLocation::getName)
                .containsExactlyInAnyOrder("A - Main", "A - Annex");
        assertThat(locationRepository.countByVendorId(vendorA.getId())).isEqualTo(2);
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. findByModerationStatus() — admin queue
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findByModerationStatus() returns only matching locations across vendors")
    void findByModerationStatus_returnsMatchingAcrossVendors() {
        // Given
        final Vendor vendorA = persistVendor("Vendor A", "a@db.com");
        final Vendor vendorB = persistVendor("Vendor B", "b@db.com");

        locationRepository.save(newPendingLocation(
                vendorA, "A1", YAOUNDE_LAT, YAOUNDE_LNG));
        locationRepository.save(newLocationInStatus(
                vendorA, "A2", YAOUNDE_LAT, YAOUNDE_LNG,
                ModerationStatus.APPROVED));
        locationRepository.save(newPendingLocation(
                vendorB, "B1", DOUALA_LAT, DOUALA_LNG));

        // When
        final List<DistributionLocation> pending =
                locationRepository.findByModerationStatus(ModerationStatus.PENDING);

        // Then
        assertThat(pending).hasSize(2);
        assertThat(pending)
                .extracting(DistributionLocation::getName)
                .containsExactlyInAnyOrder("A1", "B1");
        assertThat(pending)
                .extracting(DistributionLocation::getModerationStatus)
                .containsOnly(ModerationStatus.PENDING);
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. search() — pagination
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with pagination respects the page size")
    void search_withPagination_respectsPageSize() {
        // Given
        final Vendor vendor = persistVendor("Delicious Bites", "vendor@db.com");
        for (int i = 1; i <= 5; i++) {
            locationRepository.save(newLocationInStatus(
                    vendor, "Branch " + i, YAOUNDE_LAT, YAOUNDE_LNG,
                    ModerationStatus.APPROVED));
        }

        final DistributionLocationSearchRequest request =
                DistributionLocationSearchRequest.builder()
                        .vendorId(vendor.getId())
                        .pageRequest(PageRequest.of(0, 2))
                        .build();

        // When
        final DataPage<DistributionLocation> page = locationRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(5);
        assertThat(page.getPage()).isEqualTo(0);
        assertThat(page.getSize()).isEqualTo(2);
    }

    // ══════════════════════════════════════════════════════════════════
    // 7. findNearbyByVendorId() — proximity
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findNearbyByVendorId() returns only locations within the radius")
    void findNearbyByVendorId_returnsOnlyLocationsWithinRadius() {
        // Given
        final Vendor vendor = persistVendor("Delicious Bites", "vendor@db.com");

        locationRepository.save(newLocationInStatus(
                vendor, "Near Yaoundé",
                YAOUNDE_LAT + 0.01, YAOUNDE_LNG + 0.01,
                ModerationStatus.APPROVED));
        locationRepository.save(newLocationInStatus(
                vendor, "Douala",
                DOUALA_LAT, DOUALA_LNG,
                ModerationStatus.APPROVED));

        // When — 20 km around Yaoundé center
        final List<DistributionLocation> nearby = locationRepository.findNearbyByVendorId(
                vendor.getId(), YAOUNDE_LAT, YAOUNDE_LNG, 20
        );

        // Then
        assertThat(nearby).hasSize(1);
        assertThat(nearby.get(0).getName()).isEqualTo("Near Yaoundé");
    }

    // ══════════════════════════════════════════════════════════════════
    // 8. withUpdatedDetails() persists through the adapter
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("withUpdatedDetails() produces a location that saves correctly")
    void withUpdatedDetails_persistsThroughAdapter() {
        // Given — factory-built and saved
        final Vendor vendor = persistVendor("Delicious Bites", "vendor@db.com");
        final DistributionLocation saved = locationRepository.save(
                newLocationInStatus(vendor, "Old Name",
                        YAOUNDE_LAT, YAOUNDE_LNG, ModerationStatus.APPROVED)
        );

        // When — domain-level update via the copy helper
        final DistributionLocation updated = saved.withUpdatedDetails(
                "New Name",
                yaounde,
                "New Address",
                "+237611111111",
                YAOUNDE_LAT + 0.01,
                YAOUNDE_LNG + 0.01,
                25
        );
        final DistributionLocation resaved = locationRepository.save(updated);

        // Then
        assertThat(resaved.getId()).isEqualTo(saved.getId());
        assertThat(resaved.getName()).isEqualTo("New Name");
        assertThat(resaved.getAddress()).isEqualTo("New Address");
        assertThat(resaved.getDeliveryRadius()).isEqualTo(25);

        final Optional<DistributionLocation> reloaded =
                locationRepository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        assertThat(reloaded.get().getName()).isEqualTo("New Name");
        assertThat(reloaded.get().getDeliveryRadius()).isEqualTo(25);
    }

}