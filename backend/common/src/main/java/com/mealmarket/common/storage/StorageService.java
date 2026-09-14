package com.mealmarket.common.storage;

import java.io.InputStream;

/**
 * Storage service abstraction (port).
 * Implementations handle the actual storage mechanism (MinIO, S3, etc.).
 */
public interface StorageService {

    /**
     * Upload a file to storage.
     *
     * @param objectName The name/path of the object in storage
     * @param inputStream The file content
     * @param contentType The MIME type of the file
     * @param size The size of the file in bytes
     * @return The public URL of the uploaded file
     */
    String upload(String objectName, InputStream inputStream, String contentType, long size);

    /**
     * Download a file from storage.
     *
     * @param objectName The name/path of the object
     * @return The file content as InputStream
     */
    InputStream download(String objectName);

    /**
     * Delete a file from storage.
     *
     * @param objectName The name/path of the object
     */
    void delete(String objectName);

    /**
     * Check if a file exists in storage.
     *
     * @param objectName The name/path of the object
     * @return true if the file exists
     */
    boolean exists(String objectName);

    /**
     * Generate a public URL for an object.
     *
     * @param objectName The name/path of the object
     * @return The public URL
     */
    String getPublicUrl(String objectName);
}