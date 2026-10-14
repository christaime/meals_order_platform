package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.AbstractIntegrationTest;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.common.pagination.Sort;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.ModerationDataSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.repository.ModerationDataJpaRepository;
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

@DisplayName("ModerationDataRepositoryAdapter (integration)")
class ModerationDataRepositoryAdapterIntegrationTest extends AbstractIntegrationTest {

    private static final UUID ADMIN_ID =
            UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID TARGET_ID =
            UUID.fromString("66666666-6666-6666-6666-666666666666");

    @Autowired private ModerationDataRepository moderationRepository;
    @Autowired private ModerationDataJpaRepository moderationJpaRepository;

    @BeforeEach
    void cleanUp() {
        moderationJpaRepository.deleteAll();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private ModerationData moderation(
            ModerationTargetType targetType,
            UUID targetId,
            ModerationStatus from,
            ModerationStatus to) {
        return ModerationData.builder()
                .targetType(targetType)
                .targetId(targetId)
                .fromStatus(from)
                .toStatus(to)
                .reason("Reason")
                .performedByType(UserType.ADMIN)
                .performedById(ADMIN_ID)
                .performedAt(Instant.now())
                .build();
    }

    private ModerationDataSearchRequest.Builder requestBuilder() {
        return ModerationDataSearchRequest.builder();
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
        @DisplayName("save() persists a new row and returns it with an id")
        void save_persistsNewRow() {
            ModerationData saved = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));

            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getToStatus()).isEqualTo(ModerationStatus.APPROVED);
            assertThat(moderationJpaRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("findById() returns the persisted row")
        void findById_returnsPersistedRow() {
            ModerationData saved = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));

            Optional<ModerationData> found = moderationRepository.findById(saved.getId());

