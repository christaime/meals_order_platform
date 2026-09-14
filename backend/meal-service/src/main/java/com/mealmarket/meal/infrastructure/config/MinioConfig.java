package com.mealmarket.meal.infrastructure.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "minio.enabled", havingValue = "true", matchIfMissing = true)
public class MinioConfig {

  @Value("${minio.url}")
  private String url;

  @Value("${minio.access-key}")
  private String accessKey;

  @Value("${minio.secret-key}")
  private String secretKey;

  @Bean
  public MinioClient minioClient() {
    return MinioClient.builder().endpoint(url).credentials(accessKey, secretKey).build();
  }
}
