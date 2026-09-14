package com.mealmarket.common.pagination;

import lombok.Getter;

@Getter
public abstract class SearchRequest {

    protected final PageRequest pageRequest;
    protected final Sort sort;

    protected <B extends Builder<B>> SearchRequest(Builder<B> builder) {
        this.pageRequest = builder.pageRequest != null
                ? builder.pageRequest
                : PageRequest.defaultRequest();
        this.sort = builder.sort != null
                ? builder.sort
                : Sort.unsorted();
    }

    public int getPage() { return pageRequest.getPage(); }
    public int getSize() { return pageRequest.getSize(); }
    public int getOffset() { return pageRequest.getOffset(); }
    public boolean hasSort() { return sort != null && sort.isSorted(); }

    public abstract static class Builder<B extends Builder<B>> {

        protected PageRequest pageRequest;
        protected Sort sort;

        public B pageRequest(PageRequest pageRequest) {
            this.pageRequest = pageRequest;
            return self();
        }

        public B sort(Sort sort) {
            this.sort = sort;
            return self();
        }

        public B page(int page, int size) {
            this.pageRequest = PageRequest.of(page, size);
            return self();
        }

        public B sortBy(String field, Sort.Direction direction) {
            this.sort = Sort.by(field, direction);
            return self();
        }

        protected abstract B self();
        public abstract SearchRequest build();
    }
}