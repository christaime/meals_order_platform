package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Represents a meal offered by a vendor.
 *
 * Moderation: ALL meals go through moderation before appearing to customers.
 * Creation always sets moderationStatus = PENDING.
 *
 * A meal is visible to customers only when:
 * - meal.moderationStatus = APPROVED
 * - vendor.status = ACTIVE
 * - meal.isAvailable = true
 *
 * The image is stored as a MinIO object key (storage ref). The URL is
 * derived by the mapper via the MediaStoragePort — never persisted here.
 */
@Getter
public class Meal {

    // ─── Identification ───────────────────────────────────────
    private final UUID id;

    @NotNull(message = "Vendor is required")
    private final Vendor vendor;

    // ─── Core Fields ──────────────────────────────────────────
    @NotBlank(message = "Meal name is required")
    @Size(min = 3, max = 100, message = "Meal name must be between 3 and 100 characters")
    private final String name;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private final String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private final BigDecimal price;

    /**
     * MinIO object key for the meal image. Null = no image.
     * The display URL is computed at read time, never stored.
     */
    @Size(max = 512, message = "Image storage ref cannot exceed 512 characters")
    private final String imageStorageRef;

    // ─── Availability & Stats ─────────────────────────────────
    private final Boolean isAvailable;
    private final Double averageRating;
    private final Integer totalRatings;

    @PositiveOrZero(message = "Prep time cannot be negative")
    private final Integer prepTimeMinutes;

    // ─── Relationships ────────────────────────────────────────
    private final List<Category> categories;
    private final List<Ingredient> ingredients;
    private final List<DistributionLocation> distributionLocations;

