package com.mealmarket.ai.application.exception;

/**
 * Raised when the LLM provider fails or returns an unexpected response.
 * The orchestrator catches this and returns a friendly error message
 * to the user instead of a 500.
 */
public class LlmException extends RuntimeException {

    public LlmException(String message) {
        super(message);
    }

    public LlmException(String message, Throwable cause) {
        super(message, cause);
    }
}