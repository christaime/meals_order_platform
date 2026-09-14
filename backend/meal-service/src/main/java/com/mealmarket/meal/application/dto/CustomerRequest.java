package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRequest {
  @NotBlank @Email private String email;

  @NotBlank private String phone;

  @NotBlank private String firstName;

  @NotBlank private String lastName;

  private String defaultAddress;
  private String preferredPaymentMethod;

  @NotBlank private String password;

  private UUID userId;
}
