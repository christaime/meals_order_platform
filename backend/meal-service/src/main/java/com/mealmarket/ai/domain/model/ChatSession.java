package com.mealmarket.ai.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * A conversation session with the MealMate agent.
 *
 * Pure domain object — no JPA annotations. The persistence layer owns
 * the entity; this class is what the orchestrator and tools see.
 */
public class ChatSession {

    private final UUID id;
    private final UUID userId;
    private final String userType;
    private final Instant startedAt;
    private final Instant lastMessageAt;
    private final int messageCount;
    private final Status status;

    public enum Status {
        ACTIVE,
        ARCHIVED,
        PURGED,
        FAILED
    }

    private ChatSession(Builder b) {
        this.id = b.id;
        this.userId = b.userId;
        this.userType = b.userType;
        this.startedAt = b.startedAt;
        this.lastMessageAt = b.lastMessageAt;
        this.messageCount = b.messageCount;
        this.status = b.status;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory
    // ═══════════════════════════════════════════════════════════

    public static ChatSession create(UUID userId, String userType) {
        Instant now = Instant.now();
        return ChatSession.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .userType(userType)
                .startedAt(now)
                .lastMessageAt(now)
                .messageCount(0)
                .status(Status.ACTIVE)
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Behaviour
    // ═══════════════════════════════════════════════════════════

    public boolean isAnonymous() {
        return userId == null;
    }

    /**
     * Bind this session to a user — the "session upgrade on login" step.
     * Idempotent for the same user; throws if already bound to another.
     */
    public ChatSession bindTo(UUID userId, String userType) {
        if (userId == null) {
            throw new IllegalArgumentException("userId must not be null when binding");
        }
        if (this.userId != null) {
            if (this.userId.equals(userId)) return this;
            throw new IllegalStateException(
                    "Session " + id + " is already bound to user " + this.userId);
        }
        return ChatSession.builder()
                .id(this.id)
                .userId(userId)
                .userType(userType)
                .startedAt(this.startedAt)
                .lastMessageAt(this.lastMessageAt)
                .messageCount(this.messageCount)
                .status(this.status)
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Accessors
    // ═══════════════════════════════════════════════════════════

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getUserType() { return userType; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public int getMessageCount() { return messageCount; }
    public Status getStatus() { return status; }

    // ═══════════════════════════════════════════════════════════
    //  Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private UUID userId;
        private String userType;
        private Instant startedAt;
        private Instant lastMessageAt;
        private int messageCount;
        private Status status = Status.ACTIVE;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder userId(UUID v) { this.userId = v; return this; }
        public Builder userType(String v) { this.userType = v; return this; }
        public Builder startedAt(Instant v) { this.startedAt = v; return this; }
        public Builder lastMessageAt(Instant v) { this.lastMessageAt = v; return this; }
        public Builder messageCount(int v) { this.messageCount = v; return this; }
        public Builder status(Status v) { this.status = v; return this; }

        public ChatSession build() {
            if (id == null) throw new IllegalStateException("id is required");
            if (startedAt == null) throw new IllegalStateException("startedAt is required");
            if (lastMessageAt == null) throw new IllegalStateException("lastMessageAt is required");
            if (status == null) throw new IllegalStateException("status is required");
            return new ChatSession(this);
        }
    }
}