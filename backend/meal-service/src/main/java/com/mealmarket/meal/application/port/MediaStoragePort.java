package com.mealmarket.meal.application.port;

import com.mealmarket.meal.domain.model.MediaPurpose;

import java.io.InputStream;
import java.util.Map;

/**
 * Domain-facing port. Application services depend on this, never on MinIO/S3.
 * Implementations live in infrastructure (see {@code MinioMediaStorageAdapter}).
 */
public interface MediaStoragePort {

    /**
     * Store bytes and return an opaque storage reference (the object key).
     * The reference is what entities persist — never the URL.
     */
    String store(MediaPurpose purpose,
                 String originalFilename,
                 InputStream data,
                 long size,
                 String contentType);

    /** Best-effort delete. Must not throw if the object is missing. */
    void delete(String storageRef);

    /** Resolve a display URL for the reference. Null-safe. */
    String url(String storageRef);

    /** Merge metadata into an existing object. No-op for null/blank ref. */
    void updateMetadata(String storageRef, Map<String, String> metadata);
}