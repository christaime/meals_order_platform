package com.mealmarket.ai.infrastructure.persistence.repository;

import com.mealmarket.ai.infrastructure.persistence.entity.AiChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiChatSessionJpaRepository extends JpaRepository<AiChatSessionEntity, UUID> {
    /**
     * Most recently active ACTIVE session for a user.
     *
     * "Most recently active" is decided by {@code last_message_at DESC}.
     * Used by {@code getOrCreateSession} to resume the user's canonical
     * session when no explicit id is supplied, and to find the merge
     * target when an anonymous session is being claimed.
     */
    Optional<AiChatSessionEntity> findFirstByUserIdAndStatusOrderByLastMessageAtDesc(
            UUID userId, String status);
}