package com.mealmarket.ai.infrastructure.persistence.adapter;

import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.application.service.ConversationStore;
import com.mealmarket.ai.domain.model.ChatSession;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatMessageEntity;
import com.mealmarket.ai.infrastructure.persistence.entity.AiChatSessionEntity;
import com.mealmarket.ai.infrastructure.persistence.mapper.ConversationStoreEntityMapper;
import com.mealmarket.ai.infrastructure.persistence.repository.AiChatMessageJpaRepository;
import com.mealmarket.ai.infrastructure.persistence.repository.AiChatSessionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Persistence adapter for {@link ConversationStore}.
 *
 * Enforces the "one authenticated user ↔ one session" invariant
 * inside {@link #getOrCreateSession}. All entity ↔ domain conversion
 * is delegated to {@link ConversationStoreEntityMapper}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationStoreAdapter implements ConversationStore {

    private static final String STATUS_ACTIVE = "ACTIVE";

    private final AiChatSessionJpaRepository sessionRepo;
    private final AiChatMessageJpaRepository messageRepo;
    private final ConversationStoreEntityMapper mapper;

    // ═══════════════════════════════════════════════════════════
    //  Session resolution
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional
    public ChatSession getOrCreateSession(String sessionId, UUID userId, String userType) {
        UUID incoming = parseSessionId(sessionId);

        // ---- Authenticated caller ------------------------------------
        if (userId != null) {
            if (incoming != null) {
                Optional<AiChatSessionEntity> row = sessionRepo.findById(incoming);
                if (row.isPresent()) {
                    return resolveAuthenticated(row.get(), userId, userType, incoming);
                }
                log.debug("[MealMate] unknown sessionId {} for user={} — resuming canonical",
                        incoming, userId);
            }

            return sessionRepo
                    .findFirstByUserIdAndStatusOrderByLastMessageAtDesc(userId, STATUS_ACTIVE)
                    .map(mapper::toDomain)
                    .orElseGet(() -> {
                        ChatSession created = ChatSession.create(userId, userType);
                        sessionRepo.save(mapper.toEntity(created));
                        log.info("[MealMate] created session {} for user={}", created.getId(), userId);
                        return created;
                    });
        }

        // ---- Anonymous caller ---------------------------------------
        if (incoming != null) {
            Optional<AiChatSessionEntity> row = sessionRepo.findById(incoming);
            if (row.isPresent() && row.get().getUserId() == null) {
                return mapper.toDomain(row.get());
            }
            if (row.isPresent()) {
                log.warn("[MealMate] anonymous caller supplied user-bound session {} — creating fresh",
                        incoming);
            }
        }

        ChatSession created = ChatSession.create(null, null);
        sessionRepo.save(mapper.toEntity(created));
        log.debug("[MealMate] created anonymous session {}", created.getId());
        return created;
    }

    /**
     * Authenticated caller with a resolvable incoming session id.
     * Delegates to claim/merge/resume depending on ownership.
     */
    private ChatSession resolveAuthenticated(AiChatSessionEntity incoming,
                                             UUID userId,
                                             String userType,
                                             UUID incomingId) {

        UUID ownerId = incoming.getUserId();

        // Same user — fast path, nothing to change.
        if (userId.equals(ownerId)) {
            return mapper.toDomain(incoming);
        }

        // Foreign session — never touch it.
        if (ownerId != null) {
            log.warn("[MealMate] session {} belongs to another user — resuming caller's canonical",
                    incomingId);
            return sessionRepo
                    .findFirstByUserIdAndStatusOrderByLastMessageAtDesc(userId, STATUS_ACTIVE)
                    .map(mapper::toDomain)
                    .orElseGet(() -> {
                        ChatSession created = ChatSession.create(userId, userType);
                        sessionRepo.save(mapper.toEntity(created));
                        return created;
                    });
        }

        // Anonymous session — claim or merge into the user's canonical.
        Optional<AiChatSessionEntity> targetOpt =
                sessionRepo.findFirstByUserIdAndStatusOrderByLastMessageAtDesc(userId, STATUS_ACTIVE);

        if (targetOpt.isEmpty()) {
            // First-ever authenticated session for this user: claim it.
            ChatSession claimed = mapper.toDomain(incoming).bindTo(userId, userType);
            sessionRepo.save(mapper.toEntity(claimed));
            log.info("[MealMate] claimed anonymous session {} for user={}", incomingId, userId);
            return claimed;
        }

        AiChatSessionEntity target = targetOpt.get();

        // Defensive: same id (shouldn't happen with the invariant, but cheap).
        if (target.getId().equals(incomingId)) {
            return mapper.toDomain(target);
        }

        // Re-parent messages, delete the source, recompute target aggregates.
        int moved = messageRepo.reassignSession(incomingId, target.getId());
        sessionRepo.delete(incoming);

        Object[] agg = messageRepo.aggregateForSession(target.getId());
        Instant lastAt = (Instant) agg[0];
        long count = ((Number) agg[1]).longValue();

        if (lastAt != null) {
            target.setLastMessageAt(lastAt);
        }
        target.setMessageCount((int) count);
        sessionRepo.save(target);

        log.info("[MealMate] merged session {} into {} ({} messages moved) for user={}",
                incomingId, target.getId(), moved, userId);
        return mapper.toDomain(target);
    }

    // ═══════════════════════════════════════════════════════════
    //  History
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<LlmMessage> loadHistory(UUID sessionId) {
        List<LlmMessage> raw = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(mapper::toLlmMessage)
                .toList();
        return sanitizeHistory(raw);
    }

    @Override
    @Transactional
    public void append(UUID sessionId, LlmMessage message, List<StructuredPayload> payloads) {
        AiChatMessageEntity entity = AiChatMessageEntity.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .role(message.role().name())
                .content(message.content() != null ? message.content() : "")
                .toolCalls(mapper.serializeToolCalls(message))
                .metadata(mapper.serializeMetadata(message))
                .structuredPayload(mapper.serializeStructuredPayloads(payloads))
                .createdAt(Instant.now())
                .build();
        messageRepo.save(entity);

        sessionRepo.findById(sessionId).ifPresent(session -> {
            session.setLastMessageAt(Instant.now());
            session.setMessageCount(session.getMessageCount() + 1);
            sessionRepo.save(session);
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  History sanitization
    // ═══════════════════════════════════════════════════════════

    /**
     * Drops incomplete tool-call groups.
     *
     * A crash mid-tool-loop leaves the DB with an assistant turn that
     * requested tools and no matching TOOL responses. The OpenAI
     * protocol rejects such a history with a 400 — every assistant
     * message with tool_calls must be immediately followed by tool
     * messages with matching ids.
     */
    private List<LlmMessage> sanitizeHistory(List<LlmMessage> history) {
        List<LlmMessage> out = new java.util.ArrayList<>(history.size());
        int i = 0;
        while (i < history.size()) {
            LlmMessage m = history.get(i);

            if (m.role() == LlmMessage.Role.ASSISTANT
                    && m.toolCalls() != null
                    && !m.toolCalls().isEmpty()) {

                Set<String> expected = m.toolCalls().stream()
                        .map(tc -> tc.id())
                        .collect(Collectors.toSet());

                Set<String> found = new HashSet<>();
                int j = i + 1;
                while (j < history.size() && history.get(j).role() == LlmMessage.Role.TOOL) {
                    String id = history.get(j).toolCallId();
                    if (id != null) found.add(id);
                    j++;
                }

                if (found.containsAll(expected)) {
                    out.add(m);
                    for (int k = i + 1; k < j; k++) {
                        out.add(history.get(k));
                    }
                } else {
                    log.warn("[MealMate] dropping incomplete tool-call group. "
                            + "Expected ids: {}, found: {}", expected, found);
                }
                i = j;
            } else {
                out.add(m);
                i++;
            }
        }
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ChatSession> findSession(UUID sessionId) {
        return sessionRepo.findById(sessionId).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Instant> findCreatedAt(UUID messageId) {
        return messageRepo.findById(messageId).map(AiChatMessageEntity::getCreatedAt);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean messageBelongsToSession(UUID messageId, UUID sessionId) {
        return messageRepo.findById(messageId)
                .map(m -> sessionId.equals(m.getSessionId()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageEntity> loadMessagePage(UUID sessionId,
                                                     Instant cursorTs,
                                                     UUID cursorId,
                                                     int limit) {
        return messageRepo.findPage(
                sessionId, cursorTs, cursorId, PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageEntity> loadLatestMessagePage(UUID sessionId, int limit) {
        return messageRepo.findLatestPage(sessionId, PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageEntity> loadMessagePageBefore(UUID sessionId,
                                                           Instant cursorTs,
                                                           UUID cursorId,
                                                           int limit) {
        return messageRepo.findPageBefore(sessionId, cursorTs, cursorId, PageRequest.of(0, limit));
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    /**
     * Returns {@code null} for blank or malformed input, so callers
     * fall through to the resolution path instead of silently getting
     * a random UUID on every request.
     */
    private UUID parseSessionId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            log.warn("[MealMate] invalid sessionId '{}', treating as absent", raw);
            return null;
        }
    }
}