package com.mealmarket.ai.application.service;

public interface PromptBuilder {
    /**
     * @param locale "fr" or "en" — the app's UI language, used as the
     *               default for the first reply. After that, the LLM
     *               follows whatever language the user writes in.
     */
    public String buildSystemPrompt(String locale) ;
}
