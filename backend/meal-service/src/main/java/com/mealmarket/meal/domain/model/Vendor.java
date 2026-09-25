package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
public class Vendor {

    // ─── Identification ────────────────────────────────────────
    private final UUID id;

    /**
     * The Keycloak user ID.
     * Authentication (password, email verification, social login)
     * is handled entirely by Keycloak — not stored here.
     */
    @NotNull(message = "User ID is required")
    private final UUID userId;

    // ─── Business Info ────────────────────────────────────────
    @NotBlank(message = "Business name is required")
    @Size(min = 2, max = 100, message = "Business name must be between 2 and 100 characters")
    private final String businessName;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private final String description;

    @NotBlank(message = "Address is required")
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private final String address;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private final String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be valid")
    private final String phone;

    // ─── Ratings ──────────────────────────────────────────────
    private final BigDecimal ratingAvg;
    private final Integer totalRatings;

    // ─── Current State ────────────────────────────────────────
    @NotNull(message = "Vendor state is required")
    private final VendorState state;

    // ─── Delivery ─────────────────────────────────────────────
    @PositiveOrZero(message = "Delivery radius cannot be negative")
    private final Integer deliveryRadius;

    @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
    private final String pickupAddress;

    // ─── Profile ──────────────────────────────────────────────
    /**
     * MinIO object keys. URLs are computed at read time, never stored.
     * The CNI refs are required for moderation but not for the domain's
     * validity (a vendor can exist in PENDING without them; the moderation
     * flow enforces their presence).
     */
    @Size(max = 512, message = "Profile image storage ref cannot exceed 512 characters")
    private final String profileImageStorageRef;

    @Size(max = 512, message = "Cover image storage ref cannot exceed 512 characters")
    private final String coverImageStorageRef;

    @Size(max = 512, message = "ID card front storage ref cannot exceed 512 characters")
    private final String idCardFrontStorageRef;

    @Size(max = 512, message = "ID card back storage ref cannot exceed 512 characters")
    private final String idCardBackStorageRef;

    // ─── Classification ───────────────────────────────────────
    private final List<Category> categories;

    // ─── Locations ────────────────────────────────────────────
    private final List<DistributionLocation> distributionLocations;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    // ─── Subscription ─────────────────────────────────────────
    @NotNull(message = "Subscription tier is required")
    private final SubscriptionTier subscriptionTier;

    private Vendor(Builder builder) {
        this.id = builder.id;
        this.userId = builder.userId;
        this.businessName = builder.businessName;
        this.description = builder.description;
        this.address = builder.address;
        this.email = builder.email;
        this.phone = builder.phone;
        this.ratingAvg = builder.ratingAvg;
        this.totalRatings = builder.totalRatings;
        this.state = builder.state;
        this.deliveryRadius = builder.deliveryRadius;
        this.pickupAddress = builder.pickupAddress;
        this.profileImageStorageRef = builder.profileImageStorageRef;
        this.coverImageStorageRef = builder.coverImageStorageRef;
        this.idCardFrontStorageRef = builder.idCardFrontStorageRef;
        this.idCardBackStorageRef = builder.idCardBackStorageRef;
        this.categories = builder.categories != null ? new ArrayList<>(builder.categories) : new ArrayList<>();
        this.distributionLocations = builder.distributionLocations != null ? new ArrayList<>(builder.distributionLocations) : new ArrayList<>();
        this.subscriptionTier = builder.subscriptionTier;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static Vendor copyOf(Vendor existing) {
        return existing.baseBuilder().build();
    }

    private Builder baseBuilder() {
        return Vendor.builder()
                .id(this.id)
                .userId(this.userId)
                .businessName(this.businessName)
                .description(this.description)
                .address(this.address)
                .email(this.email)
                .phone(this.phone)
                .ratingAvg(this.ratingAvg)
                .totalRatings(this.totalRatings)
                .state(this.state)
                .deliveryRadius(this.deliveryRadius)
                .pickupAddress(this.pickupAddress)
                .profileImageStorageRef(this.profileImageStorageRef)
                .coverImageStorageRef(this.coverImageStorageRef)
                .idCardFrontStorageRef(this.idCardFrontStorageRef)
                .idCardBackStorageRef(this.idCardBackStorageRef)
                .categories(this.categories)
                .distributionLocations(this.distributionLocations)
                .subscriptionTier(this.subscriptionTier)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now());
    }

    // convenience copy helpers
    public Vendor withState(VendorState newState) {
        return baseBuilder().state(newState).build();
    }

