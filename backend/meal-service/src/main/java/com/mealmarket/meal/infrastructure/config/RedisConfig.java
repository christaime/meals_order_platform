package com.mealmarket.meal.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableCaching
public class RedisConfig {

  @Bean
  public RedisTemplate<String, Object> redisTemplate(
      RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
    RedisTemplate<String, Object> template = new RedisTemplate<>();
    template.setConnectionFactory(connectionFactory);
    template.setKeySerializer(new StringRedisSerializer());
    template.setValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
    template.setHashKeySerializer(new StringRedisSerializer());
    template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
    return template;
  }

  @Bean
  public RedisCacheManager cacheManager(
      RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
    RedisCacheConfiguration defaultConfig =
        RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer(objectMapper)))
            .disableCachingNullValues();

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(defaultConfig)
        .withCacheConfiguration("meals", defaultConfig.entryTtl(Duration.ofMinutes(5)))
        .withCacheConfiguration("vendors", defaultConfig.entryTtl(Duration.ofMinutes(10)))
        .withCacheConfiguration("categories", defaultConfig.entryTtl(Duration.ofHours(1)))
        .build();
  }
}
