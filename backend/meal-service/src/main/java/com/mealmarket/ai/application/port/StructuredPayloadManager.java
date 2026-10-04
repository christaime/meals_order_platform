package com.mealmarket.ai.application.port;

import com.mealmarket.ai.application.dto.StructuredPayload;

import java.util.List;

/**
 * Collects {@link StructuredPayload} fragments produced during a
 * single tool loop and produces the final list attached to the
 * assistant turn.
 *
 * One instance is created per turn by {@link StructuredPayloadManagerFactory}.
 * Implementations are not required to be thread-safe and must not
 * retain state across turns.
 *
 * The orchestrator never inspects payload contents. It hands each
 * tool result to {@link #add} and asks for the final list via
 * {@link #finish}.
 */
public interface StructuredPayloadManager {

    /**
     * Register one payload produced by a tool call. Null payloads
     * are ignored. Implementations decide how to merge same-type
     * payloads and how to order different-type payloads.
     */
    void add(StructuredPayload payload);

    /**
     * Finish the turn and return the ordered, deduped payloads to
     * attach to the assistant reply.
     *
     * Never null. Returns an empty list when nothing was collected.
     */
    List<StructuredPayload> finish();
}