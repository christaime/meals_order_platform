package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.common.pagination.PageRequest;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.domain.repository.VendorStatusHistoryRepository;
import com.mealmarket.meal.domain.repository.criteria.VendorStatusHistorySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorStatusHistoryEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorStatusHistoryPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorStatusHistoryJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.VendorStatusHistorySpecification;
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
public class VendorStatusHistoryRepositoryAdapter implements VendorStatusHistoryRepository {

    private final VendorStatusHistoryJpaRepository jpaRepository;
    private final VendorStatusHistoryPersistenceMapper mapper;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public VendorStateChange save(VendorStateChange change) {
        VendorStatusHistoryEntity entity = mapper.toEntity(change);
        VendorStatusHistoryEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<VendorStateChange> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    // ═══════════════════════════════════════════════════════════
    //  Vendor History Queries
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<VendorStateChange> findByVendorId(UUID vendorId) {
        return jpaRepository.findByVendorIdOrderByChangedAtDesc(vendorId).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public DataPage<VendorStateChange> findByVendorId(UUID vendorId, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(),
                pageRequest.getSize()
        );
        Page<VendorStatusHistoryEntity> page =
                jpaRepository.findByVendorIdOrderByChangedAtDesc(vendorId, pageable);
        return toDataPage(page);
    }

    @Override
    public Optional<VendorStateChange> findLatestByVendorId(UUID vendorId) {
        return jpaRepository.findFirstByVendorIdOrderByChangedAtDesc(vendorId)
                .map(mapper::toDomain);
    }

    // ═══════════════════════════════════════════════════════════
    //  Trust & Reputation
    // ═══════════════════════════════════════════════════════════

    @Override
    public long countByVendorIdAndToStatus(UUID vendorId, VendorState.VendorStatus toStatus) {
        return jpaRepository.countByVendorIdAndToStatus(vendorId, toStatus);
    }

    @Override
    public long countByToStatus(VendorState.VendorStatus toStatus) {
        return jpaRepository.countByToStatus(toStatus);
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<VendorStateChange> search(VendorStatusHistorySearchRequest request) {
        Specification<VendorStatusHistoryEntity> spec =
                VendorStatusHistorySpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<VendorStatusHistoryEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DataPage<VendorStateChange> toDataPage(Page<VendorStatusHistoryEntity> page) {
        List<VendorStateChange> content = page.getContent().stream()
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