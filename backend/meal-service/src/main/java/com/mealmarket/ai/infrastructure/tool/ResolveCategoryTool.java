package com.mealmarket.ai.infrastructure.tool;

import com.mealmarket.ai.application.tool.Tool;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolDefinition;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.meal.domain.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResolveCategoryTool implements Tool {

    private final CategoryResolverService resolver;
    private final CategoryRepository categoryRepository;

    @Override
    public ToolDefinition definition() {
        return new ToolDefinition(
                "resolveCategory",
                """
                Find categories matching a term.
        
                Use for cuisines ("bamiléké", "italienne") or dish types ("dessert").
                NOT for specific dish names ("Taro sauce jaune") — search those directly.
        
                Returns: [{ id, name, type }]
                Pass the ids to searchMeals' categoryIds parameter.
        
                Returns [] if nothing matches.
                """,
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "term", Map.of(
                                        "type", "string",
                                        "description",
                                        "The term exactly as the user said it. " +
                                                "No normalization, translation, or cleanup."
                                )
                        ),
                        "required", List.of("term")
                )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, ToolContext ctx) {
        String term = asString(args.get("term"));
        if (term == null || term.isBlank()) {
            return ToolResult.failure("The 'term' argument is required.");
        }

        try {
            List<UUID> ids = resolver.resolve(term);

            return ToolResult.success(
                    ids.isEmpty()
                            ? "No category matched."
                            : "Matched " + ids.size() + " category(ies).",
                    Map.of(
                            "categoryIds", ids.stream().map(UUID::toString).toList()
                    )
            );

        } catch (Exception e) {
            log.error("[MealMate] resolveCategory failed for '{}': {}", term, e.getMessage(), e);
            return ToolResult.failure(
                    "The category resolution failed. Tell the user there was a technical issue."
            );
        }
    }

    private Map<String, Object> summarize(UUID id) {
        return categoryRepository.findById(id)
                .map(c -> Map.<String, Object>of(
                        "id", c.getId().toString(),
                        "name", c.getName(),
                        "type", c.getType().name()
                ))
                .orElse(null);
    }

    private String asString(Object v) {
        return v instanceof String s ? s : null;
    }
}