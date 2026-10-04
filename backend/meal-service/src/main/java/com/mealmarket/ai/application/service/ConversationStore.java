package com.mealmarket.ai.application.service;

import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.domain.model.ChatSession;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatMessageEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Port for the MealMate conversation persistence.
 *
 * Speaks the domain model outward; the concrete adapter converts to
 * JPA entities internally. Nothing outside the persistence layer
 * should ever see {@code AiChatSessionEntity} or {@code AiChatMessageEntity}.
 */
public interface ConversationStore {

    /**
     * Resolve the session for an incoming turn.
     *
     * Contract:
     *  - Authenticated caller with a known session id → that session.
     *  - Authenticated caller with an anonymous session id → claim it,
     *    or merge it into the user's canonical session and delete it.
     *  - Authenticated caller with no usable id → resume the canonical
     *    session, or create one if none exists.
     *  - Anonymous caller with a known anonymous id → that session.
     *  - Otherwise → fresh session.
     *
     * One authenticated user always ends up with exactly one session.
     *
     * @param sessionId the client-provided session id (nullable)
     * @param userId    the authenticated user's id, or null for anonymous
     * @param userType  the user's role ("CUSTOMER", "VENDOR", "ADMIN"), or null
     * @return the domain session
     */
    ChatSession getOrCreateSession(String sessionId, UUID userId, String userType);

    /** Full sanitized history for the LLM loop. Ascending, includes TOOL rows. */
    List<LlmMessage> loadHistory(UUID sessionId);

    /**
     * Append one turn and bump the session aggregates.
     *
     * {@code payloads} is non-empty only for the final assistant turn
     * of a tool loop that produced UI payloads. Empty or null for
     * every other turn. Stored as a JSONB array, or NULL when empty.
     */
    void append(UUID sessionId, LlmMessage message, List<StructuredPayload> payloads);

    /** Resolve a session by id. Used for ownership checks. */
    Optional<ChatSession> findSession(UUID sessionId);

    /** Timestamp of a message — used to resolve a pagination cursor. */
    Optional<Instant> findCreatedAt(UUID messageId);

    /** Confirm a message belongs to a session — used to validate the cursor. */
    boolean messageBelongsToSession(UUID messageId, UUID sessionId);

    /**
     * One page of visible messages (USER + ASSISTANT, non-empty content),
     * sorted by (created_at, id) DESC.
     *
     * Cursor semantics: null cursorTs means "latest page". Otherwise
     * strictly older than (cursorTs, cursorId).
     *
     * Returns at most {@code limit} rows.
     */
    List<AiChatMessageEntity> loadMessagePage(UUID sessionId,
                                              Instant cursorTs,
                                              UUID cursorId,
                                              int limit);

    List<AiChatMessageEntity> loadLatestMessagePage(UUID sessionId, int limit);

    List<AiChatMessageEntity> loadMessagePageBefore(UUID sessionId,
                                                    Instant cursorTs,
                                                    UUID cursorId,
                                                    int limit);
}