package com.mealmarket.meal.infrastructure.persistence.adapter.utils;

import com.mealmarket.common.pagination.SearchRequest;
import com.mealmarket.common.pagination.Sort;
import org.springframework.data.domain.Sort.Direction;

import java.util.List;

/**
 * Converts between the domain-level {@link Sort.Order} used by
 * {@link SearchRequest} and Spring Data's
 * {@link org.springframework.data.domain.Sort}.
 *
 * Lives in `common.pagination` because every adapter that maps a
 * SearchRequest to a Spring Data Pageable uses it.
 */
public final class SortConverter {

    private SortConverter() {}

    /**
     * Domain orders → Spring Data Sort.
     * Empty input → {@link org.springframework.data.domain.Sort#unsorted()}.
     */
    public static org.springframework.data.domain.Sort toSpringSort(List<Sort.Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return org.springframework.data.domain.Sort.unsorted();
        }
        List<org.springframework.data.domain.Sort.Order> springOrders = orders.stream()
                .map(SortConverter::toSpringOrder)
                .toList();
        return org.springframework.data.domain.Sort.by(springOrders);
    }

    private static org.springframework.data.domain.Sort.Order toSpringOrder(Sort.Order order) {
        Direction direction = order.getDirection() == Sort.Direction.ASC
                ? Direction.ASC
                : Direction.DESC;
        return new org.springframework.data.domain.Sort.Order(direction, order.getProperty());
    }
}