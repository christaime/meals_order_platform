package com.mealmarket.meal.infrastructure.persistence.repository;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.infrastructure.persistence.entity.ModerationDataEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModerationDataJpaRepository
        extends JpaRepository<ModerationDataEntity, UUID>,
        JpaSpecificationExecutor<ModerationDataEntity> {

    // ─── Target History ───────────────────────────────────────

    List<ModerationDataEntity> findByTargetTypeAndTargetIdOrderByPerformedAtDesc(
            ModerationTargetType targetType,
            UUID targetId
    );

    Page<ModerationDataEntity> findByTargetTypeAndTargetIdOrderByPerformedAtDesc(
            ModerationTargetType targetType,
            UUID targetId,
            Pageable pageable
    );

    Optional<ModerationDataEntity> findFirstByTargetTypeAndTargetIdOrderByPerformedAtDesc(
            ModerationTargetType targetType,
            UUID targetId
    );

    // ─── Statistics ───────────────────────────────────────────

    long countByTargetTypeAndToStatus(ModerationTargetType targetType, ModerationStatus toStatus);
}