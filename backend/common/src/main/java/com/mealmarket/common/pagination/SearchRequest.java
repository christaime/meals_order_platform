package com.mealmarket.common.pagination;

import lombok.Getter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

    // ═══════════════════════════════════════════════════════════
    //  Sortable-property contract — implemented by each subclass
    // ═══════════════════════════════════════════════════════════

    /**
     * The set of properties a client may sort by on this request.
     * Anything outside this set is rejected and replaced by the
     * default sort property.
     */
    protected abstract Set<String> getSortableProperties();

    /**
     * The property applied when the client sends no sort, or sends
     * a sort field that isn't in {@link #getSortableProperties()}.
     *
     * Must be a member of {@link #getSortableProperties()}.
     */
    protected abstract String getDefaultSortProperty();

    // ═══════════════════════════════════════════════════════════
    //  Valid sort resolution
    // ═══════════════════════════════════════════════════════════

    /**
     * The sort orders to apply to the query.
     *
     * <ul>
     *   <li>No sortable properties → empty list (unsorted).</li>
     *   <li>No sort requested → single default order (ascending).</li>
     *   <li>Sort requested → only valid orders, deduplicated by
     *       property (first occurrence wins).</li>
     *   <li>All orders invalid → single default order.</li>
     * </ul>
     *
     * Never returns an empty list when sortable properties exist —
     * safe to pass directly to Spring Data.
     */
    public List<Sort.Order> validSortOrders() {
        Set<String> allowed = getSortableProperties();

        if (allowed == null || allowed.isEmpty()) {
            return List.of();
        }

        String defaultProperty = getDefaultSortProperty();
        if (defaultProperty == null || !allowed.contains(defaultProperty)) {
            throw new IllegalStateException(
                    "getDefaultSortProperty() must be a member of getSortableProperties()");
        }

        if (!hasSort()) {
            return List.of(Sort.Order.asc(defaultProperty));
        }

        // Keep valid orders only, deduplicated by property (first wins).
        // The HashSet is mutated inside the stream — safe because the
        // stream is sequential, not parallel.
        Set<String> seen = new HashSet<>();
        List<Sort.Order> valid = sort.getOrders().stream()
                .filter(o -> o.getProperty() != null)
                .filter(o -> allowed.contains(o.getProperty()))
                .filter(o -> seen.add(o.getProperty()))
                .toList();

        if (valid.isEmpty()) {
            return List.of(Sort.Order.asc(defaultProperty));
        }
        return valid;
    }

    // ═══════════════════════════════════════════════════════════
    //  Builder — unchanged
    // ═══════════════════════════════════════════════════════════

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