package com.mealmarket.meal.application.exception;

import java.util.UUID;

public class VendorAlreadyRegisteredException extends RuntimeException {
    protected UUID vendorUserId;

    public VendorAlreadyRegisteredException(String message) {
        super(message);
    }
    public VendorAlreadyRegisteredException(String message, Throwable cause) {
        super(message, cause);
    }
    public VendorAlreadyRegisteredException(UUID userId) {
        super();
        vendorUserId = userId;
    }
}
