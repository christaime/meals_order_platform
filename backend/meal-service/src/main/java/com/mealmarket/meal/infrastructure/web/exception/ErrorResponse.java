package com.mealmarket.meal.infrastructure.web.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Standard error response returned by the API for all handled exceptions.
 * Every error has the same shape — clients can rely on it.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldError> fieldErrors,
        Map<String, Object> details
) {

    public record FieldError(
            String field,
            String message,
            Object rejectedValue
    ) {}

    // ─── Convenience Factories ────────────────────────────────

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path, null, null);
    }

    public static ErrorResponse withFieldErrors(
            int status, String error, String message, String path,
            List<FieldError> fieldErrors
    ) {
        return new ErrorResponse(Instant.now(), status, error, message, path, fieldErrors, null);
    }

    public static ErrorResponse withDetails(
            int status, String error, String message, String path,
            Map<String, Object> details
    ) {
        return new ErrorResponse(Instant.now(), status, error, message, path, null, details);
    }
}