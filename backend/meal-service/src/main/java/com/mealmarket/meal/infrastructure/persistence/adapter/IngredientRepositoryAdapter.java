package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.criteria.IngredientSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.IngredientEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.IngredientPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.IngredientJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.IngredientSpecification;
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
public class IngredientRepositoryAdapter implements IngredientRepository {

    private final IngredientJpaRepository jpaRepository;
    private final IngredientPersistenceMapper mapper;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public Ingredient save(Ingredient ingredient) {
        IngredientEntity entity = mapper.toEntity(ingredient);
        IngredientEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Ingredient> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public void delete(Ingredient ingredient) {
        jpaRepository.deleteById(ingredient.getId());
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Override
    public Optional<Ingredient> findByName(String name) {
        return jpaRepository.findByName(name).map(mapper::toDomain);
    }

    @Override
    public boolean existsByName(String name) {
        return jpaRepository.existsByName(name);
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Ingredient> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Moderation Queue
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Ingredient> findByModerationStatus(ModerationStatus status) {
        return jpaRepository.findByModerationStatusOrderByCreatedAtAsc(status).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByModerationStatus(ModerationStatus status) {
        return jpaRepository.countByModerationStatus(status);
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<Ingredient> search(IngredientSearchRequest request) {
        Specification<IngredientEntity> spec = IngredientSpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<IngredientEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    @Override
    public List<Ingredient> findByModerationStatusAndIsAllergen(ModerationStatus status, boolean isAllergen){
        return jpaRepository.findByModerationStatusAndIsAllergen(status,isAllergen).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }
    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Override
    public long count() {
        return jpaRepository.count();
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DataPage<Ingredient> toDataPage(Page<IngredientEntity> page) {
        List<Ingredient> content = page.getContent().stream()
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