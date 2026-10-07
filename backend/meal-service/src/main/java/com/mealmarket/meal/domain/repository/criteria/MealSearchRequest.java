package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.ModerationStatus;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Getter
public class MealSearchRequest extends SearchRequest {

    private final String keyword;
    private final UUID vendorId;
    private final String businessName;

    /**
     * The unified category filter. In practice this is the union of
     * {@link #cuisineIds}, {@link #dishTypeIds}, and whatever was set
     * directly via {@code Builder.categoryIds(...)}.
     *
     * The specification reads only this field. Callers that care about
     * the type distinction can still read the specific fields.
     */
    private final List<UUID> categoryIds;

    /** Optional. Pre-merged into {@link #categoryIds}. */
    private final List<UUID> cuisineIds;

    /** Optional. Pre-merged into {@link #categoryIds}. */
    private final List<UUID> dishTypeIds;

    private final List<UUID> anyIngredientIds;      // OR  — any of these
    private final List<UUID> allIngredientIds;      // AND — all of these
    private final List<UUID> excludeIngredientIds;  // NOT — none of these
    private final Boolean hasAllergens;
    private final BigDecimal minPrice;
    private final BigDecimal maxPrice;
    private final Double minRating;
    private final Double maxRating;
    private final Integer minPrepTime;
    private final Integer maxPrepTime;
    private final Boolean isAvailable;
    private final List<UUID> distributionLocationIds;
    private final LocationProximity locationProximity;
    private final ModerationStatus moderationStatus;
    private final Boolean loadFull;
    private final Boolean withCount;

    // ═══════════════════════════════════════════════════════════
    //  Sortable properties — shared with the AI tool schema
    // ═══════════════════════════════════════════════════════════

    public static final Set<String> SORTABLE_PROPERTIES = Set.of(
            "averageRating",
            "name",
            "prepTimeMinutes",
            "price"
    );

    private MealSearchRequest(Builder builder) {
        super(builder);
        this.keyword = builder.keyword;
        this.vendorId = builder.vendorId;
        this.businessName = builder.businessName;
        this.cuisineIds = builder.cuisineIds;
        this.dishTypeIds = builder.dishTypeIds;
        this.categoryIds = mergeCategoryIds(
                builder.categoryIds,
                builder.cuisineIds,
                builder.dishTypeIds
        );
        this.anyIngredientIds = builder.anyIngredientIds;
        this.allIngredientIds = builder.allIngredientIds;
        this.excludeIngredientIds = builder.excludeIngredientIds;
        this.hasAllergens = builder.hasAllergens;
        this.minPrice = builder.minPrice;
        this.maxPrice = builder.maxPrice;
        this.minRating = builder.minRating;
        this.maxRating = builder.maxRating;
        this.maxPrepTime = builder.maxPrepTime;
        this.minPrepTime = builder.minPrepTime;
        this.isAvailable = builder.isAvailable;
        this.distributionLocationIds = builder.distributionLocationIds;
        this.locationProximity = builder.locationProximity;
        this.moderationStatus = builder.moderationStatus;
        this.loadFull = builder.loadFull;
        this.withCount = builder.withCount;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Category merge helper
    // ═══════════════════════════════════════════════════════════

    /**
     * Merge the three category-id sources into a single deduplicated
     * list. Order is preserved: categoryIds first, then cuisineIds,
     * then dishTypeIds. Duplicates (a cuisine id also passed as a
     * generic category id, for instance) are dropped silently.
     *
     * Returns an empty list when all three inputs are empty — never null.
     */
    private static List<UUID> mergeCategoryIds(
            List<UUID> categoryIds,
            List<UUID> cuisineIds,
            List<UUID> dishTypeIds
    ) {
        LinkedHashSet<UUID> merged = new LinkedHashSet<>();

        if (categoryIds != null) merged.addAll(categoryIds);
        if (cuisineIds != null)  merged.addAll(cuisineIds);
        if (dishTypeIds != null) merged.addAll(dishTypeIds);

        return new ArrayList<>(merged);
    }

    // ═══════════════════════════════════════════════════════════
    //  Sort contract
    // ═══════════════════════════════════════════════════════════

    @Override
    protected Set<String> getSortableProperties() {
        return SORTABLE_PROPERTIES;
    }

    @Override
    protected String getDefaultSortProperty() {
        return "averageRating";
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
        private List<UUID> anyIngredientIds;
        private List<UUID> allIngredientIds;
        private List<UUID> excludeIngredientIds;
        private Boolean hasAllergens;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private Integer minPrepTime;
        private Integer maxPrepTime;
        private Double minRating;
        private Double maxRating;
        private Boolean isAvailable;
        private List<UUID> distributionLocationIds;
        private LocationProximity locationProximity;
        private ModerationStatus moderationStatus;
        private Boolean loadFull;
        private Boolean withCount;

        public Builder keyword(String v) {
            this.keyword = v;
            return this;
        }

        public Builder vendorId(UUID v) {
            this.vendorId = v;
            return this;
        }

        public Builder businessName(String v) {
            this.businessName = v;
            return this;
        }

        /** Generic category filter. Merged with cuisineIds and dishTypeIds. */
        public Builder categoryIds(List<UUID> v) {
            this.categoryIds = v;
            return this;
        }

        /** Cuisine category filter. Merged into categoryIds. */
        public Builder cuisineIds(List<UUID> v) {
            this.cuisineIds = v;
            return this;
        }

        /** Dish-type category filter. Merged into categoryIds. */
        public Builder dishTypeIds(List<UUID> v) {
            this.dishTypeIds = v;
            return this;
        }

        /** OR semantics: meal matches if it contains ANY of these ingredients. */
        public Builder anyIngredientIds(List<UUID> v) {
            this.anyIngredientIds = v;
            return this;
        }

        /** AND semantics: meal matches only if it contains ALL of these. */
        public Builder allIngredientIds(List<UUID> v) {
            this.allIngredientIds = v;
            return this;
        }

        /** Exclusion: meal must contain NONE of these. */
        public Builder excludeIngredientIds(List<UUID> v) {
            this.excludeIngredientIds = v;
            return this;
        }

        public Builder hasAllergens(Boolean v) {
            this.hasAllergens = v;
            return this;
        }

        public Builder minPrice(BigDecimal v) {
            this.minPrice = v;
            return this;
        }

        public Builder maxPrice(BigDecimal v) {
            this.maxPrice = v;
            return this;
        }

        public Builder minPrepTime(Integer v) {
            this.minPrepTime = v;
            return this;
        }

        public Builder maxPrepTime(Integer v) {
            this.maxPrepTime = v;
            return this;
        }

        public Builder minRating(Double v) {
            this.minRating = v;
            return this;
        }

        public Builder maxRating(Double v) {
            this.maxRating = v;
            return this;
        }

        public Builder isAvailable(Boolean v) {
            this.isAvailable = v;
            return this;
        }

        /** OR semantics: meal matches if pickable up at ANY of these. */
        public Builder distributionLocationIds(List<UUID> v) {
            this.distributionLocationIds = v;
            return this;
        }

        public Builder locationProximity(LocationProximity v) {
            this.locationProximity = v;
            return this;
        }

        public Builder moderationStatus(ModerationStatus v) {
            this.moderationStatus = v;
            return this;
        }

        public Builder loadFull(Boolean v) {
            this.loadFull = v;
            return this;
        }

        public Builder withCount(Boolean v) {
            this.withCount = v;
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