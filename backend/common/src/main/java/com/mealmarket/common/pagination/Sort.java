package com.mealmarket.common.pagination;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class Sort {

    private final List<Order> orders;

    private Sort(List<Order> orders) {
        this.orders = orders != null ? new ArrayList<>(orders) : new ArrayList<>();
    }

    public static Sort by(String field, Direction direction) {
        return new Sort(List.of(new Order(field, direction)));
    }

    public static Sort by(String field) {
        return new Sort(List.of(new Order(field, Direction.ASC)));
    }

    public static Sort unsorted() {
        return new Sort(List.of());
    }

    public Sort and(String field, Direction direction) {
        List<Order> newOrders = new ArrayList<>(this.orders);
        newOrders.add(new Order(field, direction));
        return new Sort(newOrders);
    }

    public boolean isSorted() {
        return !orders.isEmpty();
    }

    public boolean isUnsorted() {
        return orders.isEmpty();
    }

    @Getter
    public static class Order {
        private final String property;
        private final Direction direction;

        public Order(String property, Direction direction) {
            this.property = property;
            this.direction = direction;
        }

        public static Order asc(String property) {
            return new Order(property, Direction.ASC);
        }

        public static Order desc(String property) {
            return new Order(property, Direction.DESC);
        }
    }

    public enum Direction {
        ASC,
        DESC
    }
}