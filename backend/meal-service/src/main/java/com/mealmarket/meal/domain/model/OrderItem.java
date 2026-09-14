package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import lombok.Getter;

@Getter
public class OrderItem {
  private final String id;
  private final String mealId;
  private final String mealName;
  private final Integer quantity;
  private final BigDecimal unitPrice;
  private final BigDecimal totalPrice;

  private OrderItem(Builder builder) {
    this.id = builder.id;
    this.mealId = builder.mealId;
    this.mealName = builder.mealName;
    this.quantity = builder.quantity;
    this.unitPrice = builder.unitPrice;
    this.totalPrice = builder.totalPrice;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String id;

    @NotBlank(message = "Meal ID is required")
    private String mealId;

    @NotBlank(message = "Meal name is required")
    private String mealName;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @Positive(message = "Unit price must be greater than zero")
    private BigDecimal unitPrice;

    @NotNull(message = "Total price is required")
    @Positive(message = "Total price must be greater than zero")
    private BigDecimal totalPrice;

    public Builder id(String id) {
      this.id = id;
      return this;
    }

    public Builder mealId(String mealId) {
      this.mealId = mealId;
      return this;
    }

    public Builder mealName(String mealName) {
      this.mealName = mealName;
      return this;
    }

    public Builder quantity(Integer quantity) {
      this.quantity = quantity;
      return this;
    }

    public Builder unitPrice(BigDecimal unitPrice) {
      this.unitPrice = unitPrice;
      return this;
    }

    public Builder totalPrice(BigDecimal totalPrice) {
      this.totalPrice = totalPrice;
      return this;
    }

    public OrderItem build() {
      OrderItem item = new OrderItem(this);
      DomainValidation.validate(item);
      return item;
    }
  }
}
