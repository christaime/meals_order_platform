package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import lombok.Getter;

@Getter
public class ScheduleItem {
  private final String id;
  private final String mealId;
  private final String mealName;
  private final LocalDate specificDate;
  private final Integer dayOfWeek;
  private final Boolean isRecurring;
  private final Integer quantity;

  private ScheduleItem(Builder builder) {
    this.id = builder.id;
    this.mealId = builder.mealId;
    this.mealName = builder.mealName;
    this.specificDate = builder.specificDate;
    this.dayOfWeek = builder.dayOfWeek;
    this.isRecurring = builder.isRecurring;
    this.quantity = builder.quantity;
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

    private LocalDate specificDate;
    private Integer dayOfWeek;
    private Boolean isRecurring;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private Integer quantity;

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

    public Builder specificDate(LocalDate specificDate) {
      this.specificDate = specificDate;
      return this;
    }

    public Builder dayOfWeek(Integer dayOfWeek) {
      this.dayOfWeek = dayOfWeek;
      return this;
    }

    public Builder isRecurring(Boolean isRecurring) {
      this.isRecurring = isRecurring;
      return this;
    }

    public Builder quantity(Integer quantity) {
      this.quantity = quantity;
      return this;
    }

    public ScheduleItem build() {
      ScheduleItem item = new ScheduleItem(this);
      DomainValidation.validate(item);
      return item;
    }
  }
}
