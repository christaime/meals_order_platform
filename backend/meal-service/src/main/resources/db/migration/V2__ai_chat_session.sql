-- ═══════════════════════════════════════════════════════════════
--  MealMate — conversational agent
--  Phase 1: session + message tables (interactive state)
--           archival columns for later use (Phase 7)
-- ═══════════════════════════════════════════════════════════════

-- ─── Session ─────────────────────────────────────────────────
-- One row per conversation. Anchor for both anonymous and
-- authenticated users. Populated with user_id on login.
--
-- The user_id holds the Keycloak `sub` claim parsed as UUID.
-- It is NULL for anonymous sessions. No FK to a `user` or
-- `customer` table — those don't exist yet, and this chat serves
-- every role (customer, vendor, admin) uniformly.
CREATE TABLE ai_chat_session (
    id              UUID PRIMARY KEY,
    user_id         UUID,                                   -- NULL = anonymous
    user_type       VARCHAR(20),                            -- nullable; populated when known
                        -- values: 'CUSTOMER', 'VENDOR', 'ADMIN', 'SYSTEM'
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    message_count   INTEGER      NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'PURGED', 'FAILED')),
    allergens       JSONB,                                  -- session-scoped allergen declarations
    archive_ref     VARCHAR(512),                           -- Garage object key, set when archived
    archived_at     TIMESTAMPTZ,
    purged_at       TIMESTAMPTZ
);

CREATE INDEX idx_ai_session_status ON ai_chat_session(status, last_message_at);
CREATE INDEX idx_ai_session_user   ON ai_chat_session(user_id, started_at DESC);

-- ─── Messages ────────────────────────────────────────────────
-- One row per turn. Cascade-deleted with the session.
CREATE TABLE ai_chat_message (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES ai_chat_session(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL
                     CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    content      TEXT NOT NULL,
    structured_payload JSONB NULL,
    tool_calls   JSONB,                                     -- array of {name, params}
    metadata     JSONB,                                     -- latency, confidence, etc.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_message_session ON ai_chat_message(session_id, created_at);
CREATE INDEX idx_ai_message_created ON ai_chat_message(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_message_session_created_id
    ON ai_chat_message (session_id, created_at DESC, id DESC);