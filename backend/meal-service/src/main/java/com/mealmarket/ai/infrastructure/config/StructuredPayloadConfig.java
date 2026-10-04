package com.mealmarket.ai.infrastructure.config;

import com.mealmarket.ai.application.port.StructuredPayloadManagerFactory;
import com.mealmarket.ai.infrastructure.tool.MealStructuredPayloadManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StructuredPayloadConfig {

    @Bean
    public StructuredPayloadManagerFactory structuredPayloadManagerFactory() {
        return MealStructuredPayloadManager::new;
    }
}