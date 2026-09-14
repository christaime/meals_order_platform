package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.CategoryEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CategoryPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.CategorySpecification;
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
public class CategoryRepositoryAdapter implements CategoryRepository {

    private final CategoryJpaRepository jpaRepository;
    private final CategoryPersistenceMapper mapper;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public Category save(Category category) {
        CategoryEntity entity = mapper.toEntity(category);
        CategoryEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Category> findById(UUID id) {
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
    public void delete(Category category) {
        jpaRepository.deleteById(category.getId());
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Override
    public Optional<Category> findByNameAndType(String name, CategoryType type) {
        return jpaRepository.findByNameAndType(name, type).map(mapper::toDomain);
    }

    @Override
    public boolean existsByNameAndType(String name, CategoryType type) {
        return jpaRepository.existsByNameAndType(name, type);
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Category> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<Category> search(CategorySearchRequest request) {
        Specification<CategoryEntity> spec = CategorySpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<CategoryEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page);
    }

    // ═══════════════════════════════════════════════════════════
    //  Statistics
    // ═══════════════════════════════════════════════════════════

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public long countByType(CategoryType type) {
        return jpaRepository.countByType(type);
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private DataPage<Category> toDataPage(Page<CategoryEntity> page) {
        List<Category> content = page.getContent().stream()
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