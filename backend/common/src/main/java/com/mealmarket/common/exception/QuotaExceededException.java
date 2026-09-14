package com.mealmarket.common.exception;

/**
 * Thrown when a vendor attempts to exceed their subscription quota.
 * Maps to HTTP 402 Payment Required.
 */
public class QuotaExceededException extends RuntimeException {

    public QuotaExceededException(String message) {
        super(message);
    }

    public QuotaExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}