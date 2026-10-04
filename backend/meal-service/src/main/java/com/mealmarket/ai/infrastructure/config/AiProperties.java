package com.mealmarket.ai.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for the MealMate AI integration.
 * Binds under `mealmarket.ai.*` in application.yml.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "mealmarket.ai")
public class AiProperties {

    private OpenRouter openrouter = new OpenRouter();

    @Getter
    @Setter
    public static class OpenRouter {
        /** Base URL of the OpenAI-compatible API. */
        private String baseUrl = "https://openrouter.ai/api/v1";

        /** API key. Loaded from OPENROUTER_API_KEY env var. */
        private String apiKey;

        /** Model id. See https://openrouter.ai/models for available models. */
        private String model = "openrouter/free";

        /** Request timeout in seconds. */
        private int timeoutSeconds = 60;

        /** Maximum tokens the LLM may generate per reply. */
        private int maxTokens = 1024;

        /** Sampling temperature. Low = deterministic. */
        private double temperature = 0.3;
    }
}