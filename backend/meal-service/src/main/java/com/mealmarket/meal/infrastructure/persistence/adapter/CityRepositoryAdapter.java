package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.domain.repository.CityRepository;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CityPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.CitySpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CityRepositoryAdapter implements CityRepository {

    private final CityJpaRepository jpaRepository;
    private final CityPersistenceMapper entityMapper;

    @Override
    public Optional<City> findById(UUID id) {
        return jpaRepository.findById(id).map(entityMapper::toDomain);
    }

    @Override
    public DataPage<City> search(CitySearchRequest request) {
        var pageable = org.springframework.data.domain.PageRequest.of(
                request.getPage(),
                request.getSize(),
                resolveSort(request)
        );
        var page = jpaRepository.findAll(CitySpecifications.from(request), pageable);
        return new DataPage<>(
                page.getContent().stream().map(entityMapper::toDomain).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }

    @Override
    public List<City> findAll() {
        return jpaRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(entityMapper::toDomain)
                .toList();
    }

    @Override
    public City save(City city) {
        CityEntity entity = entityMapper.toEntity(city);
        if (entity.getId() == null) {
            entity.setId(UUID.randomUUID());
        }
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(java.time.Instant.now());
        }
        entity.setUpdatedAt(java.time.Instant.now());
        return entityMapper.toDomain(jpaRepository.save(entity));
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public boolean existsByNameAndCountryCode(String name, String countryCode) {
        return jpaRepository.existsByNameIgnoreCaseAndCountryCode(name, countryCode);
    }

    // ═══════════════════════════════════════════════════════════
    //  Sort resolution
    // ═══════════════════════════════════════════════════════════

    private Sort resolveSort(CitySearchRequest request) {
        if (!request.hasSort()) {
            return Sort.by("name").ascending();
        }
        // Adapt com.mealmarket.common.pagination.Sort → Spring Sort.
        // Mirrors whatever the Category adapter does.
        var sort = request.getSort();
        var orders = sort.getOrders().stream()
                .map(o -> new Sort.Order(
                        o.getDirection() == com.mealmarket.common.pagination.Sort.Direction.ASC
                                ? Sort.Direction.ASC
                                : Sort.Direction.DESC,
                        o.getProperty()
                ))
                .toList();
        return Sort.by(orders);
    }
}