            assertThat(found).isPresent();
            assertThat(found.get().getTargetId()).isEqualTo(TARGET_ID);
        }

        @Test
        @DisplayName("findById() returns empty for an unknown id")
        void findById_returnsEmptyForUnknownId() {
            assertThat(moderationRepository.findById(UUID.randomUUID())).isEmpty();
        }

        @Test
        @DisplayName("save() appends a second row rather than updating the first")
        void save_appendsRow() {
            ModerationData first = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));
            ModerationData second = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.APPROVED, ModerationStatus.REJECTED));

            assertThat(first.getId()).isNotEqualTo(second.getId());
            assertThat(moderationJpaRepository.count()).isEqualTo(2);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Target history
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Target history")
    class TargetHistoryTests {

        @Test
        @DisplayName("findByTarget() returns rows in performedAt DESC order")
        void findByTarget_returnsInPerformedAtDescOrder() {
            ModerationData first = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));
            sleepMillis(5);
            ModerationData second = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.APPROVED, ModerationStatus.REJECTED));

            List<ModerationData> history = moderationRepository
                    .findByTarget(ModerationTargetType.MEAL, TARGET_ID);

            assertThat(history)
                    .extracting(ModerationData::getId)
                    .containsExactly(second.getId(), first.getId());
        }

        @Test
        @DisplayName("findByTarget() excludes rows for a different target")
        void findByTarget_excludesOtherTargets() {
            UUID otherTarget = UUID.randomUUID();
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.MEAL, otherTarget,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));

            List<ModerationData> history = moderationRepository
                    .findByTarget(ModerationTargetType.MEAL, TARGET_ID);

            assertThat(history).hasSize(1);
            assertThat(history.get(0).getTargetId()).isEqualTo(TARGET_ID);
        }

        @Test
        @DisplayName("findByTarget() with pagination returns the right slice")
        void findByTargetWithPagination_returnsSlice() {
            for (int i = 1; i <= 5; i++) {
                moderationRepository.save(moderation(
                        ModerationTargetType.MEAL, TARGET_ID,
                        ModerationStatus.PENDING, ModerationStatus.APPROVED));
                sleepMillis(3);
            }

            DataPage<ModerationData> page = moderationRepository.findByTarget(
                    ModerationTargetType.MEAL, TARGET_ID, PageRequest.of(1, 2));

            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getTotalElements()).isEqualTo(5);
            assertThat(page.getTotalPages()).isEqualTo(3);
        }

        @Test
        @DisplayName("findLatestByTarget() returns the most recent row")
        void findLatestByTarget_returnsMostRecent() {
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            sleepMillis(5);
            ModerationData latest = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.APPROVED, ModerationStatus.REJECTED));

            Optional<ModerationData> found = moderationRepository
                    .findLatestByTarget(ModerationTargetType.MEAL, TARGET_ID);

            assertThat(found).isPresent();
            assertThat(found.get().getId()).isEqualTo(latest.getId());
        }

        @Test
        @DisplayName("findLatestByTarget() returns empty for an unknown target")
        void findLatestByTarget_returnsEmptyForUnknownTarget() {
            assertThat(moderationRepository.findLatestByTarget(
                    ModerationTargetType.MEAL, UUID.randomUUID())).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Search")
    class SearchTests {

        @Test
        @DisplayName("search() filters by targetType")
        void search_filtersByTargetType() {
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.INGREDIENT, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));

            ModerationDataSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .targetType(ModerationTargetType.MEAL)
                    .build();

            DataPage<ModerationData> page = moderationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getTargetType())
                    .isEqualTo(ModerationTargetType.MEAL);
        }

        @Test
        @DisplayName("search() filters by targetId")
        void search_filtersByTargetId() {
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.MEAL, UUID.randomUUID(),
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));

            ModerationDataSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .targetId(TARGET_ID)
                    .build();

            DataPage<ModerationData> page = moderationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getTargetId()).isEqualTo(TARGET_ID);
        }

        @Test
        @DisplayName("search() filters by toStatus")
        void search_filtersByToStatus() {
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.APPROVED, ModerationStatus.REJECTED));

            ModerationDataSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .toStatus(ModerationStatus.APPROVED)
                    .build();

            DataPage<ModerationData> page = moderationRepository.search(request);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getToStatus())
                    .isEqualTo(ModerationStatus.APPROVED);
        }

        @Test
        @DisplayName("search() sorts by performedAt descending")
        void search_sortsByPerformedAtDescending() {
            ModerationData first = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));
            sleepMillis(5);
            ModerationData second = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.APPROVED, ModerationStatus.REJECTED));

            ModerationDataSearchRequest request = requestBuilder()
                    .pageRequest(PageRequest.of(0, 20))
                    .sortBy("performedAt", Sort.Direction.DESC)
                    .build();

            DataPage<ModerationData> page = moderationRepository.search(request);

            assertThat(page.getContent())
                    .extracting(ModerationData::getId)
                    .containsExactly(second.getId(), first.getId());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Order-by contract
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Order-by contract")
    class OrderByContractTests {

        @Test
        @DisplayName("findByTarget() with three rows at distinct times pins DESC order")
        void findByTarget_pinsDescOrder() {
            ModerationData first = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.PENDING, ModerationStatus.APPROVED));
            sleepMillis(5);
            ModerationData second = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.APPROVED, ModerationStatus.REJECTED));
            sleepMillis(5);
            ModerationData third = moderationRepository.save(
                    moderation(ModerationTargetType.MEAL, TARGET_ID,
                            ModerationStatus.REJECTED, ModerationStatus.APPROVED));

            List<ModerationData> history = moderationRepository
                    .findByTarget(ModerationTargetType.MEAL, TARGET_ID);

            assertThat(history)
                    .extracting(ModerationData::getId)
                    .containsExactly(third.getId(), second.getId(), first.getId());
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("countByTargetTypeAndToStatus() counts the matching rows")
        void countByTargetTypeAndToStatus_countsMatching() {
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.MEAL, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));
            moderationRepository.save(moderation(ModerationTargetType.INGREDIENT, TARGET_ID,
                    ModerationStatus.PENDING, ModerationStatus.APPROVED));

            long count = moderationRepository.countByTargetTypeAndToStatus(
                    ModerationTargetType.MEAL, ModerationStatus.APPROVED);

            assertThat(count).isEqualTo(2);
        }

        @Test
        @DisplayName("countByTargetTypeAndToStatus() returns 0 for a miss")
        void countByTargetTypeAndToStatus_returnsZeroForMiss() {
            assertThat(moderationRepository.countByTargetTypeAndToStatus(
                    ModerationTargetType.MEAL, ModerationStatus.REJECTED)).isZero();
        }
    }
}