    public Vendor withProfileImageRef(String ref) {
        return baseBuilder().profileImageStorageRef(ref).build();
    }

    public Vendor withCoverImageRef(String ref) {
        return baseBuilder().coverImageStorageRef(ref).build();
    }

    public Vendor withCniRefs(String front, String back) {
        return baseBuilder()
                .idCardFrontStorageRef(front)
                .idCardBackStorageRef(back)
                .build();
    }

    public Vendor withCategories(List<Category> cuisines) {
        return baseBuilder().categories(cuisines).build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Business Methods
    // ═══════════════════════════════════════════════════════════

    public boolean isActive() {
        return state != null && state.status() == VendorState.VendorStatus.ACTIVE;
    }

    public boolean isBanned() {
        return state != null && state.status() == VendorState.VendorStatus.BANNED;
    }

    public boolean isSuspended() {
        return state != null && state.status() == VendorState.VendorStatus.SUSPENDED;
    }

    public VendorState.VendorStatus getStatus() {
        return state != null ? state.status() : null;
    }

    public String getStatusReason() {
        return state != null ? state.reason() : null;
    }

    public List<Category> getCuisines() {
        return categories.stream()
                .filter(c -> c.getType() == CategoryType.CUISINE)
                .collect(Collectors.toList());
    }

    public boolean hasCuisine(String cuisineName) {
        return getCuisines().stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(cuisineName));
    }

    public List<String> getCuisineNames() {
        return getCuisines().stream()
                .map(Category::getName)
                .collect(Collectors.toList());
    }

    public boolean operatesAt(UUID locationId) {
        return distributionLocations.stream()
                .anyMatch(loc -> loc.getId().equals(locationId));
    }

    public List<DistributionLocation> getActiveLocations() {
        return distributionLocations.stream()
                .filter(DistributionLocation::isActive)
                .collect(Collectors.toList());
    }

    public boolean hasProfileImage() {
        return profileImageStorageRef != null && !profileImageStorageRef.isBlank();
    }

    public boolean hasCni() {
        return idCardFrontStorageRef != null && !idCardFrontStorageRef.isBlank()
                && idCardBackStorageRef != null && !idCardBackStorageRef.isBlank();
    }
    // ═══════════════════════════════════════════════════════════
    //  Manual Builder with Jakarta Validation
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;

        private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;
        /**
         * Keycloak user ID — links this vendor to the authentication system.
         */
        private UUID userId;

        private String businessName;

        private String description;

        private String address;

        private String email;

        private String phone;

        private BigDecimal ratingAvg = BigDecimal.ZERO;
        private Integer totalRatings = 0;

        private VendorState state;

        private Integer deliveryRadius = 10;

        private String pickupAddress;

        private String profileImageStorageRef;
        private String coverImageStorageRef;
        private String idCardFrontStorageRef;
        private String idCardBackStorageRef;

        private List<Category> categories;
        private List<DistributionLocation> distributionLocations;

        private Instant createdAt;
        private Instant updatedAt;

        // ─── Fluent Setters ────────────────────────────────────

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder businessName(String businessName) { this.businessName = businessName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder address(String address) { this.address = address; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder ratingAvg(BigDecimal ratingAvg) { this.ratingAvg = ratingAvg; return this; }
        public Builder totalRatings(Integer totalRatings) { this.totalRatings = totalRatings; return this; }
        public Builder state(VendorState state) { this.state = state; return this; }
        public Builder deliveryRadius(Integer deliveryRadius) { this.deliveryRadius = deliveryRadius; return this; }
        public Builder pickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; return this; }
        public Builder profileImageStorageRef(String v) { this.profileImageStorageRef = v; return this; }
        public Builder coverImageStorageRef(String v) { this.coverImageStorageRef = v; return this; }
        public Builder idCardFrontStorageRef(String v) { this.idCardFrontStorageRef = v; return this; }
        public Builder idCardBackStorageRef(String v) { this.idCardBackStorageRef = v; return this; }public Builder categories(List<Category> categories) { this.categories = categories; return this; }
        public Builder distributionLocations(List<DistributionLocation> distributionLocations) { this.distributionLocations = distributionLocations; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder subscriptionTier(SubscriptionTier v) {
            this.subscriptionTier = v;
            return this;
        }
        // ─── Build with Validation ─────────────────────────────

        public Vendor build() {
            Vendor vendor = new Vendor(this);
            DomainValidation.validate(vendor);
            return vendor;
        }
    }
}