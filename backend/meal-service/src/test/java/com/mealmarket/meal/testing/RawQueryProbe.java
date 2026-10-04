package com.mealmarket.meal.testing;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Test-only probe that queries the raw database, bypassing every
 * Hibernate-layer filter — {@code @SQLRestriction}, {@code @Where},
 * {@code @Filter}, soft-delete plugins.
 *
 * <p>Used by {@code SoftDeleteSqlRestrictionIntegrationTest} to prove
 * that a DISABLED row still physically exists in its table even though
 * the entity layer hides it.</p>
 *
 * <p>This component lives in {@code src/test} on purpose: production
 * code must never bypass the restriction. See the project context for
 * the rule.</p>
 */
@Component
public class RawQueryProbe {

    private final JdbcTemplate jdbc;

    public RawQueryProbe(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Total row count in the raw table, ignoring every JPA restriction.
     */
    public long countAll(String table) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM " + table,
                Long.class
        );
    }

    /**
     * Count rows matching a specific id, ignoring every JPA restriction.
     */
    public long countById(String table, UUID id) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE id = ?",
                Long.class,
                id
        );
    }

    /**
     * Read a column's raw value for a specific row.
     */
    public String readString(String table, String column, UUID id) {
        return jdbc.queryForObject(
                "SELECT " + column + " FROM " + table + " WHERE id = ?",
                String.class,
                id
        );
    }

    /**
     * Soft-delete status accessor with a table-name that's validated
     * against the four moderable tables. Prevents a typo from silently
     * querying the wrong table.
     */
    public long countModerable(String table, UUID id) {
        requireModerableTable(table);
        return countById(table, id);
    }

    public String readModerationStatus(String table, UUID id) {
        requireModerableTable(table);
        return readString(table, "moderation_status", id);
    }

    private void requireModerableTable(String table) {
        switch (table) {
            case "categories", "ingredients", "distribution_locations", "meals" -> { /* ok */ }
            default -> throw new IllegalArgumentException(
                    "Not a moderable table: " + table);
        }
    }

    /**
     * Truncate a table by name, bypassing @SQLRestriction.
     * Uses TRUNCATE ... CASCADE so FK-referencing tables are cleaned too.
     *
     * <p>TRUNCATE is DDL — it doesn't fire row triggers, doesn't go
     * through the entity layer, and doesn't respect @SQLRestriction.</p>
     */
    public void truncate(String... tables) {
        for (String table : tables) {
            jdbc.execute("TRUNCATE TABLE " + table + " CASCADE");
        }
    }
}