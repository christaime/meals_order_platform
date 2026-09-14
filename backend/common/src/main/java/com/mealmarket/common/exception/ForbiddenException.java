package com.mealmarket.common.exception;

/**
 * Thrown when a user attempts an action they are not authorized to perform,
 * such as accessing or modifying a resource they do not own.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }

    public ForbiddenException(String message, Throwable cause) {
        super(message, cause);
    }
}