package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.domain.model.Category;
import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import com.mealmarket.meal.domain.repository.criteria.CategorySearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Resolves a user term ("bamiléké", "dessert") to the category ids
 * that match it.
 *
 * Strategy:
 *   1. Cache hit
 *   2. Heuristic pass (exact → substring → token overlap, only when unambiguous)
 *   3. LLM fallback (send all categories, ask which match)
 *
 * The result — including "no match" — is cached under namespace
 * {@link CacheInvalidator#NS_CATEGORY}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryResolverService {

    private static final int PAGE_SIZE = 100;      // PageRequest's hard cap
    private static final int MAX_PAGES = 10;       // safety bound: 1000 categories max

    private final CategoryRepository categoryRepository;
    private final ResolverCache cache;
    private final CategoryMatchLlm categoryMatchLlm;

    // ═══════════════════════════════════════════════════════════
    //  Public API
    // ═══════════════════════════════════════════════════════════

    public List<UUID> resolve(String term) {
        if (term == null || term.isBlank()) return List.of();

        List<UUID> cached = cache.get(CacheInvalidator.NS_CATEGORY, term);
        if (cached != null) {
            log.debug("[MealMate] category cache hit for '{}'", term);
            return cached;
        }

        List<Category> all = loadAllApproved();
        List<UUID> match = matchHeuristically(term, all);

        if (match.isEmpty()) {
            try {
                match = categoryMatchLlm.match(term, all);
            } catch (Exception e) {
                log.warn("[MealMate] LLM category match failed for '{}': {}",
                        term, e.getMessage());
                match = List.of();
            }
        }

        cache.put(CacheInvalidator.NS_CATEGORY, term, match);
        return match;
    }

    // ═══════════════════════════════════════════════════════════
    //  Heuristic pass
    // ═══════════════════════════════════════════════════════════

    private List<UUID> matchHeuristically(String term, List<Category> categories) {
        String needle = ResolverCache.normalize(term);

        // 1. Exact normalized name
        List<Category> exact = categories.stream()
                .filter(c -> ResolverCache.normalize(c.getName()).equals(needle))
                .toList();
        if (!exact.isEmpty()) return toIds(exact);

        // 2. Substring — only when unambiguous
        List<Category> substring = categories.stream()
                .filter(c -> {
                    String n = ResolverCache.normalize(c.getName());
                    return n.contains(needle) || needle.contains(n);
                })
                .toList();
        if (substring.size() == 1) return toIds(substring);

        // 3. Token overlap — only when unambiguous
        Set<String> needleTokens = tokens(needle);
        if (!needleTokens.isEmpty()) {
            List<Category> overlap = categories.stream()
                    .filter(c -> {
                        Set<String> n = tokens(ResolverCache.normalize(c.getName()));
                        n.retainAll(needleTokens);
                        return !n.isEmpty();
                    })
                    .toList();
            if (overlap.size() == 1) return toIds(overlap);
        }

        return List.of();
    }

    private List<UUID> toIds(List<Category> categories) {
        return categories.stream().map(Category::getId).toList();
    }

    private Set<String> tokens(String s) {
        if (s.isBlank()) return Set.of();
        return new HashSet<>(List.of(s.split("\\s+")));
    }

    // ═══════════════════════════════════════════════════════════
    //  Data
    // ═══════════════════════════════════════════════════════════
    private List<Category> loadAllApproved() {
        List<Category> all = new ArrayList<>(PAGE_SIZE);
        int page = 0;
        DataPage<Category> current;

        do {
            CategorySearchRequest request = CategorySearchRequest.builder()
                    .moderationStatus(ModerationStatus.APPROVED)
                    .page(page, PAGE_SIZE)
                    .build();
            current = categoryRepository.search(request);
            all.addAll(current.getContent());
            page++;
        } while (!current.isLast() && page < MAX_PAGES);

        if (!current.isLast()) {
            log.warn("[MealMate] category loading hit MAX_PAGES ({}), stopped at page {}. "
                            + "Some categories may be missing from resolution.",
                    MAX_PAGES, page - 1);
        }

        return all;
    }
}