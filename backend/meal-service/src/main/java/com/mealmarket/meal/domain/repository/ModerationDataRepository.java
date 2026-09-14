package com.mealmarket.meal.domain.repository;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.repository.criteria.ModerationDataSearchRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for {@link ModerationData} — the append-only audit trail
 * of every moderation action on moderable entities.
 */
public interface ModerationDataRepository {

    // ═══════════════════════════════════════════════════════════
    //  Append (no update, no delete — audit log)
    // ═══════════════════════════════════════════════════════════

    ModerationData save(ModerationData data);

    Optional<ModerationData> findById(UUID id);

    // ═══════════════════════════════════════════════════════════
    //  Target History
    // ═══════════════════════════════════════════════════════════

    /**
     * Full audit trail for a specific target (newest first).
     * Example: all moderation actions on a specific meal.
     */
    List<ModerationData> findByTarget(ModerationTargetType targetType, UUID targetId);

    /**
     * Paginated audit trail for a target.
     */
    DataPage<ModerationData> findByTarget(
            ModerationTargetType targetType,
            UUID targetId,
            com.mealmarket.common.pagination.PageRequest pageRequest
    );

    /**
     * Most recent moderation action on a target.
     */
    Optional<ModerationData> findLatestByTarget(ModerationTargetType targetType, UUID targetId);

    // ═══════════════════════════════════════════════════════════
    //  Search (single entry point for all filters)
    // ═══════════════════════════════════════════════════════════

    DataPage<ModerationData> search(ModerationDataSearchRequest request);

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    /**
     * Count actions by target type and status.
     * Example: how many meals are currently APPROVED?
     */
    long countByTargetTypeAndToStatus(ModerationTargetType targetType, ModerationStatus toStatus);
}