package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
public class Schedule {
  private final String id;
  private final String customerId;
  private final String vendorId;
  private final ScheduleType scheduleType;
  private final LocalDate startDate;
  private final LocalDate endDate;
  private final ScheduleStatus status;
  private final String paymentTerm;
  private final String deliveryAddress;
  private final String specialInstructions;
  private final Instant createdAt;
  private final Instant updatedAt;
  private final List<ScheduleItem> items;

  private Schedule(Builder builder) {
    this.id = builder.id;
    this.customerId = builder.customerId;
    this.vendorId = builder.vendorId;
    this.scheduleType = builder.scheduleType;
    this.startDate = builder.startDate;
    this.endDate = builder.endDate;
    this.status = builder.status;
    this.paymentTerm = builder.paymentTerm;
    this.deliveryAddress = builder.deliveryAddress;
    this.specialInstructions = builder.specialInstructions;
    this.createdAt = builder.createdAt;
    this.updatedAt = builder.updatedAt;
    this.items = builder.items != null ? new ArrayList<>(builder.items) : new ArrayList<>();
  }

  public static Builder builder() {
    return new Builder();
  }

  public enum ScheduleType {
    RECURRING,
    SPECIFIC,
    MIXED
  }

  public enum ScheduleStatus {
    ACTIVE,
    PAUSED,
    CANCELLED,
    COMPLETED
  }

  public static class Builder {
    private String id;

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    @NotBlank(message = "Vendor ID is required")
    private String vendorId;

    @NotNull(message = "Schedule type is required")
    private ScheduleType scheduleType;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private ScheduleStatus status = ScheduleStatus.ACTIVE;

    @NotBlank(message = "Payment term is required")
    @Size(max = 50, message = "Payment term cannot exceed 50 characters")
    private String paymentTerm;

    @Size(max = 255, message = "Delivery address cannot exceed 255 characters")
    private String deliveryAddress;

    @Size(max = 500, message = "Special instructions cannot exceed 500 characters")
    private String specialInstructions;

    private Instant createdAt;
    private Instant updatedAt;
    private List<ScheduleItem> items;

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

    public Builder scheduleType(ScheduleType scheduleType) {
      this.scheduleType = scheduleType;
      return this;
    }

    public Builder startDate(LocalDate startDate) {
      this.startDate = startDate;
      return this;
    }

    public Builder endDate(LocalDate endDate) {
      this.endDate = endDate;
      return this;
    }

    public Builder status(ScheduleStatus status) {
      this.status = status;
      return this;
    }

    public Builder paymentTerm(String paymentTerm) {
      this.paymentTerm = paymentTerm;
      return this;
    }

    public Builder deliveryAddress(String deliveryAddress) {
      this.deliveryAddress = deliveryAddress;
      return this;
    }

    public Builder specialInstructions(String specialInstructions) {
      this.specialInstructions = specialInstructions;
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

    public Builder items(List<ScheduleItem> items) {
      this.items = items;
      return this;
    }

    public Schedule build() {
      Schedule schedule = new Schedule(this);
      DomainValidation.validate(schedule);
      return schedule;
    }
  }
}
