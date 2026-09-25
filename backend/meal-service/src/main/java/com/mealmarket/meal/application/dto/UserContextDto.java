package com.mealmarket.meal.application.dto;

import java.util.UUID;

public record UserContextDto(
        String keycloakId,
        VendorContext vendor,
        CustomerContext customer,
        AdminContext admin
) {
    public record VendorContext(UUID id, String businessName, String status,
                                String profileImageUrl, String profileImageStorageRef) {}
    public record CustomerContext(UUID id, String displayName, String status) {}
    public record AdminContext(UUID id, String displayName, String status) {}
}