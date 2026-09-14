package com.mealmarket.meal.domain.model;

import com.mealmarket.common.enums.OrderStatus;
import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
public class Order {
  private final String id;
  private final String customerId;
  private final String vendorId;
  private final String invoiceId;
  private final OrderStatus status;
  private final BigDecimal totalAmount;
  private final String deliveryType;
  private final String deliveryAddress;
  private final String pickupAddress;
  private final String deliveryInstructions;
  private final String specialInstructions;
  private final LocalDateTime scheduledDate;
  private final String paymentTerm;
  private final Instant createdAt;
  private final Instant updatedAt;
  private final List<OrderItem> items;

  private Order(Builder builder) {
    this.id = builder.id;
    this.customerId = builder.customerId;
    this.vendorId = builder.vendorId;
    this.invoiceId = builder.invoiceId;
    this.status = builder.status;
    this.totalAmount = builder.totalAmount;
    this.deliveryType = builder.deliveryType;
    this.deliveryAddress = builder.deliveryAddress;
    this.pickupAddress = builder.pickupAddress;
    this.deliveryInstructions = builder.deliveryInstructions;
    this.specialInstructions = builder.specialInstructions;
    this.scheduledDate = builder.scheduledDate;
    this.paymentTerm = builder.paymentTerm;
    this.createdAt = builder.createdAt;
    this.updatedAt = builder.updatedAt;
    this.items = builder.items != null ? new ArrayList<>(builder.items) : new ArrayList<>();
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String id;

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    @NotBlank(message = "Vendor ID is required")
    private String vendorId;

    private String invoiceId;

    private OrderStatus status = OrderStatus.PENDING;

    @NotNull(message = "Total amount is required")
    @Positive(message = "Total amount must be greater than zero")
    private BigDecimal totalAmount;

    @NotBlank(message = "Delivery type is required")
    @Size(max = 50, message = "Delivery type cannot exceed 50 characters")
    private String deliveryType;

    @Size(max = 255, message = "Delivery address cannot exceed 255 characters")
    private String deliveryAddress;

    @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
    private String pickupAddress;

    @Size(max = 500, message = "Delivery instructions cannot exceed 500 characters")
    private String deliveryInstructions;

    @Size(max = 500, message = "Special instructions cannot exceed 500 characters")
    private String specialInstructions;

    private LocalDateTime scheduledDate;

    @Size(max = 50, message = "Payment term cannot exceed 50 characters")
    private String paymentTerm;

    private Instant createdAt;
    private Instant updatedAt;
    private List<OrderItem> items;

    public Builder id(String id) {
      this.id = id;
      return this;
    }

    public Builder customerId(String customerId) {
      this.customerId = customerId;
      return this;
    }

    public Builder vendorId(String vendorId) {
      this.vendorId = vendorId;
      return this;
    }

    public Builder invoiceId(String invoiceId) {
      this.invoiceId = invoiceId;
      return this;
    }

    public Builder status(OrderStatus status) {
      this.status = status;
      return this;
    }

    public Builder totalAmount(BigDecimal totalAmount) {
      this.totalAmount = totalAmount;
      return this;
    }

    public Builder deliveryType(String deliveryType) {
      this.deliveryType = deliveryType;
      return this;
    }

    public Builder deliveryAddress(String deliveryAddress) {
      this.deliveryAddress = deliveryAddress;
      return this;
    }

    public Builder pickupAddress(String pickupAddress) {
      this.pickupAddress = pickupAddress;
      return this;
    }

    public Builder deliveryInstructions(String deliveryInstructions) {
      this.deliveryInstructions = deliveryInstructions;
      return this;
    }

    public Builder specialInstructions(String specialInstructions) {
      this.specialInstructions = specialInstructions;
      return this;
    }

    public Builder scheduledDate(LocalDateTime scheduledDate) {
      this.scheduledDate = scheduledDate;
      return this;
    }

    public Builder paymentTerm(String paymentTerm) {
      this.paymentTerm = paymentTerm;
      return this;
    }

    public Builder createdAt(Instant createdAt) {
      this.createdAt = createdAt;
      return this;
    }

    public Builder updatedAt(Instant updatedAt) {
      this.updatedAt = updatedAt;
      return this;
    }

    public Builder items(List<OrderItem> items) {
      this.items = items;
      return this;
    }

    public Order build() {
      Order order = new Order(this);
      DomainValidation.validate(order);
      return order;
    }
  }
}
