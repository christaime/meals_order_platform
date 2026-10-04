package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.dto.StructuredPayload;
import com.mealmarket.ai.application.port.StructuredPayloadManager;
import com.mealmarket.ai.application.port.StructuredPayloadManagerFactory;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * MealMate's {@link StructuredPayloadManager}.
 *
 * Knows that:
 *   - MEALS payloads carry a {@code meals} array of cards with an
 *     {@code id} field used for deduplication.
 *   - VENDORS payloads carry a {@code vendors} array of cards with an
 *     {@code id} field used for deduplication.
 *   - Same-type payloads are merged, deduped by id, order preserved.
 *   - Different types are kept side by side, in first-seen order.
 *
 * Everything is done against the raw {@code Map<String, Object>}
 * inside {@link StructuredPayload}. The manager never references a
 * Java DTO for the cards — it treats them as opaque maps.
 *
 * Not a Spring bean: instances are created by
 * {@link StructuredPayloadManagerFactory}. No shared state, no
 * thread-safety concern.
 */
@Slf4j
public class MealStructuredPayloadManager implements StructuredPayloadManager {

    /** Ordered buckets, one per payload type, in first-seen order. */
    private final Map<String, Bucket> buckets = new LinkedHashMap<>();

    @Override
    public void add(StructuredPayload payload) {
        if (payload == null || payload.type() == null || payload.data() == null) {
            return;
        }

        String listKey = listKeyFor(payload.type());
        if (listKey == null) {
            log.warn("[MealMate] unknown payload type '{}' — ignored", payload.type());
            return;
        }

        Object raw = payload.data().get(listKey);
        if (!(raw instanceof List<?> list)) {
            log.warn("[MealMate] payload type '{}' missing '{}' array — ignored",
                    payload.type(), listKey);
            return;
        }

        Bucket bucket = buckets.computeIfAbsent(payload.type(), t -> new Bucket(t, listKey));
        for (Object item : list) {
            if (item instanceof Map<?, ?> card) {
                bucket.add(card);
            }
        }
    }

    @Override
    public List<StructuredPayload> finish() {
        List<StructuredPayload> out = new ArrayList<>(buckets.size());
        for (Bucket bucket : buckets.values()) {
            if (bucket.isEmpty()) continue;
            out.add(StructuredPayload.of(
                    bucket.type,
                    Map.of(bucket.listKey, bucket.cards)));
        }
        return out;
    }

    /**
     * The array field inside {@code data} that holds the cards.
     * Returning null means "this type is not managed here" — the
     * payload is dropped with a warning.
     */
    private String listKeyFor(String type) {
        return switch (type) {
            case PayloadTypes.MEALS -> "meals";
            case PayloadTypes.VENDORS -> "vendors";
            default -> null;
        };
    }

    /**
     * One type's accumulator. Preserves insertion order and dedupes
     * by the card's {@code id} field.
     */
    private static final class Bucket {
        final String type;
        final String listKey;
        final List<Map<String, Object>> cards = new ArrayList<>();
        final Set<Object> seenIds = new HashSet<>();

        Bucket(String type, String listKey) {
            this.type = type;
            this.listKey = listKey;
        }

        void add(Map<?, ?> card) {
            Object id = card.get("id");
            if (id == null) {
                // No id — cannot dedupe. Keep it, but don't track it.
                cards.add(castMap(card));
                return;
            }
            if (seenIds.add(id)) {
                cards.add(castMap(card));
            }
        }

        boolean isEmpty() {
            return cards.isEmpty();
        }

        @SuppressWarnings("unchecked")
        private static Map<String, Object> castMap(Map<?, ?> m) {
            // Jackson produces Map<String, Object>; this cast is safe.
            return (Map<String, Object>) m;
        }
    }
}