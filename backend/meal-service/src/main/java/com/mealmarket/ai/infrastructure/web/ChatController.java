package com.mealmarket.ai.infrastructure.web;

import com.mealmarket.ai.application.dto.ChatHistoryResponse;
import com.mealmarket.ai.application.dto.ChatRequest;
import com.mealmarket.ai.application.dto.ChatResponse;
import com.mealmarket.ai.application.service.AgentOrchestrator;
import com.mealmarket.ai.application.service.ChatHistoryService;
import com.mealmarket.meal.infrastructure.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "MealMate AI", description = "Conversational ordering agent")
public class ChatController {

    private final AgentOrchestrator orchestrator;
    private final ChatHistoryService chatHistoryService;
    private final CurrentUser currentUser;

    @PostMapping("/chat")
    @Operation(summary = "Send a message to the ordering agent")
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader(value = "Accept-Language", defaultValue = "fr") String acceptLanguage
    ) {
        String userId = currentUser.getUserIdIfPresent().map(Object::toString).orElse(null);
        String userType = currentUser.getUserTypeIfPresent().map(Enum::name).orElse(null);
        String locale = normalizeLocale(acceptLanguage);

        return ResponseEntity.ok(orchestrator.handle(request, userId, userType, locale));
    }

    @GetMapping("/chat/{sessionId}/messages")
    @Operation(summary = "Page backwards through a session's visible history")
    public ResponseEntity<ChatHistoryResponse> history(
            @PathVariable String sessionId,
            @RequestParam(required = false) String beforeId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        UUID callerId = currentUser.getUserIdIfPresent().orElse(null);
        return ResponseEntity.ok(chatHistoryService.loadHistoryPage(sessionId, beforeId, limit, callerId));
    }

    private String normalizeLocale(String header) {
        if (header == null || header.isBlank()) return "fr";
        String primary = header.split(",")[0].split(";")[0].trim();
        int dash = primary.indexOf('-');
        return (dash > 0 ? primary.substring(0, dash) : primary).toLowerCase();
    }
}