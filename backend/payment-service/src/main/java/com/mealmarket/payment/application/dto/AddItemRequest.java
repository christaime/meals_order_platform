package com.mealmarket.payment.application.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AddItemRequest(
    @NotNull(message = "Meal ID is required") Long mealId,
    @NotNull(message = "Meal name is required") String mealName,
    @NotNull(message = "Price is required") BigDecimal price,
    @Min(value = 1, message = "Quantity must be at least 1") int quantity) {}
