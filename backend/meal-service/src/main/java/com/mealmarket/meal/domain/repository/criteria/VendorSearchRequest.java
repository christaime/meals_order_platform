package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.VendorState;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Getter
public class VendorSearchRequest extends SearchRequest {

    private final String keyword;
    private final String businessName;
    private final String email;
    private final String phone;
    private final VendorState.VendorStatus status;
    private final Double minRating;
    private final Double maxRating;
    private final List<UUID> categoryIds;
    private final List<UUID> anyLocationIds;
    private final UUID cityId;
    private final LocationProximity locationProximity;

    private VendorSearchRequest(Builder builder) {
        super(builder);
        this.keyword = builder.keyword;
        this.businessName = builder.businessName;
        this.email = builder.email;
        this.phone = builder.phone;
        this.status = builder.status;
        this.minRating = builder.minRating;
        this.maxRating = builder.maxRating;
        this.categoryIds = builder.categoryIds;
        this.anyLocationIds = builder.anyLocationIds;
        this.cityId = builder.cityId;
        this.locationProximity = builder.locationProximity;
    }

    @Override
    protected Set<String> getSortableProperties() {
        return Set.of("businessName","ownerName","email", "ratingAvg");
    }

    @Override
    protected String getDefaultSortProperty() {
        return "ratingAvg";
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private String keyword;
        private String businessName;
        private String email;
        private String phone;
        private VendorState.VendorStatus status;
        private Double minRating;
        private Double maxRating;
        private List<UUID> categoryIds;
        private List<UUID> anyLocationIds;
        private UUID cityId;
        private LocationProximity locationProximity;

        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }

        public Builder businessName(String businessName) {
            this.businessName = businessName;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public Builder status(VendorState.VendorStatus status) {
            this.status = status;
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

        public Builder categoryIds(List<UUID> categoryIds) {
            this.categoryIds = categoryIds;
            return this;
        }

        public Builder anyLocationIds(List<UUID> anyLocationIds) {
            this.anyLocationIds = anyLocationIds;
            return this;
        }

        public Builder cityId(UUID cityId) {
            this.cityId = cityId;
            return this;
        }

        public Builder locationProximity(LocationProximity locationProximity) {
            this.locationProximity = locationProximity;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public VendorSearchRequest build() {
            return new VendorSearchRequest(this);
        }
    }
}