package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.ModerationStatus;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
public class MealSearchRequest extends SearchRequest {

    private final String keyword;
    private final UUID vendorId;
    private final String businessName;
    private final List<UUID> categoryIds;
    private final List<UUID> cuisineIds;
    private final List<UUID> dishTypeIds;
    private final List<UUID> ingredientIds;
    private final List<UUID> excludeIngredientIds;
    private final Boolean hasAllergens;
    private final BigDecimal minPrice;
    private final BigDecimal maxPrice;
    private final Double minRating;
    private final Double maxRating;
    private final Boolean isAvailable;
    private final UUID distributionLocationId;
    private final LocationProximity locationProximity;
    private final ModerationStatus moderationStatus;
    private final Boolean loadFull;
    private final Boolean withCount;

    private MealSearchRequest(Builder builder) {
        super(builder);
        this.keyword = builder.keyword;
        this.vendorId = builder.vendorId;
        this.businessName = builder.businessName;
        this.categoryIds = builder.categoryIds;
        this.cuisineIds = builder.cuisineIds;
        this.dishTypeIds = builder.dishTypeIds;
        this.ingredientIds = builder.ingredientIds;
        this.excludeIngredientIds = builder.excludeIngredientIds;
        this.hasAllergens = builder.hasAllergens;
        this.minPrice = builder.minPrice;
        this.maxPrice = builder.maxPrice;
        this.minRating = builder.minRating;
        this.maxRating = builder.maxRating;
        this.isAvailable = builder.isAvailable;
        this.distributionLocationId = builder.distributionLocationId;
        this.locationProximity = builder.locationProximity;
        this.moderationStatus = builder.moderationStatus;
        this.loadFull = builder.loadFull;
        this.withCount = builder.withCount;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private String keyword;
        private UUID vendorId;
        private String businessName;
        private List<UUID> categoryIds;
        private List<UUID> cuisineIds;
        private List<UUID> dishTypeIds;
        private List<UUID> ingredientIds;
        private List<UUID> excludeIngredientIds;
        private Boolean hasAllergens;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private Double minRating;
        private Double maxRating;
        private Boolean isAvailable;
        private UUID distributionLocationId;
        private LocationProximity locationProximity;
        private ModerationStatus moderationStatus;
        private Boolean loadFull;
        private Boolean withCount;

        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }

        public Builder vendorId(UUID vendorId) {
            this.vendorId = vendorId;
            return this;
        }

        public Builder businessName(String businessName) {
            this.businessName = businessName;
            return this;
        }

        public Builder categoryIds(List<UUID> categoryIds) {
            this.categoryIds = categoryIds;
            return this;
        }

        public Builder cuisineIds(List<UUID> cuisineIds) {
            this.cuisineIds = cuisineIds;
            return this;
        }

        public Builder dishTypeIds(List<UUID> dishTypeIds) {
            this.dishTypeIds = dishTypeIds;
            return this;
        }

        public Builder ingredientIds(List<UUID> ingredientIds) {
            this.ingredientIds = ingredientIds;
            return this;
        }

        public Builder excludeIngredientIds(List<UUID> excludeIngredientIds) {
            this.excludeIngredientIds = excludeIngredientIds;
            return this;
        }

        public Builder hasAllergens(Boolean hasAllergens) {
            this.hasAllergens = hasAllergens;
            return this;
        }

        public Builder loadFull(Boolean loadFull) {
            this.loadFull = loadFull;
            return this;
        }

        public Builder withCount(Boolean withCount) {
            this.withCount = withCount;
            return this;
        }

        public Builder minPrice(BigDecimal minPrice) {
            this.minPrice = minPrice;
            return this;
        }

        public Builder maxPrice(BigDecimal maxPrice) {
            this.maxPrice = maxPrice;
            return this;
        }

        public Builder minRating(Double minRating) {
            this.minRating = minRating;
            return this;
        }

        public Builder maxRating(Double maxRating) {
            this.maxRating = maxRating;
            return this;
        }

        public Builder isAvailable(Boolean isAvailable) {
            this.isAvailable = isAvailable;
            return this;
        }

        public Builder distributionLocationId(UUID distributionLocationId) {
            this.distributionLocationId = distributionLocationId;
            return this;
        }

        public Builder locationProximity(LocationProximity locationProximity) {
            this.locationProximity = locationProximity;
            return this;
        }

        public Builder moderationStatus(ModerationStatus moderationStatus) {
            this.moderationStatus = moderationStatus;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public MealSearchRequest build() {
            return new MealSearchRequest(this);
        }
    }
}