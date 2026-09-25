package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Request to update a vendor's profile.
 *
 * Does NOT include:
 * - password (managed by Keycloak)
 * - status (managed via VendorState transitions)
 * - userId (immutable)
 *
 * Image refs: null = unchanged, empty string = cleared.
 * CNI refs follow the same convention.
 */
public record UpdateVendorRequest(

        @Size(min = 2, max = 100, message = "Business name must be between 2 and 100 characters")
        String businessName,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @Email(message = "Email must be valid")
        String email,

        @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be valid")
        String phone,

        @PositiveOrZero(message = "Delivery radius cannot be negative")
        Integer deliveryRadius,

        @Size(max = 255, message = "Pickup address cannot exceed 255 characters")
        String pickupAddress,

        /**
         * MinIO storage ref of the profile image. Null = unchanged, "" = cleared.
         */
        @Size(max = 512, message = "Profile image storage ref cannot exceed 512 characters")
        String profileImageStorageRef,

        /**
         * MinIO storage ref of the cover image. Null = unchanged, "" = cleared.
         */
        @Size(max = 512, message = "Cover image storage ref cannot exceed 512 characters")
        String coverImageStorageRef,

        /**
         * MinIO storage ref of the CNI front side. Null = unchanged, "" = cleared.
         */
        @Size(max = 512, message = "ID card front storage ref cannot exceed 512 characters")
        String idCardFrontStorageRef,

        /**
         * MinIO storage ref of the CNI back side. Null = unchanged, "" = cleared.
         */
        @Size(max = 512, message = "ID card back storage ref cannot exceed 512 characters")
        String idCardBackStorageRef,

        /**
         * Full replacement list of cuisine category IDs.
         * If null, cuisines are unchanged. If empty, all cuisines are removed.
         */
        List<UUID> cuisineCategoryIds
) {}