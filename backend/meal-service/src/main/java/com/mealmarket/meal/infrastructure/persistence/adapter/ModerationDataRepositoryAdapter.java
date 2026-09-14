package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.domain.model.ModerationData;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.repository.ModerationDataRepository;
import com.mealmarket.meal.domain.repository.criteria.ModerationDataSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.ModerationDataEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.ModerationDataPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.ModerationDataJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.ModerationDataSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ModerationDataRepositoryAdapter implements ModerationDataRepository {

    private final ModerationDataJpaRepository jpaRepository;
    private final ModerationDataPersistenceMapper mapper;

    // ═══════════════════════════════════════════════════════════
    //  Append
    // ═══════════════════════════════════════════════════════════

    @Override
    public ModerationData save(ModerationData data) {
        ModerationDataEntity entity = mapper.toEntity(data);
        ModerationDataEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<ModerationData> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    // ═══════════════════════════════════════════════════════════
    //  Target History
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<ModerationData> findByTarget(ModerationTargetType targetType, UUID targetId) {
        return jpaRepository
                .findByTargetTypeAndTargetIdOrderByPerformedAtDesc(targetType, targetId)
                .stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public DataPage<ModerationData> findByTarget(
            ModerationTargetType targetType,
            UUID targetId,
            PageRequest pageRequest
    ) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(),
                pageRequest.getSize()
        );
        Page<ModerationDataEntity> page = jpaRepository
                .findByTargetTypeAndTargetIdOrderByPerformedAtDesc(targetType, targetId, pageable);
        return toDataPage(page);
    }

    @Override
    public Optional<ModerationData> findLatestByTarget(
            ModerationTargetType targetType,
            UUID targetId
    ) {
        return jpaRepository
                .findFirstByTargetTypeAndTargetIdOrderByPerformedAtDesc(targetType, targetId)
                .map(mapper::toDomain);
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<ModerationData> search(ModerationDataSearchRequest request) {
        Specification<ModerationDataEntity> spec = ModerationDataSpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<ModerationDataEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Override
    public long countByTargetTypeAndToStatus(
            ModerationTargetType targetType,
            ModerationStatus toStatus
    ) {
        return jpaRepository.countByTargetTypeAndToStatus(targetType, toStatus);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DataPage<ModerationData> toDataPage(Page<ModerationDataEntity> page) {
        List<ModerationData> content = page.getContent().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
        return new DataPage<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }
}