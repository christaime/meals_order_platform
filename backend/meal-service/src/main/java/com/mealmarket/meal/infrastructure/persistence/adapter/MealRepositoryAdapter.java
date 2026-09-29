package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.model.DistributionLocation;
import com.mealmarket.meal.domain.model.Ingredient;
import com.mealmarket.meal.domain.model.Meal;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.DistributionLocationRepository;
import com.mealmarket.meal.domain.repository.IngredientRepository;
import com.mealmarket.meal.domain.repository.MealRepository;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.criteria.MealSearchRequest;
import com.mealmarket.meal.infrastructure.persistence.entity.MealEntity;
import com.mealmarket.meal.infrastructure.persistence.entity.VendorEntity;
import com.mealmarket.meal.infrastructure.persistence.mapper.MealPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.mapper.VendorPersistenceMapper;
import com.mealmarket.meal.infrastructure.persistence.repository.MealJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.repository.VendorJpaRepository;
import com.mealmarket.meal.infrastructure.persistence.specification.MealSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MealRepositoryAdapter implements MealRepository {

    private final MealJpaRepository jpaRepository;
    private final VendorJpaRepository jpaVendorRepository;
    private final MealPersistenceMapper mapper;
    private final VendorPersistenceMapper vendorMapper;

    private final @Lazy VendorRepository vendorRepository;
    private final @Lazy CategoryRepository categoryRepository;
    private final @Lazy IngredientRepository ingredientRepository;
    private final @Lazy DistributionLocationRepository locationRepository;

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
        return jpaRepository.findById(id)
                .map(entity -> {
                    VendorEntity vendor = jpaVendorRepository.findById(entity.getVendorId())
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Vendor not found: " + entity.getVendorId()));
                    return mapper.toDomain(entity, vendor);
                });
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
    public boolean existsByIngredientId(UUID ingredientId) {
        return jpaRepository.existsByIngredientId(ingredientId);
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
    //  Uniqueness (per vendor, case-insensitive)
    // ═══════════════════════════════════════════════════════════

    @Override
    public boolean existsByVendorIdAndName(UUID vendorId, String name) {
        return jpaRepository.existsByVendorIdAndNameIgnoreCase(vendorId, name);
    }

    @Override
    public boolean existsByCategoryId(UUID categoryId) {
        return jpaRepository.existsByCategoryId(categoryId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Vendor-Scoped Queries
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Meal> findByVendorId(UUID vendorId) {
        return jpaRepository.findByVendorId(vendorId).stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByVendorId(UUID vendorId) {
        return jpaRepository.countByVendorId(vendorId);
    }

    @Override
    public long countAvailableByVendorId(UUID vendorId) {
        return jpaRepository.countByVendorIdAndIsAvailable(vendorId, true);
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
                .map(this::toFullDomain)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Category Queries
    // ═══════════════════════════════════════════════════════════

    @Override
    public List<Category> findCategoriesByMealIdAndType(UUID mealId, CategoryType type) {
        MealEntity entity = jpaRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + mealId));

        if (entity.getCategoryIds() == null || entity.getCategoryIds().isEmpty()) {
            return List.of();
        }

        return categoryRepository.findAllById(entity.getCategoryIds()).stream()
                .filter(c -> c.getType() == type)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════
    //  Search
    // ═══════════════════════════════════════════════════════════

    @Override
    public DataPage<Meal> search(MealSearchRequest request) {
        Specification<MealEntity> spec = MealSpecification.build(request);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                request.getPageRequest().getPage(),
                request.getPageRequest().getSize()
        );
        Page<MealEntity> page = jpaRepository.findAll(spec, pageable);
        return toFullDataPage(page);
    }

    // ═══════════════════════════════════════════════════════════
    //  Updates
    // ═══════════════════════════════════════════════════════════

    @Override
    public void updateAverageRating(UUID mealId, Double newRating) {
        jpaRepository.updateAverageRating(mealId, BigDecimal.valueOf(newRating));
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
    //  Helpers — Full Assembly
    // ═══════════════════════════════════════════════════════════

    private Meal toFullDomain(MealEntity entity) {

        VendorEntity vendorEntity = jpaVendorRepository.findById(entity.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + entity.getVendorId()));

        List<Category> categories = (entity.getCategoryIds() != null
                && !entity.getCategoryIds().isEmpty())
                ? categoryRepository.findAllById(entity.getCategoryIds())
                : List.of();

        List<Ingredient> ingredients = (entity.getIngredientIds() != null
                && !entity.getIngredientIds().isEmpty())
                ? ingredientRepository.findAllById(entity.getIngredientIds())
                : List.of();

        List<DistributionLocation> locations = (entity.getDistributionLocationIds() != null
                && !entity.getDistributionLocationIds().isEmpty())
                ? locationRepository.findAllById(entity.getDistributionLocationIds())
                : List.of();

        return Meal.builder()
                .id(entity.getId())
                .vendor(vendorMapper.toMinimalDomain(vendorEntity))
                .name(entity.getName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .imageStorageRef(entity.getImageStorageRef())   // ← fixed
                .isAvailable(entity.getIsAvailable())
                .averageRating(entity.getAverageRating() != null ? entity.getAverageRating().doubleValue() : null)
                .totalRatings(entity.getTotalRatings())
                .prepTimeMinutes(entity.getPrepTimeMinutes())
                .categories(categories)
                .ingredients(ingredients)
                .distributionLocations(locations)
                .moderationStatus(entity.getModerationStatus()) // ← added
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private DataPage<Meal> toFullDataPage(Page<MealEntity> page) {
        List<Meal> content = page.getContent().stream()
                .map(this::toFullDomain)
                .collect(Collectors.toList());
        return new DataPage<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }
}