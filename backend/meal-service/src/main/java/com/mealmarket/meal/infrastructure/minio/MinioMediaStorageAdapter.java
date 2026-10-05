package com.mealmarket.meal.infrastructure.minio;

import com.mealmarket.meal.application.exception.MediaStorageException;
import com.mealmarket.meal.application.port.MediaStoragePort;
import com.mealmarket.meal.domain.model.MediaPurpose;
import com.mealmarket.meal.infrastructure.config.MinioConfig;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
/*@ConditionalOnProperty(
        prefix = "minio",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)*/
@RequiredArgsConstructor
@Slf4j
public class MinioMediaStorageAdapter implements MediaStoragePort {

    private final MinioClient client;
    private final MinioConfig config;

    @Override
    public String store(MediaPurpose purpose,
                        String originalFilename,
                        InputStream data,
                        long size,
                        String contentType) {
        String storageRef = buildRef(purpose, originalFilename);
        try {
            ensureBucket();
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(config.getBucket())
                            .object(storageRef)
                            .stream(data, size, -1)
                            .contentType(contentType)
                            .userMetadata(Map.of(
                                    "purpose", purpose.name(),
                                    "status", "PENDING"
                            ))
                            .build()
            );
            return storageRef;
        } catch (Exception e) {
            throw new MediaStorageException("Upload to MinIO failed", e);
        }
    }

    @Override
    public void delete(String storageRef) {
        if (isBlank(storageRef)) return;
        try {
            client.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(config.getBucket())
                            .object(storageRef)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to delete MinIO object {}: {}", storageRef, e.getMessage());
        }
    }

    @Override
    public String url(String storageRef) {
        if (isBlank(storageRef)) return null;
        try {
            if (config.getPublicBaseUrl() != null && !config.getPublicBaseUrl().isBlank()) {
                return trimTrailingSlash(config.getPublicBaseUrl()) + "/" + storageRef;
            }
            return client.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(config.getBucket())
                            .object(storageRef)
                            .expiry((int) config.getPresignedExpirySeconds(), TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception e) {
            throw new MediaStorageException("Failed to build URL for " + storageRef, e);
        }
    }

    @Override
    public void updateMetadata(String storageRef, Map<String, String> metadata) {
        if (isBlank(storageRef) || metadata == null || metadata.isEmpty()) return;
        try {
            StatObjectResponse stat = client.statObject(
                    StatObjectArgs.builder()
                            .bucket(config.getBucket())
                            .object(storageRef)
                            .build()
            );

            Map<String, String> merged = new HashMap<>(stat.userMetadata());
            merged.putAll(metadata);

            client.copyObject(
                    CopyObjectArgs.builder()
                            .bucket(config.getBucket())
                            .object(storageRef)
                            .source(CopySource.builder()
                                    .bucket(config.getBucket())
                                    .object(storageRef)
                                    .build())
                            .metadataDirective(Directive.REPLACE)
                            .userMetadata(merged)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to update MinIO metadata for {}: {}", storageRef, e.getMessage());
        }
    }

    // ------------------------------------------------------------------

    private String buildRef(MediaPurpose purpose, String originalFilename) {
        String ext = extensionOf(originalFilename);
        String prefix = purpose.name().toLowerCase();
        return prefix + "/" + UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);
    }

    private String extensionOf(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
    }

    private void ensureBucket() throws Exception {
        boolean exists = client.bucketExists(
                BucketExistsArgs.builder().bucket(config.getBucket()).build()
        );
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder().bucket(config.getBucket()).build());
        }
    }

    private String trimTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
