package com.mealmarket.ai.infrastructure.llm;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.LlmResponse;
import com.mealmarket.ai.application.dto.LlmToolCall;
import com.mealmarket.ai.application.exception.LlmException;
import com.mealmarket.ai.application.port.LlmClient;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.infrastructure.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenRouter client — OpenAI chat-completions protocol with tool support.
 *
 * The orchestrator calls {@link #complete(List, List)} with the full
 * conversation and the current tool catalogue. The client sends both,
 * receives either a final assistant message or one or more tool calls,
 * and returns them parsed.
 */
@Component
@Slf4j
public class OpenRouterClient implements LlmClient {

    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenRouterClient(
            AiProperties properties,
            @Qualifier("openRouterRestClient") RestClient restClient,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public LlmResponse complete(List<LlmMessage> messages, List<ToolDefinition> tools) {
        AiProperties.OpenRouter cfg = properties.getOpenrouter();

        if (cfg.getApiKey() == null || cfg.getApiKey().isBlank()) {
            throw new LlmException(
                    "OPENROUTER_API_KEY is not set. Add it to .env or set the "
                            + "environment variable before starting the service.");
        }

        List<ApiMessage> apiMessages = messages.stream()
                .map(this::toApiMessage)
                .toList();

        List<ApiTool> apiTools = (tools == null || tools.isEmpty())
                ? null
                : tools.stream().map(this::toApiTool).toList();

        ChatCompletionRequest body = new ChatCompletionRequest(
                cfg.getModel(),
                apiMessages,
                apiTools,
                apiTools != null ? "auto" : null,
                cfg.getMaxTokens(),
                cfg.getTemperature()
        );

        try {
            ChatCompletionResponse response = restClient.post()
                    .uri("/chat/completions")
                    .body(body)
                    .retrieve()
                    .body(ChatCompletionResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new LlmException("LLM returned an empty response");
            }

            ApiChoice choice = response.choices().get(0);
            ApiMessage msg = choice.message();

            String content = msg.content();
            List<LlmToolCall> toolCalls = parseToolCalls(msg.toolCalls());

            LlmResponse.Usage usage = response.usage() != null
                    ? new LlmResponse.Usage(
                    response.usage().promptTokens(),
                    response.usage().completionTokens(),
                    response.usage().totalTokens())
                    : LlmResponse.Usage.UNKNOWN;

            log.debug("[MealMate] LLM replied: contentLen={} toolCalls={} finishReason={}",
                    content != null ? content.length() : 0,
                    toolCalls.size(),
                    choice.finishReason());

            return new LlmResponse(content, toolCalls, usage);

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            log.error("[MealMate] LLM call failed", e);
            throw new LlmException("LLM call failed: " + e.getMessage(), e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Conversions
    // ═══════════════════════════════════════════════════════════

    private ApiMessage toApiMessage(LlmMessage m) {
        List<ApiToolCall> toolCalls = null;
        if (m.toolCalls() != null && !m.toolCalls().isEmpty()) {
            toolCalls = m.toolCalls().stream()
                    .map(tc -> new ApiToolCall(
                            tc.id(),
                            "function",
                            new ApiFunctionCall(
                                    tc.name(),
                                    writeJson(tc.arguments())
                            ),
                            tc.extraContent()
                    ))
                    .toList();
        }

        return new ApiMessage(
                m.role().name().toLowerCase(),
                m.content(),
                toolCalls,
                m.toolCallId()
        );
    }

    private ApiTool toApiTool(ToolDefinition def) {
        return new ApiTool(
                "function",
                new ApiFunction(
                        def.name(),
                        def.description(),
                        def.parameters()
                )
        );
    }

    private List<LlmToolCall> parseToolCalls(List<ApiToolCall> apiCalls) {
        if (apiCalls == null || apiCalls.isEmpty()) return List.of();

        List<LlmToolCall> result = new ArrayList<>(apiCalls.size());
        for (ApiToolCall call : apiCalls) {
            Map<String, Object> args = parseJson(call.function().arguments());
            result.add(new LlmToolCall(
                    call.id(),
                    call.function().name(),
                    args,
                    call.extraContent()
            ));
        }
        return result;
    }

    private String writeJson(Map<String, Object> map) {
        if (map == null) return "{}";
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            log.warn("[MealMate] failed to serialize tool arguments", e);
            return "{}";
        }
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[MealMate] failed to parse tool arguments: {}", json, e);
            return Map.of();
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  OpenAI-compatible shapes
    // ═══════════════════════════════════════════════════════════

    private record ChatCompletionRequest(
            String model,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ApiMessage> messages,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ApiTool> tools,
            @JsonProperty("tool_choice") String toolChoice,
            @JsonProperty("max_tokens") int maxTokens,
            double temperature
    ) {}

    private record ApiMessage(
            String role,
            String content,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) @JsonProperty("tool_calls") List<ApiToolCall> toolCalls,
            @JsonProperty("tool_call_id") String toolCallId
    ) {}

    private record ApiTool(
            String type,
            ApiFunction function
    ) {}

    private record ApiFunction(
            String name,
            String description,
            Map<String, Object> parameters
    ) {}

    private record ApiToolCall(
            String id,
            String type,
            ApiFunctionCall function,
            @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("extra_content") Map<String, Object> extraContent
    ) {}

    private record ApiFunctionCall(
            String name,
            String arguments
    ) {}

    private record ChatCompletionResponse(
            List<ApiChoice> choices,
            Usage usage
    ) {}

    private record ApiChoice(
            ApiMessage message,
            @JsonProperty("finish_reason") String finishReason
    ) {}

    private record Usage(
            @JsonProperty("prompt_tokens") int promptTokens,
            @JsonProperty("completion_tokens") int completionTokens,
            @JsonProperty("total_tokens") int totalTokens
    ) {}
}