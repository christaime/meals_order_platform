package com.mealmarket.payment.application.dto;

import java.math.BigDecimal;

public record CartItemDto(
    Long id, Long mealId, String mealName, BigDecimal price, int quantity, BigDecimal subtotal) {}
