package com.mealmarket.ai.application.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Registry of every tool the LLM may call.
 *
 * Spring injects all {@link Tool} beans — adding a tool is a matter
 * of declaring a new {@code @Component} that implements {@link Tool}.
 */
@Component
@Slf4j
public class ToolRegistry {

    private final Map<String, Tool> byName;

    public ToolRegistry(List<Tool> tools) {
        this.byName = tools.stream()
                .collect(Collectors.toMap(
                        t -> t.definition().name(),
                        Function.identity()
                ));

        log.info("[MealMate] registered {} tool(s): {}",
                byName.size(), byName.keySet());
    }

    public List<ToolDefinition> allDefinitions() {
        return byName.values().stream()
                .map(Tool::definition)
                .toList();
    }

    public Optional<Tool> find(String name) {
        return Optional.ofNullable(byName.get(name));
    }

    public ToolResult execute(String name, Map<String, Object> arguments, ToolContext context) {
        Tool tool = byName.get(name);
        if (tool == null) {
            log.warn("[MealMate] unknown tool: {}", name);
            return ToolResult.failure("Unknown tool: " + name);
        }

        try {
            return tool.execute(arguments, context);
        } catch (Exception e) {
            log.error("[MealMate] tool {} threw: {}", name, e.getMessage(), e);
            return ToolResult.failure(
                    "The tool '" + name + "' failed unexpectedly: " + e.getMessage());
        }
    }
}