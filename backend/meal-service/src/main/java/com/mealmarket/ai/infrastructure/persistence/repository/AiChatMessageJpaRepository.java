package com.mealmarket.ai.infrastructure.persistence.repository;

import com.mealmarket.ai.infrastructure.persistence.entity.AiChatMessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AiChatMessageJpaRepository extends JpaRepository<AiChatMessageEntity, UUID> {

    List<AiChatMessageEntity> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /**
     * Re-parent every message from one session to another.
     *
     * Bulk JPQL — the persistence context is cleared so subsequent
     * reads/saves see the DB state, not stale entities.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE AiChatMessageEntity m SET m.sessionId = :target WHERE m.sessionId = :source")
    int reassignSession(@Param("source") UUID source, @Param("target") UUID target);

    /**
     * Recompute the aggregates for a session after a merge.
     *
     * Returns {@code [Instant maxCreatedAt, Long count]}. {@code maxCreatedAt}
     * is null if the session has no messages.
     */
    @Query("""
        SELECT MAX(m.createdAt), COUNT(m)
        FROM AiChatMessageEntity m
        WHERE m.sessionId = :sid
    """)
    Object[] aggregateForSession(@Param("sid") UUID sid);

    /**
     * Keyset pagination on (created_at, id) DESC.
     *
     * Only USER and ASSISTANT turns with non-empty content are returned.
     * TOOL turns and assistant-with-tool-calls turns are protocol
     * plumbing, not conversation.
     *
     * When {@code cursorTs} is null, returns the latest page.
     * Otherwise returns rows strictly older than the cursor.
     */
    @Query("""
        SELECT m FROM AiChatMessageEntity m
        WHERE m.sessionId = :sid
          AND m.role IN ('USER', 'ASSISTANT')
          AND m.content IS NOT NULL AND m.content <> ''
          AND (
              :cursorTs IS NULL
              OR m.createdAt < :cursorTs
              OR (m.createdAt = :cursorTs AND m.id < :cursorId)
          )
        ORDER BY m.createdAt DESC, m.id DESC
    """)
    List<AiChatMessageEntity> findPage(
            @Param("sid") UUID sessionId,
            @Param("cursorTs") Instant cursorTs,
            @Param("cursorId") UUID cursorId,
            org.springframework.data.domain.Pageable pageable);

    /**
     * Latest page — no cursor. Used for the first load.
     */
    @Query("""
    SELECT m FROM AiChatMessageEntity m
    WHERE m.sessionId = :sid
      AND m.role IN ('USER', 'ASSISTANT')
      AND m.content IS NOT NULL AND m.content <> ''
    ORDER BY m.createdAt DESC, m.id DESC
""")
    List<AiChatMessageEntity> findLatestPage(
            @Param("sid") UUID sessionId,
            Pageable pageable);

    /**
     * Cursor page — strictly older than (cursorTs, cursorId).
     */
    @Query("""
    SELECT m FROM AiChatMessageEntity m
    WHERE m.sessionId = :sid
      AND m.role IN ('USER', 'ASSISTANT')
      AND m.content IS NOT NULL AND m.content <> ''
      AND (
          m.createdAt < :cursorTs
          OR (m.createdAt = :cursorTs AND m.id < :cursorId)
      )
    ORDER BY m.createdAt DESC, m.id DESC
""")
    List<AiChatMessageEntity> findPageBefore(
            @Param("sid") UUID sessionId,
            @Param("cursorTs") Instant cursorTs,
            @Param("cursorId") UUID cursorId,
            Pageable pageable);
}