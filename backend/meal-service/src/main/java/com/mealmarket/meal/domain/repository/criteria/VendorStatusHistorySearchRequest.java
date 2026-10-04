package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.VendorState;
import lombok.Getter;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Getter
public class VendorStatusHistorySearchRequest extends SearchRequest {

    private final UUID vendorId;
    private final VendorState.VendorStatus fromStatus;
    private final VendorState.VendorStatus toStatus;
    private final UUID changedBy;
    private final VendorState.StateChangeType changeType;
    private final Instant changedFrom;
    private final Instant changedTo;

    private VendorStatusHistorySearchRequest(Builder builder) {
        super(builder);
        this.vendorId = builder.vendorId;
        this.fromStatus = builder.fromStatus;
        this.toStatus = builder.toStatus;
        this.changedBy = builder.changedBy;
        this.changeType = builder.changeType;
        this.changedFrom = builder.changedFrom;
        this.changedTo = builder.changedTo;
    }

    @Override
    protected Set<String> getSortableProperties() {
        return Set.of("vendorId", "createdAt");
    }

    @Override
    protected String getDefaultSortProperty() {
        return "vendorId";
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private UUID vendorId;
        private VendorState.VendorStatus fromStatus;
        private VendorState.VendorStatus toStatus;
        private UUID changedBy;
        private VendorState.StateChangeType changeType;
        private Instant changedFrom;
        private Instant changedTo;

        public Builder vendorId(UUID vendorId) {
            this.vendorId = vendorId;
            return this;
        }

        public Builder fromStatus(VendorState.VendorStatus fromStatus) {
            this.fromStatus = fromStatus;
            return this;
        }

        public Builder toStatus(VendorState.VendorStatus toStatus) {
            this.toStatus = toStatus;
            return this;
        }

        public Builder changedBy(UUID changedBy) {
            this.changedBy = changedBy;
            return this;
        }

        public Builder changeType(VendorState.StateChangeType changeType) {
            this.changeType = changeType;
            return this;
        }

        public Builder changedFrom(Instant changedFrom) {
            this.changedFrom = changedFrom;
            return this;
        }

        public Builder changedTo(Instant changedTo) {
            this.changedTo = changedTo;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public VendorStatusHistorySearchRequest build() {
            return new VendorStatusHistorySearchRequest(this);
        }
    }
}