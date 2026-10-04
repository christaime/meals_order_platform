package com.mealmarket.ai.application.tool;

import java.util.Map;

/**
 * A capability the LLM may invoke.
 *
 * Implementations must:
 *   - validate the LLM's arguments (the LLM can send anything)
 *   - never trust the arguments blindly
 *   - return a structured result, not raw JPA entities
 *   - throw nothing the orchestrator can't handle
 *
 * The {@code execute} method receives the raw arguments map from the
 * LLM (already parsed from JSON). Implementations extract what they
 * need, ignore what they don't, and coerce types where reasonable.
 */
public interface Tool {

    /** Metadata shown to the LLM so it knows when and how to call this tool. */
    ToolDefinition definition();

    /**
     * Execute the tool with the LLM's arguments.
     *
     * @param arguments the decoded JSON arguments map
     * @param context   the per-request context (user, session, locale)
     * @return the result the LLM will see as the tool's response
     */
    ToolResult execute(Map<String, Object> arguments, ToolContext context);
}