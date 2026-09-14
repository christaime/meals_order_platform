package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.ModerationStatus;
import lombok.Getter;

import java.util.UUID;

@Getter
public class DistributionLocationSearchRequest extends SearchRequest {

    private final UUID vendorId;
    private final String keyword;
    private final String name;
    private final ModerationStatus moderationStatus;
    private final LocationProximity locationProximity;

    private DistributionLocationSearchRequest(Builder builder) {
        super(builder);
        this.vendorId = builder.vendorId;
        this.keyword = builder.keyword;
        this.name = builder.name;
        this.moderationStatus = builder.moderationStatus;
        this.locationProximity = builder.locationProximity;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private UUID vendorId;
        private String keyword;
        private String name;
        private ModerationStatus moderationStatus;
        private LocationProximity locationProximity;

        public Builder vendorId(UUID vendorId) {
            this.vendorId = vendorId;
            return this;
        }

        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder moderationStatus(ModerationStatus moderationStatus) {
            this.moderationStatus = moderationStatus;
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
        public DistributionLocationSearchRequest build() {
            return new DistributionLocationSearchRequest(this);
        }
    }
}