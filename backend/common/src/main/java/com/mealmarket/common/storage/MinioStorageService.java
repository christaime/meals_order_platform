package com.mealmarket.common.storage;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "minio.enabled", havingValue = "true", matchIfMissing = true)
public class MinioStorageService implements StorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.public-url}")
    private String publicUrl;

    @Override
    public String upload(String objectName, InputStream inputStream, String contentType, long size) {
        try {
            ensureBucketExists();

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build()
            );

            String url = getPublicUrl(objectName);
            log.info("File uploaded successfully: {}", url);
            return url;

        } catch (Exception e) {
            log.error("Failed to upload file: {}", objectName, e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream download(String objectName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to download file: {}", objectName, e);
            throw new RuntimeException("Failed to download file: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
            log.info("File deleted: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to delete file: {}", objectName, e);
            throw new RuntimeException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean exists(String objectName) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getPublicUrl(String objectName) {
        try {
            // Option 1: Generate presigned URL (expires)
            // return minioClient.getPresignedObjectUrl(...);

            // Option 2: Static URL (if bucket is public)
            return String.format("%s/%s/%s", publicUrl, bucket, objectName);

        } catch (Exception e) {
            log.error("Failed to generate URL for: {}", objectName, e);
            throw new RuntimeException("Failed to generate URL: " + e.getMessage(), e);
        }
    }

    /**
     * Generate a presigned URL with expiration.
     */
    public String getPresignedUrl(String objectName, int expiryMinutes) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(objectName)
                            .expiry(expiryMinutes, TimeUnit.MINUTES)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for: {}", objectName, e);
            throw new RuntimeException("Failed to generate presigned URL: " + e.getMessage(), e);
        }
    }

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build()
            );
            if (!exists) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(bucket).build()
                );
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.error("Failed to ensure bucket exists: {}", bucket, e);
            throw new RuntimeException("Failed to ensure bucket exists: " + e.getMessage(), e);
        }
    }
}