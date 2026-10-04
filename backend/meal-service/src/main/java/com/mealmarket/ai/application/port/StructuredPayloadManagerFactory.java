package com.mealmarket.ai.application.port;

/**
 * Creates a fresh {@link StructuredPayloadManager} for one turn.
 *
 * A factory — rather than a shared singleton — because the manager
 * accumulates state during a tool loop and must not be shared across
 * concurrent requests.
 */
@FunctionalInterface
public interface StructuredPayloadManagerFactory {
    StructuredPayloadManager create();
}