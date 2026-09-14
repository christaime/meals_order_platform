package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;
import lombok.Getter;

import java.util.UUID;

@Getter
public class IngredientSearchRequest extends SearchRequest {

    private final String keyword;
    private final String name;
    private final Boolean isAllergen;
    private final ModerationStatus moderationStatus;
    private final UserType createdByType;
    private final UUID createdById;

    private IngredientSearchRequest(Builder builder) {
        super(builder);
        this.keyword = builder.keyword;
        this.name = builder.name;
        this.isAllergen = builder.isAllergen;
        this.moderationStatus = builder.moderationStatus;
        this.createdByType = builder.createdByType;
        this.createdById = builder.createdById;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private String keyword;
        private String name;
        private Boolean isAllergen;
        private ModerationStatus moderationStatus;
        private UserType createdByType;
        private UUID createdById;

        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder isAllergen(Boolean isAllergen) {
            this.isAllergen = isAllergen;
            return this;
        }

        public Builder moderationStatus(ModerationStatus moderationStatus) {
            this.moderationStatus = moderationStatus;
            return this;
        }

        public Builder createdByType(UserType createdByType) {
            this.createdByType = createdByType;
            return this;
        }

        public Builder createdById(UUID createdById) {
            this.createdById = createdById;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public IngredientSearchRequest build() {
            return new IngredientSearchRequest(this);
        }
    }
}