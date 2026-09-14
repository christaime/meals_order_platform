package com.mealmarket.meal.application.dto;

import java.time.Instant;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
  private UUID id;
  private String userId;
  private String email;
  private String phone;
  private String firstName;
  private String lastName;
  private String defaultAddress;
  private String preferredPaymentMethod;
  private Boolean isActive;
  private Instant createdAt;
}
