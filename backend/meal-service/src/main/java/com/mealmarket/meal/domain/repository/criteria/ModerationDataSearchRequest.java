package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;
import lombok.Getter;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Getter
public class ModerationDataSearchRequest extends SearchRequest {

    private final ModerationTargetType targetType;
    private final UUID targetId;
    private final ModerationStatus fromStatus;
    private final ModerationStatus toStatus;
    private final UserType performedByType;
    private final UUID performedById;
    private final Instant performedFrom;
    private final Instant performedTo;

    private ModerationDataSearchRequest(Builder builder) {
        super(builder);
        this.targetType = builder.targetType;
        this.targetId = builder.targetId;
        this.fromStatus = builder.fromStatus;
        this.toStatus = builder.toStatus;
        this.performedByType = builder.performedByType;
        this.performedById = builder.performedById;
        this.performedFrom = builder.performedFrom;
        this.performedTo = builder.performedTo;
    }

    @Override
    protected Set<String> getSortableProperties() {
        return Set.of("targetType", "performedAt");
    }

    @Override
    protected String getDefaultSortProperty() {
        return "performedAt";
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private ModerationTargetType targetType;
        private UUID targetId;
        private ModerationStatus fromStatus;
        private ModerationStatus toStatus;
        private UserType performedByType;
        private UUID performedById;
        private Instant performedFrom;
        private Instant performedTo;

        public Builder targetType(ModerationTargetType targetType) {
            this.targetType = targetType;
            return this;
        }

        public Builder targetId(UUID targetId) {
            this.targetId = targetId;
            return this;
        }

        public Builder fromStatus(ModerationStatus fromStatus) {
            this.fromStatus = fromStatus;
            return this;
        }

        public Builder toStatus(ModerationStatus toStatus) {
            this.toStatus = toStatus;
            return this;
        }

        public Builder performedByType(UserType performedByType) {
            this.performedByType = performedByType;
            return this;
        }

        public Builder performedById(UUID performedById) {
            this.performedById = performedById;
            return this;
        }

        public Builder performedFrom(Instant performedFrom) {
            this.performedFrom = performedFrom;
            return this;
        }

        public Builder performedTo(Instant performedTo) {
            this.performedTo = performedTo;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public ModerationDataSearchRequest build() {
            return new ModerationDataSearchRequest(this);
        }
    }
}