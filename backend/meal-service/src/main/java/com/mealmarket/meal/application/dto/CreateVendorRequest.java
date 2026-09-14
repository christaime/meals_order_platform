package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Request to register a new vendor.
 *
 * The password is sent to Keycloak (not stored in the vendor domain).
 * The vendor's userId (Keycloak ID) is assigned by the service after registration.
 * moderationStatus of Vendor is managed by VendorState — always starts as PENDING.
 */
public record CreateVendorRequest(

        @NotBlank(message = "Business name is required")
        @Size(min = 2, max = 100, message = "Business name must be between 2 and 100 characters")
        String businessName,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be valid")
        String phone,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String password,

        @PositiveOrZero(message = "Delivery radius cannot be negative")
        Integer deliveryRadius,

        @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
        String pickupAddress,

        /**
         * Cuisine category IDs (must be of type CUISINE).
         * These will be assigned to the vendor after creation.
         */
        List<UUID> cuisineCategoryIds
) {}