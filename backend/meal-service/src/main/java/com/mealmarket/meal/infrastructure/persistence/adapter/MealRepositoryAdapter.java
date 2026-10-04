package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.MealRepository;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.adapter.utils.SortConverter;
import com.mealmarket.meal.infrastructure.persistence.entity.CityEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.DistributionLocationEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.CategoryPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.DistributionLocationPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.IngredientPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.MealPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.CategoryJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.CityJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.DistributionLocationJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.IngredientJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.MealJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.MealSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MealRepositoryAdapter implements MealRepository {

    private final MealJpaRepository jpaRepository;
    private final MealPersistenceMapper mapper;

    private final VendorJpaRepository vendorJpaRepository;
    private final VendorPersistenceMapper vendorMapper;

    private final CategoryJpaRepository categoryJpaRepository;
    private final CategoryPersistenceMapper categoryMapper;

    private final IngredientJpaRepository ingredientJpaRepository;
    private final IngredientPersistenceMapper ingredientMapper;

    private final DistributionLocationJpaRepository locationJpaRepository;
    private final DistributionLocationPersistenceMapper locationMapper;

    private final CityJpaRepository cityJpaRepository;

    private final MealSpecification mealSpecification;

    // ═══════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════

    @Override
    public Meal save(Meal meal) {
        MealEntity entity = mapper.toEntity(meal);
        MealEntity saved = jpaRepository.save(entity);
        return toFullDomain(saved);
    }

    @Override
    public Optional<Meal> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toShallowDomain);
    }

    @Override
    public Optional<Meal> findByIdWithDetails(UUID id) {
        return jpaRepository.findById(id).map(this::toFullDomain);
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
    public void delete(Meal meal) {
        jpaRepository.deleteById(meal.getId());
    }

    // ═══════════════════════════════════════════════════════════
    //  Uniqueness
    // ═══════════════════════════════════════════════════════════

    @Override
    public boolean existsByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.existsByVendorIdAndNameIgnoreCase(vendorId, name);
    }

    @Override
    public boolean existsByCategoryId(UUID categoryId) {
        return jpaRepository.existsByCategoryId(categoryId);
    }

    @Override
    public boolean existsByIngredientId(UUID ingredientId) {
        return jpaRepository.existsByIngredientId(ingredientId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Vendor-Scoped Queries
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Meal> findByVendorId(UUID vendorId) {
        return jpaRepository.findByVendorId(vendorId).stream()
                .map(this::toShallowDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByVendorId(UUID vendorId) {
        return jpaRepository.countByVendorId(vendorId);
    }

    @Override
    public long countAvailableByVendorId(UUID vendorId) {
        return jpaRepository.countByVendorIdAndIsAvailable(vendorId, Boolean.TRUE);
    }

    // ═══════════════════════════════════════════════════════════
    //  Bulk Lookup
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Meal> findAllById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByIdIn(ids).stream()
                .map(this::toShallowDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Category Queries
    // ═══════════════════════════════════════════════════════════

    /**
     * Filter a meal's category list by {@link CategoryType}.
     * Loads the meal entity, then its categories, and filters in memory.
     */
    @Override
    public List<Category> findCategoriesByMealIdAndType(UUID mealId, CategoryType type) {
        Optional<MealEntity> mealEntity = jpaRepository.findById(mealId);
        if (mealEntity.isEmpty()) {
            return List.of();
        }
        List<UUID> categoryIds = mealEntity.get().getCategoryIds();
        if (categoryIds == null || categoryIds.isEmpty()) {
            return List.of();
        }
        return categoryJpaRepository.findByIdIn(categoryIds).stream()
                .map(categoryMapper::toDomain)
                .filter(c -> c.getType() == type)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════
    @Override
    public DataPage<Meal> search(MealSearchRequest request) {
        Specification<MealEntity> spec = mealSpecification.build(request);

        var springSort = SortConverter.toSpringSort(request.validSortOrders());

        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize(),
                springSort
        );

        Page<MealEntity> page = jpaRepository.findAll(spec, pageable);
        return toDataPage(page, request);
    }

    // ═══════════════════════════════════════════════════════════
    //  Updates
    // ═══════════════════════════════════════════════════════════

    /**
     * Domain signature takes {@code Double}; JPA takes {@code BigDecimal}.
     */
    @Override
    public void updateAverageRating(UUID mealId, Double newRating) {
        java.math.BigDecimal value = newRating != null
                ? java.math.BigDecimal.valueOf(newRating)
                : null;
        jpaRepository.updateAverageRating(mealId, value);
    }

    @Override
    public void incrementTotalRatings(UUID mealId) {
        jpaRepository.incrementTotalRatings(mealId);
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

    /**
     * Shallow — vendor only. No ingredients / locations / categories.
     * Matches the semantics of {@code findById}, {@code findByVendorId},
     * {@code findAllById}.
     */
    private Meal toShallowDomain(MealEntity entity) {
        Vendor vendor = loadMinimalVendor(entity.getVendorId());
        return mapper.toDomain(entity, vendor);
    }

    /**
     * Full — vendor + ingredients + locations + categories.
     * Matches the semantics of {@code findByIdWithDetails}, {@code save},
     * and search results when {@code loadFull} or {@code withCount} is set.
     */
    private Meal toFullDomain(MealEntity entity) {
        Vendor vendor = loadMinimalVendor(entity.getVendorId());

        List<Category> categories = loadCategories(entity.getCategoryIds());
        List<Ingredient> ingredients = loadIngredients(entity.getIngredientIds());
        List<DistributionLocation> locations =
                loadLocationsShallow(entity.getDistributionLocationIds(), vendor);

        Meal shallow = mapper.toDomain(entity, vendor);

        return Meal.builder()
                .id(shallow.getId())
                .vendor(shallow.getVendor())
                .name(shallow.getName())
                .description(shallow.getDescription())
                .price(shallow.getPrice())
                .imageStorageRef(shallow.getImageStorageRef())
                .isAvailable(shallow.getIsAvailable())
                .averageRating(shallow.getAverageRating())
                .totalRatings(shallow.getTotalRatings())
                .prepTimeMinutes(shallow.getPrepTimeMinutes())
                .categories(categories)
                .ingredients(ingredients)
                .distributionLocations(locations)
                .moderationStatus(shallow.getModerationStatus())
                .createdAt(shallow.getCreatedAt())
                .updatedAt(shallow.getUpdatedAt())
                .build();
    }

    /**
     * Minimal domain Vendor (no locations, no categories) to break the
     * meal → vendor → locations → vendor recursion.
     */
    private Vendor loadMinimalVendor(UUID vendorId) {
        VendorEntity vendorEntity = vendorJpaRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + vendorId));

        CityEntity vendorCity = cityJpaRepository.findById(vendorEntity.getCityId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found for vendor: " + vendorEntity.getCityId()));

        return vendorMapper.toMinimalDomain(vendorEntity, vendorCity);
    }

    private List<Category> loadCategories(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return categoryJpaRepository.findByIdIn(ids).stream()
                .map(categoryMapper::toDomain)
                .toList();
    }

    private List<Ingredient> loadIngredients(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ingredientJpaRepository.findByIdIn(ids).stream()
                .map(ingredientMapper::toDomain)
                .toList();
    }

    private List<DistributionLocation> loadLocationsShallow(
            List<UUID> ids,
            Vendor minimalVendor
    ) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        List<DistributionLocationEntity> locationEntities =
                locationJpaRepository.findByIdIn(ids);

        Set<UUID> cityIds = locationEntities.stream()
                .map(DistributionLocationEntity::getCityId)
                .collect(Collectors.toSet());

        Map<UUID, CityEntity> cityById = cityJpaRepository.findAllById(cityIds).stream()
                .collect(Collectors.toMap(CityEntity::getId, Function.identity()));

        return locationEntities.stream()
                .map(loc -> locationMapper.toDomain(
                        loc,
                        minimalVendor,
                        cityById.get(loc.getCityId())
                ))
                .toList();
    }

    private DataPage<Meal> toDataPage(Page<MealEntity> page, MealSearchRequest request) {
        boolean withCount = Boolean.TRUE.equals(request.getWithCount());
        boolean loadFull  = Boolean.TRUE.equals(request.getLoadFull());
        boolean needsFull = withCount || loadFull;

        List<Meal> content = page.getContent().stream()
                .map(entity -> needsFull ? toFullDomain(entity) : toShallowDomain(entity))
                .collect(Collectors.toList());

        return new DataPage<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }
}