package com.mealmarket.ai.infrastructure.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Generic in-memory cache for term → ids resolution.
 *
 * One map per namespace ("category", "ingredient", …), each storing
 * normalized-term → matched ids with a TTL.
 *
 * - Volatile: wiped on JVM restart, rebuilt on demand.
 * - Bounded: clears a namespace when it grows past MAX_ENTRIES_PER_NS.
 * - Namespaced: category and ingredient resolutions never collide.
 *
 * Migrate to Redis in Phase 8+ if multiple backend instances are ever
 * run. The interface stays the same; only the implementation changes.
 */
@Component
@Slf4j
public class ResolverCache {

    private static final Duration TTL = Duration.ofHours(6);
    private static final int MAX_ENTRIES_PER_NS = 10_000;

    private record Entry(List<UUID> ids, Instant expiresAt) {}

    private final Map<String, Map<String, Entry>> namespaces = new ConcurrentHashMap<>();

    /** Get a cached mapping, or null if missing or expired. */
    public List<UUID> get(String namespace, String term) {
        if (term == null) return null;
        Map<String, Entry> ns = namespaces.get(namespace);
        if (ns == null) return null;

        String key = normalize(term);
        Entry e = ns.get(key);
        if (e == null) return null;
        if (e.expiresAt.isBefore(Instant.now())) {
            ns.remove(key);
            return null;
        }
        return e.ids;
    }

    /** Store a mapping. Empty lists are cached too — "no match" is valid. */
    public void put(String namespace, String term, List<UUID> ids) {
        if (term == null) return;

        Map<String, Entry> ns = namespaces.computeIfAbsent(
                namespace, k -> new ConcurrentHashMap<>());

        if (ns.size() >= MAX_ENTRIES_PER_NS) {
            log.warn("[MealMate] resolver cache for '{}' at max size ({}), clearing",
                    namespace, MAX_ENTRIES_PER_NS);
            ns.clear();
        }
        ns.put(normalize(term), new Entry(ids, Instant.now().plus(TTL)));
    }

    /** Invalidate a whole namespace. */
    public void invalidate(String namespace) {
        Map<String, Entry> ns = namespaces.remove(namespace);
        if (ns != null && !ns.isEmpty()) {
            log.info("[MealMate] resolver cache invalidated for '{}' ({} entries)",
                    namespace, ns.size());
        }
    }

    /** Invalidate everything. */
    public void invalidateAll() {
        namespaces.clear();
        log.info("[MealMate] resolver cache cleared");
    }

    /**
     * Normalize a term for lookup:
     * lowercase, strip diacritics, trim, collapse whitespace.
     */
    public static String normalize(String term) {
        if (term == null) return "";
        return Normalizer.normalize(term.toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .replaceAll("\\s+", " ");
    }
}