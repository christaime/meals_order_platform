package com.mealmarket.common.pagination;

import lombok.Getter;

@Getter
public class PageRequest {

    private final int page;
    private final int size;

    private PageRequest(Builder builder) {
        this.page = builder.page;
        this.size = builder.size;
    }

    public static Builder builder() {
        return new Builder();
    }

    public int getOffset() {
        return page * size;
    }

    public boolean isValid() {
        return page >= 0 && size > 0 && size <= 100;
    }

    // ═══════════════════════════════════════════════════════════
    //  Static factories
    // ═══════════════════════════════════════════════════════════

    public static PageRequest of(int page, int size) {
        return PageRequest.builder()
                .page(page)
                .size(size)
                .build();
    }

    public static PageRequest defaultRequest() {
        return PageRequest.builder().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private int page = 0;
        private int size = 20;

        public Builder page(int page) {
            this.page = page;
            return this;
        }

        public Builder size(int size) {
            this.size = size;
            return this;
        }

        public PageRequest build() {
            if (page < 0) {
                throw new IllegalArgumentException("Page number cannot be negative");
            }
            if (size <= 0 || size > 100) {
                throw new IllegalArgumentException("Page size must be between 1 and 100");
            }
            return new PageRequest(this);
        }
    }
}