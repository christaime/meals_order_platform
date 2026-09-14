package com.mealmarket.payment.application.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartDto(Long id, Long customerId, List<CartItemDto> items, BigDecimal totalPrice) {}
