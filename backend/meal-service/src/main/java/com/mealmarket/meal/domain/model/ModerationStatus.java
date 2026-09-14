package com.mealmarket.meal.domain.model;

/**
 * Lifecycle status for moderated reference data.
 */
public enum ModerationStatus {

    /**
     * Created by a vendor, awaiting admin review.
     * Hidden from customers; visible only to the creating vendor.
     */
    PENDING,

    /**
     * Approved by admin (or auto-approved because admin-created).
     * Visible and usable by everyone.
     */
    APPROVED,

    /**
     * Rejected by admin. Vendor-created only.
     * Hidden; vendor sees the rejection reason.
     */
    REJECTED,

    /**
     * Retired by admin (soft delete).
     * Hidden from new usage; historical references preserved.
     */
    DISABLED
}