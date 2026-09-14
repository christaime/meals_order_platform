package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.criteria.VendorSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link VendorRepositoryAdapter}.
 *
 * <p>6 tests — mirrors the Category persistence suite. Uses the real
 * Postgres from docker-compose and the real Spring context.</p>
 */
@DisplayName("VendorRepositoryAdapter (integration)")
class VendorRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorJpaRepository vendorJpaRepository;

    @BeforeEach
    void cleanUp() {
        vendorJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Vendor newVendor(String businessName, String email, VendorState state) {
        return Vendor.builder()
                .userId(UUID.randomUUID())
                .businessName(businessName)
                .description("Description for " + businessName)
                .address("123 Main Street, Yaoundé")
                .email(email)
                .phone("+237612345678")
                .state(state)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. save() — round-trip
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("save() persists a Vendor to the database")
    void save_persistsVendorToDatabase() {
        // Given
        final Vendor vendor = newVendor(
                "Delicious Bites",
                "vendor@deliciousbites.com",
                VendorState.active(ADMIN_ID)
        );

        // When
        final Vendor saved = vendorRepository.save(vendor);

        // Then
        assertThat(saved).isNotNull();
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getBusinessName()).isEqualTo("Delicious Bites");
        assertThat(saved.getEmail()).isEqualTo("vendor@deliciousbites.com");
        assertThat(vendorJpaRepository.count()).isEqualTo(1);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. findById() — read back
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("findById() returns the persisted Vendor")
    void findById_returnsPersistedVendor() {
        // Given
        final Vendor saved = vendorRepository.save(newVendor(
                "Delicious Bites",
                "vendor@deliciousbites.com",
                VendorState.active(ADMIN_ID)
        ));

        // When
        final Optional<Vendor> found = vendorRepository.findById(saved.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getBusinessName()).isEqualTo("Delicious Bites");
        assertThat(found.get().isActive()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. existsByEmail() — uniqueness rule
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("existsByEmail() returns true for a duplicate email")
    void existsByEmail_returnsTrueForDuplicate() {
        // Given
        vendorRepository.save(newVendor(
                "Delicious Bites",
                "vendor@deliciousbites.com",
                VendorState.active(ADMIN_ID)
        ));

        // When
        final boolean exists = vendorRepository.existsByEmail("vendor@deliciousbites.com");

        // Then
        assertThat(exists).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. search() — status filter
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with status filter returns only matching vendors")
    void search_byStatus_returnsOnlyMatchingVendors() {
        // Given
        vendorRepository.save(newVendor("Active One", "a1@test.com", VendorState.active(ADMIN_ID)));
        vendorRepository.save(newVendor("Active Two", "a2@test.com", VendorState.active(ADMIN_ID)));
        vendorRepository.save(newVendor("Pending One", "p1@test.com", VendorState.pending()));
        vendorRepository.save(newVendor("Banned One", "b1@test.com", VendorState.banned("Violation", ADMIN_ID)));

        final VendorSearchRequest request = VendorSearchRequest.builder()
                .status(VendorState.VendorStatus.ACTIVE)
                .pageRequest(PageRequest.of(0, 20))
                .build();

        // When
        final DataPage<Vendor> page = vendorRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent())
                .extracting(Vendor::getStatus)
                .containsOnly(VendorState.VendorStatus.ACTIVE);
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. search() — keyword
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with keyword returns matching vendors")
    void search_byKeyword_returnsMatchingVendors() {
        // Given
        vendorRepository.save(newVendor("Delicious Bites", "a@test.com", VendorState.active(ADMIN_ID)));
        vendorRepository.save(newVendor("Mama Africa", "b@test.com", VendorState.active(ADMIN_ID)));
        vendorRepository.save(newVendor("Bites & Co", "c@test.com", VendorState.active(ADMIN_ID)));

        final VendorSearchRequest request = VendorSearchRequest.builder()
                .keyword("bites")
                .pageRequest(PageRequest.of(0, 20))
                .build();

        // When
        final DataPage<Vendor> page = vendorRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent())
                .extracting(Vendor::getBusinessName)
                .containsExactlyInAnyOrder("Delicious Bites", "Bites & Co");
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. search() — pagination
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("search() with pagination respects the page size")
    void search_withPagination_respectsPageSize() {
        // Given — 5 vendors
        for (int i = 1; i <= 5; i++) {
            vendorRepository.save(newVendor(
                    "Vendor " + i,
                    "vendor" + i + "@test.com",
                    VendorState.active(ADMIN_ID)
            ));
        }

        final VendorSearchRequest request = VendorSearchRequest.builder()
                .pageRequest(PageRequest.of(0, 2))
                .build();

        // When
        final DataPage<Vendor> page = vendorRepository.search(request);

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(5);
        assertThat(page.getPage()).isEqualTo(0);
        assertThat(page.getSize()).isEqualTo(2);
    }
}