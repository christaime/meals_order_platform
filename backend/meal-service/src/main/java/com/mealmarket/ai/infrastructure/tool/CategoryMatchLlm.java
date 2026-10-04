package com.mealmarket.ai.infrastructure.tool;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealmarket.ai.application.dto.LlmMessage;
import com.mealmarket.ai.application.dto.LlmResponse;
import com.mealmarket.ai.application.port.LlmClient;
import com.mealmarket.meal.domain.model.Category;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Focused classification call: which categories match a user term?
 *
 * Runs only when the heuristic pass misses. Uses a dedicated prompt —
 * no conversation history, no persona, no tools. The LLM sees a flat
 * catalogue and returns a JSON list of matching ids.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CategoryMatchLlm {

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    public List<UUID> match(String term, List<Category> categories) {
        if (categories.isEmpty()) return List.of();

        String catalogue = buildCatalogue(categories);

        List<LlmMessage> messages = List.of(
                LlmMessage.system("""
                        Tu es un classificateur. On te donne un terme saisi par
                        un utilisateur et une liste de catégories de nourriture
                        (chacune avec un id, un nom, un type).

                        Ta tâche : identifier les catégories qui correspondent
                        au terme. Renvoie UNIQUEMENT un objet JSON de la forme :
                          { "categoryIds": ["uuid1", "uuid2"] }

                        Règles :
                        - Renvoie tous les ids qui correspondent, pas seulement le meilleur.
                        - Si aucune catégorie ne correspond, renvoie :
                          { "categoryIds": [] }
                        - N'invente pas d'ids. Utilise uniquement ceux listés.
                        - Ne réponds PAS en prose. Uniquement le JSON.
                        """),
                LlmMessage.user("""
                        Terme : "%s"

                        Catégories disponibles :
                        %s
                        """.formatted(term, catalogue))
        );

        LlmResponse response = llmClient.complete(messages, List.of());
        String content = response.content();
        if (content == null || content.isBlank()) {
            return List.of();
        }

        return parseCategoryIds(content, categories);
    }

    private String buildCatalogue(List<Category> categories) {
        StringBuilder sb = new StringBuilder();
        for (Category c : categories) {
            sb.append("- id=").append(c.getId())
                    .append(" name=\"").append(c.getName()).append("\"")
                    .append(" type=").append(c.getType())
                    .append("\n");
        }
        return sb.toString();
    }

    private List<UUID> parseCategoryIds(String content, List<Category> allowed) {
        try {
            String json = content.trim();
            if (json.startsWith("```")) {
                int start = json.indexOf('{');
                int end = json.lastIndexOf('}');
                if (start < 0 || end < 0) return List.of();
                json = json.substring(start, end + 1);
            }

            Map<String, Object> parsed = objectMapper.readValue(
                    json, new TypeReference<>() {});

            Object ids = parsed.get("categoryIds");
            if (!(ids instanceof List<?> list)) return List.of();

            Set<UUID> allowedIds = new HashSet<>();
            for (Category c : allowed) allowedIds.add(c.getId());

            return list.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .map(this::tryParseUuid)
                    .filter(java.util.Objects::nonNull)
                    .filter(allowedIds::contains)
                    .toList();

        } catch (Exception e) {
            log.warn("[MealMate] failed to parse LLM category match: {}", e.getMessage());
            return List.of();
        }
    }

    private UUID tryParseUuid(String s) {
        try { return UUID.fromString(s); }
        catch (IllegalArgumentException e) { return null; }
    }
}