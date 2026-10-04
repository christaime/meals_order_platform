package com.mealmarket.meal.domain.repository.criteria;

import com.mealmarket.common.pagination.SearchRequest;
import lombok.Getter;

import java.util.Set;

@Getter
public class CitySearchRequest extends SearchRequest {

    private final String keyword;
    private final String region;
    private final String countryCode;

    private CitySearchRequest(Builder builder) {
        super(builder);
        this.keyword = builder.keyword;
        this.region = builder.region;
        this.countryCode = builder.countryCode;
    }

    @Override
    protected Set<String> getSortableProperties() {
        return Set.of( "name", "region", "countryCode", "createdAt");
    }

    @Override
    protected String getDefaultSortProperty() {
        return "name";
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder extends SearchRequest.Builder<Builder> {

        private String keyword;
        private String region;
        private String countryCode;

        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }

        public Builder region(String region) {
            this.region = region;
            return this;
        }

        public Builder countryCode(String countryCode) {
            this.countryCode = countryCode;
            return this;
        }

        @Override
        protected Builder self() {
            return this;
        }

        @Override
        public CitySearchRequest build() {
            return new CitySearchRequest(this);
        }
    }
}