package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.common.pagination.Sort;
import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.domain.repository.CityRepository;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CityRepositoryAdapter (integration)")
class CityRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    @Autowired private CityRepository cityRepository;
    @Autowired private CityJpaRepository cityJpaRepository;

    @BeforeEach
    void cleanUp() {
        cityJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private City city(String name, String region, String countryCode) {
        return City.create(name, region, countryCode);
    }

    /**
     * CityEntity has no @CreationTimestamp; seed directly so the row
     * is valid for the NOT NULL created_at / updated_at columns.
     */
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

    private CitySearchRequest.Builder requestBuilder() {
        return CitySearchRequest.builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("CRUD")
    class CrudTests {

        @Test
        @DisplayName("save() assigns a random id when none is given")
        void save_assignsRandomId() {
            City saved = cityRepository.save(city("Douala", "Littoral", "CM"));

            assertThat(saved.getId()).isNotNull();
            assertThat(cityJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("save() sets createdAt and updatedAt")
        void save_setsTimestamps() {
            City saved = cityRepository.save(city("Douala", "Littoral", "CM"));

            CityEntity entity = cityJpaRepository.findById(saved.getId()).orElseThrow();
            assertThat(entity.getCreatedAt()).isNotNull();
            assertThat(entity.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("findById() returns the persisted city")
        void findById_returnsPersistedCity() {
            CityEntity seeded = seedCity("Douala", "Littoral", "CM");

            Optional<City> found = cityRepository.findById(seeded.getId());

            assertThat(found).isPresent();
            assertThat(found.get().getName()).isEqualTo("Douala");
        }

        @Test
        @DisplayName("findById() returns empty for an unknown id")
        void findById_returnsEmptyForUnknownId() {
            assertThat(cityRepository.findById(UUID.randomUUID())).isEmpty();
        }

        @Test
        @DisplayName("deleteById() removes the row")
        void deleteById_removesRow() {
            CityEntity seeded = seedCity("Douala", "Littoral", "CM");

            cityRepository.deleteById(seeded.getId());

            assertThat(cityJpaRepository.findById(seeded.getId())).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Reads
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Reads")
    class ReadTests {

        @Test
        @DisplayName("findAll() returns every city sorted by name")
        void findAll_returnsSortedByName() {
            seedCity("Zebra", "R1", "CM");
            seedCity("Apple", "R2", "CM");
            seedCity("Mango", "R3", "CM");

            List<City> all = cityRepository.findAll();

            assertThat(all)
                    .extracting(City::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }

        @Test
        @DisplayName("findAll() returns empty when there are no rows")
        void findAll_returnsEmpty() {
            assertThat(cityRepository.findAll()).isEmpty();
        }

        @Test
        @DisplayName("search() filters by name")
        void search_filtersByName() {
            seedCity("Douala", "Littoral", "CM");
            seedCity("Yaoundé", "Centre", "CM");
            seedCity("Lyon", "Rhône", "FR");

            CitySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .keyword("Douala")
                    .build();

            DataPage<City> page = cityRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Douala");
        }

        @Test
        @DisplayName("search() filters by region")
        void search_filtersByRegion() {
            seedCity("Douala", "Littoral", "CM");
            seedCity("Yaoundé", "Centre", "CM");
            seedCity("Bafoussam", "Ouest", "CM");

            CitySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .region("Littoral")
                    .build();

            DataPage<City> page = cityRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getName()).isEqualTo("Douala");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Sorting
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Sorting")
    class SortingTests {

        @Test
        @DisplayName("search() sorts by name ascending")
        void search_sortsByNameAscending() {
            seedCity("Zebra", "R", "CM");
            seedCity("Apple", "R", "CM");
            seedCity("Mango", "R", "CM");

            CitySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<City> page = cityRepository.search(request);

            assertThat(page.getContent())
                    .extracting(City::getName)
                    .containsExactly("Apple", "Mango", "Zebra");
        }

        @Test
        @DisplayName("search() sorts by name descending")
        void search_sortsByNameDescending() {
            seedCity("Zebra", "R", "CM");
            seedCity("Apple", "R", "CM");
            seedCity("Mango", "R", "CM");

            CitySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("name", Sort.Direction.DESC)
                    .build();

            DataPage<City> page = cityRepository.search(request);

            assertThat(page.getContent())
                    .extracting(City::getName)
                    .containsExactly("Zebra", "Mango", "Apple");
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Uniqueness")
    class UniquenessTests {

        @Test
        @DisplayName("existsByNameAndCountryCode() is true for a duplicate")
        void existsByNameAndCountryCode_trueForDuplicate() {
            seedCity("Douala", "Littoral", "CM");

            assertThat(cityRepository.existsByNameAndCountryCode("Douala", "CM")).isTrue();
        }

        @Test
        @DisplayName("existsByNameAndCountryCode() is case-insensitive on the name")
        void existsByNameAndCountryCode_caseInsensitiveName() {
            seedCity("Douala", "Littoral", "CM");

            assertThat(cityRepository.existsByNameAndCountryCode("DOUALA", "CM")).isTrue();
        }

        @Test
        @DisplayName("existsByNameAndCountryCode() is false for a different country")
        void existsByNameAndCountryCode_falseForDifferentCountry() {
            seedCity("Douala", "Littoral", "CM");

            assertThat(cityRepository.existsByNameAndCountryCode("Douala", "FR")).isFalse();
        }

        @Test
        @DisplayName("existsByNameAndCountryCode() is false for a miss")
        void existsByNameAndCountryCode_falseForMiss() {
            assertThat(cityRepository.existsByNameAndCountryCode("Nowhere", "CM")).isFalse();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Pagination
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Pagination")
    class PaginationTests {

        @Test
        @DisplayName("search() returns the requested page slice with metadata")
        void search_returnsRequestedSlice() {
            for (int i = 1; i <= 5; i++) {
                seedCity("City " + i, "R", "CM");
            }

            CitySearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(1, 2))
                    .sortBy("name", Sort.Direction.ASC)
                    .build();

            DataPage<City> page = cityRepository.search(request);

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getContent())
                    .extracting(City::getName)
                    .containsExactly("City 3", "City 4");
            assertThat(page.getTotalElements()).isEqualTo(5);
            assertThat(page.getTotalPages()).isEqualTo(3);
            assertThat(page.isFirst()).isFalse();
            assertThat(page.isLast()).isFalse();
        }
    }
}