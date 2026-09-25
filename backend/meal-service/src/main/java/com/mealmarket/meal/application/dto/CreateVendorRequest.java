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
 * The vendor's userId (Keycloak ID) is assigned by the service after registration.
 * moderationStatus of Vendor is managed by VendorState — always starts as PENDING.
 *
 * Images are passed as MinIO storage refs (returned by POST /api/v1/media).
 * CNI refs are required for the moderation flow.
 */
public record CreateVendorRequest(

        @NotBlank(message = "Business name is required")
        @Size(min = 2, max = 100, message = "Business name must be between 2 and 100 characters")
        String businessName,

        @NotBlank(message = "Business owner name is required")
        @Size(min = 2, max = 100, message = "Business owner name must be between 2 and 100 characters")
        String ownerName,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be valid")
        String phone,

        @PositiveOrZero(message = "Delivery radius cannot be negative")
        Integer deliveryRadius,

        @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
        String pickupAddress,

        /**
         * MinIO storage ref of the vendor's profile image (logo).
         */
        @Size(max = 512, message = "Profile image storage ref cannot exceed 512 characters")
        String profileImageStorageRef,

        /**
         * MinIO storage ref of the vendor's cover image (banner).
         */
        @Size(max = 512, message = "Cover image storage ref cannot exceed 512 characters")
        String coverImageStorageRef,

        /**
         * MinIO storage ref of the CNI (national ID card) front side.
         * Required for vendor moderation.
         */
        //@NotBlank(message = "ID card front image is required")
        @Size(max = 512, message = "ID card front storage ref cannot exceed 512 characters")
        String idCardFrontStorageRef,

        /**
         * MinIO storage ref of the CNI (national ID card) back side.
         * Required for vendor moderation.
         */
        //@NotBlank(message = "ID card back image is required")
        @Size(max = 512, message = "ID card back storage ref cannot exceed 512 characters")
        String idCardBackStorageRef,

        /**
         * Cuisine category IDs (must be of type CUISINE).
         * These will be assigned to the vendor after creation.
         */
        List<UUID> cuisineCategoryIds
) {}