    // ─── Moderation ───────────────────────────────────────────
    @NotNull(message = "Moderation status is required")
    private final ModerationStatus moderationStatus;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    private Meal(Builder builder) {
        this.id = builder.id;
        this.vendor = builder.vendor;
        this.name = builder.name;
        this.description = builder.description;
        this.price = builder.price;
        this.imageStorageRef = builder.imageStorageRef;
        this.isAvailable = builder.isAvailable;
        this.averageRating = builder.averageRating;
        this.totalRatings = builder.totalRatings;
        this.prepTimeMinutes = builder.prepTimeMinutes;
        this.categories = builder.categories != null ? new ArrayList<>(builder.categories) : new ArrayList<>();
        this.ingredients = builder.ingredients != null ? new ArrayList<>(builder.ingredients) : new ArrayList<>();
        this.distributionLocations = builder.distributionLocations != null ? new ArrayList<>(builder.distributionLocations) : new ArrayList<>();
        this.moderationStatus = builder.moderationStatus;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Derived Properties
    // ═══════════════════════════════════════════════════════════

    public boolean isActive() {
        return moderationStatus == ModerationStatus.APPROVED;
    }

    public boolean isPending() {
        return moderationStatus == ModerationStatus.PENDING;
    }

    public boolean isRejected() {
        return moderationStatus == ModerationStatus.REJECTED;
    }

    public boolean isVisibleToCustomers() {
        return isActive()
                && Boolean.TRUE.equals(isAvailable)
                && vendor != null
                && vendor.isActive();
    }

    public boolean hasImage() {
        return imageStorageRef != null && !imageStorageRef.isBlank();
    }

    // ═══════════════════════════════════════════════════════════
    //  Business Methods
    // ═══════════════════════════════════════════════════════════

    public boolean hasAllergens() {
        return ingredients.stream()
                .anyMatch(i -> Boolean.TRUE.equals(i.getIsAllergen()));
    }

    public List<String> getAllergenNames() {
        return ingredients.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsAllergen()))
                .map(Ingredient::getName)
                .collect(Collectors.toList());
    }

    public boolean containsIngredient(String ingredientName) {
        return ingredients.stream()
                .anyMatch(i -> i.getName().equalsIgnoreCase(ingredientName));
    }

    public List<Category> getCuisines() {
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.CUISINE)
                .collect(Collectors.toList());
    }

    public List<Category> getDishTypes() {
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.DISH_TYPE)
                .collect(Collectors.toList());
    }

    public boolean hasCuisine(String cuisineName) {
        return getCuisines().stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(cuisineName));
    }

    public boolean hasDishType(String dishTypeName) {
        return getDishTypes().stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(dishTypeName));
    }

    public List<String> getCuisineNames() {
        return getCuisines().stream()
                .map(Category::getName)
                .collect(Collectors.toList());
    }

    public List<String> getDishTypeNames() {
        return getDishTypes().stream()
                .map(Category::getName)
                .collect(Collectors.toList());
    }

    public List<String> getIngredientNames() {
        return ingredients.stream()
                .map(Ingredient::getName)
                .collect(Collectors.toList());
    }

    public boolean belongsTo(UUID vendorId) {
        return vendor != null && vendor.getId().equals(vendorId);
    }

    public boolean isAvailableAt(UUID locationId) {
        if (distributionLocations.isEmpty()) {
            return vendor != null && vendor.operatesAt(locationId);
        }
        return distributionLocations.stream()
                .anyMatch(loc -> loc.getId().equals(locationId));
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory — Creation always starts as PENDING
    // ═══════════════════════════════════════════════════════════

    public static Meal create(
            Vendor vendor,
            String name,
            String description,
            BigDecimal price,
            String imageStorageRef,
            Integer prepTimeMinutes,
            List<Category> categories,
            List<Ingredient> ingredients,
            List<DistributionLocation> distributionLocations
    ) {
        return Meal.builder()
                .vendor(vendor)
                .name(name)
                .description(description)
                .price(price)
                .imageStorageRef(imageStorageRef)
                .isAvailable(true)
                .averageRating(0.0)
                .totalRatings(0)
                .prepTimeMinutes(prepTimeMinutes)
                .categories(categories)
                .ingredients(ingredients)
                .distributionLocations(distributionLocations)
                .moderationStatus(ModerationStatus.PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Copy Helpers
    // ═══════════════════════════════════════════════════════════

    public Meal withModerationStatus(ModerationStatus newStatus) {
        return baseBuilder().moderationStatus(newStatus).build();
    }

    public Meal withAvailability(Boolean isAvailable) {
        return baseBuilder().isAvailable(isAvailable).build();
    }

    /**
     * Replace or clear the image. Pass null or "" to remove.
     */
    public Meal withImageRef(String imageStorageRef) {
        return baseBuilder().imageStorageRef(imageStorageRef).build();
    }

    public Meal withCategories(List<Category> categories) {
        return baseBuilder().categories(categories).build();
    }

    public Meal withIngredients(List<Ingredient> ingredients) {
        return baseBuilder().ingredients(ingredients).build();
    }

    public Meal withDistributionLocations(List<DistributionLocation> locations) {
        return baseBuilder().distributionLocations(locations).build();
    }

    private Builder baseBuilder() {
        return Meal.builder()
                .id(this.id)
                .vendor(this.vendor)
                .name(this.name)
                .description(this.description)
                .price(this.price)
                .imageStorageRef(this.imageStorageRef)
                .isAvailable(this.isAvailable)
                .averageRating(this.averageRating)
                .totalRatings(this.totalRatings)
                .prepTimeMinutes(this.prepTimeMinutes)
                .categories(this.categories)
                .ingredients(this.ingredients)
                .distributionLocations(this.distributionLocations)
                .moderationStatus(this.moderationStatus)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now());
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private Vendor vendor;
        private String name;
        private String description;
        private BigDecimal price;
        private String imageStorageRef;
        private Boolean isAvailable = true;
        private Double averageRating = 0.0;
        private Integer totalRatings = 0;
        private Integer prepTimeMinutes;
        private List<Category> categories;
        private List<Ingredient> ingredients;
        private List<DistributionLocation> distributionLocations;
        private ModerationStatus moderationStatus = ModerationStatus.PENDING;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder vendor(Vendor v) { this.vendor = v; return this; }
        public Builder name(String v) { this.name = v; return this; }
        public Builder description(String v) { this.description = v; return this; }
        public Builder price(BigDecimal v) { this.price = v; return this; }
        public Builder imageStorageRef(String v) { this.imageStorageRef = v; return this; }
        public Builder isAvailable(Boolean v) { this.isAvailable = v; return this; }
        public Builder averageRating(Double v) { this.averageRating = v; return this; }
        public Builder totalRatings(Integer v) { this.totalRatings = v; return this; }
        public Builder prepTimeMinutes(Integer v) { this.prepTimeMinutes = v; return this; }
        public Builder categories(List<Category> v) { this.categories = v; return this; }
        public Builder ingredients(List<Ingredient> v) { this.ingredients = v; return this; }
        public Builder distributionLocations(List<DistributionLocation> v) { this.distributionLocations = v; return this; }
        public Builder moderationStatus(ModerationStatus v) { this.moderationStatus = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public Meal build() {
            Meal meal = new Meal(this);
            DomainValidation.validate(meal);
            return meal;
        }
    }
}