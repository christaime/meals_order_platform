package com.mealmarket.ai.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.mealmarket.ai.application.dto.ChatHistoryMessage;
import com.mealmarket.ai.application.dto.ChatHistoryResponse;
import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.domain.model.ChatSession;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatMessageEntity;
import com.mealmarket.ai.infrastructure.persistence.mapper.ConversationStoreEntityMapper;
import com.mealmarket.common.exception.AccessDeniedException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Read-only service for a session's visible conversation history.
 *
 * Owns pagination, ownership checks and cursor resolution. Knows
 * nothing about the LLM loop or tool execution — that lives in
 * {@link AgentOrchestrator}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryService {

    static final int DEFAULT_LIMIT = 10;
    static final int MAX_LIMIT = 50;

    private final ConversationStore conversationStore;
    private final ConversationStoreEntityMapper mapper;

    /**
     * Load one page of a session's visible history.
     *
     * @param sessionId  the session to read, as a string.
     * @param beforeId   optional cursor — return messages strictly older
     *                   than this message. Null means "latest page".
     * @param limit      requested page size; clamped to [1, MAX_LIMIT].
     * @param callerId   authenticated caller's user id, or null.
     *
     * @throws IllegalArgumentException if a UUID is malformed, or the
     *         cursor does not belong to the session.
     * @throws ResourceNotFoundException        if the session or cursor does not exist.
     * @throws AccessDeniedException    if the session belongs to another user.
     */
    public ChatHistoryResponse loadHistoryPage(String sessionId,
                                               String beforeId,
                                               int limit,
                                               UUID callerId) {

        UUID sid = requireUuid(sessionId, "sessionId");

        ChatSession session = conversationStore.findSession(sid)
                .orElseThrow(() -> new ResourceNotFoundException("session " + sid));

        if (session.getUserId() != null && !session.getUserId().equals(callerId)) {
            throw new AccessDeniedException("session belongs to another user");
        }

        int cappedLimit = clampLimit(limit);

        Cursor cursor = resolveCursor(beforeId, sid);

        // Fetch one extra row to detect hasMore without a count().
        List<AiChatMessageEntity> rows;
        if (cursor == Cursor.NONE) {
            rows = conversationStore.loadLatestMessagePage(sid, cappedLimit + 1);
        } else {
            rows = conversationStore.loadMessagePageBefore(
                    sid, cursor.timestamp(), cursor.id(), cappedLimit + 1);
        }
        boolean hasMore = rows.size() > cappedLimit;
        if (hasMore) {
            rows = rows.subList(0, cappedLimit);
        }
        Collections.reverse(rows);   // ascending for the client

        List<ChatHistoryMessage> messages = rows.stream()
                .map(this::toDto)
                .toList();

        String nextCursor = hasMore && !messages.isEmpty()
                ? messages.get(0).id()
                : null;

        log.debug("[MealMate] history page sid={} size={} hasMore={} cursor={}",
                sid, messages.size(), hasMore, nextCursor);

        return new ChatHistoryResponse(sid.toString(), messages, hasMore, nextCursor);
    }

    // ═══════════════════════════════════════════════════════════
    //  Internals
    // ═══════════════════════════════════════════════════════════

    private record Cursor(Instant timestamp, UUID id) {
        static final Cursor NONE = new Cursor(null, null);
    }

    private Cursor resolveCursor(String beforeId, UUID sessionId) {
        if (beforeId == null || beforeId.isBlank()) {
            return Cursor.NONE;
        }
        UUID bid = requireUuid(beforeId, "beforeId");

        if (!conversationStore.messageBelongsToSession(bid, sessionId)) {
            throw new IllegalArgumentException(
                    "cursor message " + bid + " does not belong to session " + sessionId);
        }

        Instant ts = conversationStore.findCreatedAt(bid)
                .orElseThrow(() -> new ResourceNotFoundException("message " + bid));

        return new Cursor(ts, bid);
    }

    private ChatHistoryMessage toDto(AiChatMessageEntity entity) {
        return new ChatHistoryMessage(
                entity.getId().toString(),
                entity.getRole().toLowerCase(),
                entity.getContent(),
                entity.getCreatedAt(),
                mapper.deserializeStructuredPayloads(entity.getStructuredPayload()));
    }

    private static int clampLimit(int requested) {
        if (requested < 1) return DEFAULT_LIMIT;
        return Math.min(requested, MAX_LIMIT);
    }

    private static UUID requireUuid(String raw, String field) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("invalid " + field + ": " + raw);
        }
    }
}