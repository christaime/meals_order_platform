package com.mealmarket.ai.infrastructure.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.LlmToolCall;
import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.domain.model.ChatSession;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatMessageEntity;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatSessionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.Map;

/**
 * Maps between the MealMate conversation entities and the domain /
 * application DTOs.
 *
 * Two responsibilities:
 *   1. {@code ChatSession} ↔ {@code AiChatSessionEntity} — plain field mapping.
 *   2. {@code AiChatMessageEntity} ↔ {@code LlmMessage} — role-dependent,
 *      because the shape of an LlmMessage varies with its role:
 *        - USER / SYSTEM: text only
 *        - ASSISTANT:     text OR tool-call carrier
 *        - TOOL:          result text + tool_call_id (from metadata)
 *
 * JSON handling (serializing tool calls, parsing tool_call_id) lives in
 * {@code default} methods that delegate to Jackson, so the MapStruct-
 * generated code stays declarative.
 */
@Mapper(componentModel = "spring")
public interface ConversationStoreEntityMapper {

    // ═══════════════════════════════════════════════════════════
    //  Session: entity ↔ domain
    // ═══════════════════════════════════════════════════════════

    @Mapping(target = "status", source = "status", qualifiedByName = "statusFromString")
    @Mapping(target = "messageCount", source = "messageCount", defaultValue = "0")
    ChatSession toDomain(AiChatSessionEntity entity);

    @Mapping(target = "status", source = "status", qualifiedByName = "statusToString")
    AiChatSessionEntity toEntity(ChatSession session);

    // ═══════════════════════════════════════════════════════════
    //  Message: LlmMessage → JSON-ready column values
    //
    //  These aren't full entity mappings — the adapter builds the
    //  entity and calls these for the JSONB columns. Exposing them
    //  as mapper methods keeps the JSON logic in one place.
    // ═══════════════════════════════════════════════════════════

    @Named("serializeToolCalls")
    default String serializeToolCalls(LlmMessage message) {
        List<LlmToolCall> toolCalls = message.toolCalls();
        if (toolCalls == null || toolCalls.isEmpty()) return null;
        try {
            return objectMapper().writeValueAsString(toolCalls);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to serialize tool calls: " + e.getMessage(), e);
        }
    }

    @Named("serializeMetadata")
    default String serializeMetadata(LlmMessage message) {
        if (message.role() != LlmMessage.Role.TOOL) return null;
        String id = message.toolCallId();
        if (id == null || id.isBlank()) return null;
        try {
            return objectMapper().writeValueAsString(Map.of("tool_call_id", id));
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to serialize tool_call_id: " + e.getMessage(), e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers (default methods)
    // ═══════════════════════════════════════════════════════════

    @Named("statusFromString")
    default ChatSession.Status statusFromString(String value) {
        return value != null ? ChatSession.Status.valueOf(value) : ChatSession.Status.ACTIVE;
    }

    @Named("statusToString")
    default String statusToString(ChatSession.Status status) {
        return status != null ? status.name() : ChatSession.Status.ACTIVE.name();
    }

    /**
     * Rebuild an {@link LlmMessage} from a persisted entity.
     *
     * The mapping depends on the role:
     *   - TOOL       → tool result; the id comes from `metadata.tool_call_id`
     *   - ASSISTANT  → tool-call carrier if `tool_calls` is non-empty, else text
     *   - USER/SYSTEM→ text only
     */
    @Named("toLlmMessage")
    default LlmMessage toLlmMessage(AiChatMessageEntity entity) {
        if (entity == null) return null;

        LlmMessage.Role role = LlmMessage.Role.valueOf(entity.getRole());

        return switch (role) {
            case TOOL -> LlmMessage.tool(
                    extractToolCallId(entity.getMetadata()),
                    entity.getContent()
            );
            case ASSISTANT -> {
                List<LlmToolCall> toolCalls = deserializeToolCalls(entity.getToolCalls());
                yield (toolCalls != null && !toolCalls.isEmpty())
                        ? LlmMessage.assistantWithToolCalls(toolCalls)
                        : LlmMessage.assistant(entity.getContent());
            }
            default -> new LlmMessage(role, entity.getContent(), null, null);
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  JSON parsing helpers (private-by-convention; Java 8 doesn't
    //  allow private interface methods until Java 9, but this is
    //  Java 17 so we could use them — kept public for testability)
    // ═══════════════════════════════════════════════════════════

    default List<LlmToolCall> deserializeToolCalls(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper().readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    default String extractToolCallId(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) return null;
        try {
            Map<String, Object> metadata = objectMapper()
                    .readValue(metadataJson, new TypeReference<>() {});
            Object id = metadata.get("tool_call_id");
            return id instanceof String s ? s : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * The mapper is a Spring bean; MapStruct will inject the application's
     * ObjectMapper if we declare a getter — but MapStruct doesn't support
     * constructor injection on interfaces. So we look it up lazily.
     *
     * If your project uses Spring's {@code MapperConfig} with a shared
     * ObjectMapper, swap this for a proper injection.
     */
    default ObjectMapper objectMapper() {
        return ObjectMapperHolder.INSTANCE;
    }

    /**
     * Static holder — a single shared ObjectMapper for all mapper calls.
     * Not ideal for tests that want to swap the mapper, but adequate
     * for production use where the ObjectMapper config doesn't change.
     *
     * Replace with Spring injection when you need configurability:
     * change the mapper to an {@code abstract class} and add
     * {@code @Autowired ObjectMapper}.
     */
    final class ObjectMapperHolder {
        static final ObjectMapper INSTANCE = new ObjectMapper();
        private ObjectMapperHolder() {}
    }

    default String serializeStructuredPayload(StructuredPayload payload) {
        if (payload == null) return null;
        try {
            return ObjectMapperHolder.INSTANCE.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("failed to serialize structured payload", e);
        }
    }

    @SuppressWarnings("unchecked")
    default StructuredPayload deserializeStructuredPayload(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return ObjectMapperHolder.INSTANCE.readValue(json, StructuredPayload.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("failed to deserialize structured payload", e);
        }
    }

    default String serializeStructuredPayloads(List<StructuredPayload> payloads) {
        if (payloads == null || payloads.isEmpty()) return null;
        try {
            return ObjectMapperHolder.INSTANCE.writeValueAsString(payloads);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("failed to serialize structured payloads", e);
        }
    }

    default List<StructuredPayload> deserializeStructuredPayloads(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = ObjectMapperHolder.INSTANCE.readTree(json);
            if (node.isArray()) {
                return ObjectMapperHolder.INSTANCE.convertValue(
                        node, new TypeReference<List<StructuredPayload>>() {});
            }
            // Legacy single-object row (pre-refactor).
            return List.of(ObjectMapperHolder.INSTANCE.treeToValue(
                    node, StructuredPayload.class));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("failed to deserialize structured payloads", e);
        }
    }
}