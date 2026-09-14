package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.Getter;

@Getter
public class Customer {
  private final String id;
  private final String userId;
  private final String email;
  private final String phone;
  private final String firstName;
  private final String lastName;
  private final String defaultAddress;
  private final String preferredPaymentMethod;
  private final Boolean isActive;
  private final Instant createdAt;
  private final Instant updatedAt;
  private final Instant lastLogin;

  private Customer(Builder builder) {
    this.id = builder.id;
    this.userId = builder.userId;
    this.email = builder.email;
    this.phone = builder.phone;
    this.firstName = builder.firstName;
    this.lastName = builder.lastName;
    this.defaultAddress = builder.defaultAddress;
    this.preferredPaymentMethod = builder.preferredPaymentMethod;
    this.isActive = builder.isActive;
    this.createdAt = builder.createdAt;
    this.updatedAt = builder.updatedAt;
    this.lastLogin = builder.lastLogin;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String id;

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be valid")
    private String phone;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;

    @Size(max = 255, message = "Default address cannot exceed 255 characters")
    private String defaultAddress;

    @Size(max = 50, message = "Payment method cannot exceed 50 characters")
    private String preferredPaymentMethod;

    private Boolean isActive = true;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastLogin;

    public Builder id(String id) {
      this.id = id;
      return this;
    }

    public Builder userId(String userId) {
      this.userId = userId;
      return this;
    }

    public Builder email(String email) {
      this.email = email;
      return this;
    }

    public Builder phone(String phone) {
      this.phone = phone;
      return this;
    }

    public Builder firstName(String firstName) {
      this.firstName = firstName;
      return this;
    }

    public Builder lastName(String lastName) {
      this.lastName = lastName;
      return this;
    }

    public Builder defaultAddress(String defaultAddress) {
      this.defaultAddress = defaultAddress;
      return this;
    }

    public Builder preferredPaymentMethod(String preferredPaymentMethod) {
      this.preferredPaymentMethod = preferredPaymentMethod;
      return this;
    }

    public Builder isActive(Boolean isActive) {
      this.isActive = isActive;
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

    public Builder lastLogin(Instant lastLogin) {
      this.lastLogin = lastLogin;
      return this;
    }

    public Customer build() {
      Customer customer = new Customer(this);
      DomainValidation.validate(customer);
      return customer;
    }
  }
}
