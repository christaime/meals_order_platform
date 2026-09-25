package com.mealmarket.meal.infrastructure.config;

import io.minio.MinioClient;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "minio.enabled", havingValue = "true", matchIfMissing = true)
@Getter
public class MinioConfig {

    @Value("${minio.url}")
    private String url;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket}")
    private String bucket;

    /**
     * Optional. If set, used directly as the public URL prefix (e.g. a CDN or a
     * publicly readable MinIO bucket). If blank, presigned URLs are generated.
     */
    @Value("${minio.public-base-url:}")
    private String publicBaseUrl;

    @Value("${minio.presigned-expiry-seconds:3600}")
    private long presignedExpirySeconds;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder().endpoint(url).credentials(accessKey, secretKey).build();
    }
}
