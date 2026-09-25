package com.mealmarket.meal.infrastructure.api;

import com.mealmarket.common.exception.ExternalServiceUnavailableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExternalApiClient {

    private final RestClient restClient;

    // ═══════════════════════════════════════════════════════════
    //  GET
    // ═══════════════════════════════════════════════════════════

    @Retry(name = "default")
    @CircuitBreaker(name = "default", fallbackMethod = "genericFallbackGet")
    public <T> T get(String url, Class<T> responseType) {
        return restClient.get()
                .uri(url)
                .retrieve()
                .body(responseType);
    }

    // ═══════════════════════════════════════════════════════════
    //  POST
    // ═══════════════════════════════════════════════════════════

    @Retry(name = "default")
    @CircuitBreaker(name = "default", fallbackMethod = "genericFallbackPost")
    public <T> T post(String url, Object request, Class<T> responseType) {
        var responseSpec = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve();

        if (Void.class.equals(responseType) || void.class.equals(responseType)) {
            responseSpec.toBodilessEntity();
            return null;
        }

        return responseSpec.body(responseType);
    }
    // ═══════════════════════════════════════════════════════════
    //  DELETE — no body
    // ═══════════════════════════════════════════════════════════

    @Retry(name = "default")
    @CircuitBreaker(name = "default", fallbackMethod = "genericFallbackDelete")
    public <T> T delete(String url, Class<T> responseType) {
        return restClient.delete()
                .uri(url)
                .retrieve()
                .body(responseType);
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE — with body
    // ═══════════════════════════════════════════════════════════

    @Retry(name = "default")
    @CircuitBreaker(name = "default", fallbackMethod = "genericFallbackDeleteWithBody")
    public <T> T deleteWithBody(String url, Object request, Class<T> responseType) {
        return restClient.method(HttpMethod.DELETE)
                .uri(url)
                .body(request)
                .retrieve()
                .body(responseType);
    }

    // ═══════════════════════════════════════════════════════════
    //  Fallbacks (Signatures strictly match original method + Throwable)
    // ═══════════════════════════════════════════════════════════

    private <T> T genericFallbackGet(String url, Class<T> responseType, Throwable ex) {
        log.error("GET {} failed after retries and circuit breaker.", url, ex);
        throw new ExternalServiceUnavailableException("Service is temporarily unavailable", ex);
    }

    private <T> T genericFallbackPost(String url, Object request, Class<T> responseType, Throwable ex) {
        log.error("POST {} failed after retries and circuit breaker.", url, ex);
        throw new ExternalServiceUnavailableException("Service is temporarily unavailable", ex);
    }

    private <T> T genericFallbackDelete(String url, Class<T> responseType, Throwable ex) {
        log.error("DELETE {} failed after retries and circuit breaker.", url, ex);
        throw new ExternalServiceUnavailableException("Service is temporarily unavailable", ex);
    }

    private <T> T genericFallbackDeleteWithBody(String url, Object request, Class<T> responseType, Throwable ex) {
        log.error("DELETE (with body) {} failed after retries and circuit breaker.", url, ex);
        throw new ExternalServiceUnavailableException("Service is temporarily unavailable", ex);
    }
}