package com.mealmarket.meal.infrastructure.persistence.adapter;

import com.mealmarket.meal.application.dto.MealStatFilter;
import com.mealmarket.meal.domain.model.CategoryType;
import com.mealmarket.meal.domain.repository.MealStatRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read-only repository for landing-page meal statistics.
 *
 * Every method tolerates an empty database and returns an empty
 * result rather than throwing — the service layer applies the
 * fallback chain (orders first, offered meals second) and the
 * zero-value defaults.
 */
@Repository
@Slf4j
public class MealStatRepositoryAdapter implements MealStatRepository {

    @PersistenceContext
    private EntityManager em;

    // ═══════════════════════════════════════════════════════════
    //  Top categories by orders
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<MealStatFilter.StatEntry> findTopCategoryTypeByOrders(int limit, CategoryType type) {
        return runTopQuery("""
            SELECT c.id, c.name, COUNT(oi.id) AS cnt
            FROM order_item oi
            JOIN meals m             ON m.id = oi.meal_id
            JOIN meals_categories mc ON mc.meal_id = m.id
            JOIN categories c        ON c.id = mc.category_id
            WHERE c.type = :type
            GROUP BY c.id, c.name
            ORDER BY cnt DESC, c.name ASC
            LIMIT :limit
        """, type.name(), limit);
    }

    // ═══════════════════════════════════════════════════════════
    //  Top categories by offered (approved & available) meals
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<MealStatFilter.StatEntry> findTopCategoryTypeByOfferedMeals(int limit, CategoryType type) {
        return runTopQuery("""
            SELECT c.id, c.name, COUNT(m.id) AS cnt
            FROM meals m
            JOIN meals_categories mc ON mc.meal_id = m.id
            JOIN categories c        ON c.id = mc.category_id
            WHERE c.type = :type
              AND m.moderation_status = 'APPROVED'
              AND m.is_available = true
            GROUP BY c.id, c.name
            ORDER BY cnt DESC, c.name ASC
            LIMIT :limit
        """, type.name(), limit);
    }

    // ═══════════════════════════════════════════════════════════
    //  Express prep time
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public Optional<MealStatFilter.TimeStat> findMinPrepTime() {
        var rows = em.createNativeQuery("""
            SELECT m.prep_time_minutes AS time, COUNT(*) AS cnt
            FROM meals m
            WHERE m.moderation_status = 'APPROVED'
              AND m.is_available = true
              AND m.prep_time_minutes IS NOT NULL
            GROUP BY m.prep_time_minutes
            ORDER BY m.prep_time_minutes ASC
            LIMIT 1
        """).getResultList();

        if (rows.isEmpty()) return Optional.empty();
        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new MealStatFilter.TimeStat(
                ((Number) row[0]).intValue(),
                ((Number) row[1]).longValue()));
    }

    // ═══════════════════════════════════════════════════════════
    //  Minimum price
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public Optional<MealStatFilter.PriceStat> findMinPrice() {
        var rows = em.createNativeQuery("""
            SELECT m.price AS price, COUNT(*) AS cnt
            FROM meals m
            WHERE m.moderation_status = 'APPROVED'
              AND m.is_available = true
            GROUP BY m.price
            ORDER BY m.price ASC
            LIMIT 1
        """).getResultList();

        if (rows.isEmpty()) return Optional.empty();
        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new MealStatFilter.PriceStat(
                ((Number) row[0]).longValue(),
                ((Number) row[1]).longValue()));
    }

    // ═══════════════════════════════════════════════════════════
    //  Shared helper for the two "top N" queries
    // ═══════════════════════════════════════════════════════════

    @SuppressWarnings("unchecked")
    private List<MealStatFilter.StatEntry> runTopQuery(String sql, String typeValue, int limit) {
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("type", typeValue)
                .setParameter("limit", limit)
                .getResultList();

        return rows.stream()
                .map(row -> new MealStatFilter.StatEntry(
                        ((UUID) row[0]).toString(),
                        (String) row[1],
                        ((Number) row[2]).longValue()))
                .toList();
    }
}