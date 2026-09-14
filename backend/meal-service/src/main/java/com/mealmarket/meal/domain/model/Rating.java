package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.Getter;

@Getter
public class Rating {
  private final String id;
  private final String customerId;
  private final String mealId;
  private final String vendorId;
  private final String orderId;
  private final Integer mealRating;
  private final Integer vendorRating;
  private final Integer deliveryRating;
  private final String comment;
  private final Instant createdAt;

  private Rating(Builder builder) {
    this.id = builder.id;
    this.customerId = builder.customerId;
    this.mealId = builder.mealId;
    this.vendorId = builder.vendorId;
    this.orderId = builder.orderId;
    this.mealRating = builder.mealRating;
    this.vendorRating = builder.vendorRating;
    this.deliveryRating = builder.deliveryRating;
    this.comment = builder.comment;
    this.createdAt = builder.createdAt;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String id;

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    private String mealId;
    private String vendorId;

    @NotBlank(message = "Order ID is required")
    private String orderId;

    @NotNull(message = "Meal rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer mealRating;

    @NotNull(message = "Vendor rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer vendorRating;

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer deliveryRating;

    @Size(max = 1000, message = "Comment cannot exceed 1000 characters")
    private String comment;

    private Instant createdAt;

    public Builder id(String id) {
      this.id = id;
      return this;
    }

    public Builder customerId(String customerId) {
      this.customerId = customerId;
      return this;
    }

    public Builder mealId(String mealId) {
      this.mealId = mealId;
      return this;
    }

    public Builder vendorId(String vendorId) {
      this.vendorId = vendorId;
      return this;
    }

    public Builder orderId(String orderId) {
      this.orderId = orderId;
      return this;
    }

    public Builder mealRating(Integer mealRating) {
      this.mealRating = mealRating;
      return this;
    }

    public Builder vendorRating(Integer vendorRating) {
      this.vendorRating = vendorRating;
      return this;
    }

    public Builder deliveryRating(Integer deliveryRating) {
      this.deliveryRating = deliveryRating;
      return this;
    }

    public Builder comment(String comment) {
      this.comment = comment;
      return this;
    }

    public Builder createdAt(Instant createdAt) {
      this.createdAt = createdAt;
      return this;
    }

    public Rating build() {
      Rating rating = new Rating(this);
      DomainValidation.validate(rating);
      return rating;
    }
  }
}
