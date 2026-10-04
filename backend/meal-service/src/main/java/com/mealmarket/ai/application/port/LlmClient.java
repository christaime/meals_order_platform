package com.mealmarket.ai.application.port;

import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.LlmResponse;
import com.mealmarket.ai.application.exception.LlmException;
import com.mealmarket.ai.application.tool.ToolDefinition;

import java.util.List;

/**
 * Provider-agnostic LLM client.
 *
 * The orchestrator depends on this interface — never on a concrete
 * provider implementation. Swapping OpenRouter for Anthropic, OpenAI,
 * or a local model is a matter of providing a different bean.
 */
public interface LlmClient {

    /**
     * Send a conversation and a tool catalogue to the LLM.
     *
     * @param messages ordered — must start with a SYSTEM message
     * @param tools    tool definitions; pass empty list for no tools
     * @return either a text reply, tool calls, or both
     * @throws LlmException on provider failure
     */
    LlmResponse complete(List<LlmMessage> messages, List<ToolDefinition> tools);

}