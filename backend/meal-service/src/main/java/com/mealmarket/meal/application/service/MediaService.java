package com.mealmarket.meal.application.service;

import com.mealmarket.meal.application.dto.MediaResponse;
import com.mealmarket.meal.application.dto.MediaUploadRequest;
import com.mealmarket.meal.application.exception.MediaStorageException;
import com.mealmarket.meal.application.exception.MediaValidationException;
import com.mealmarket.meal.application.port.MediaStoragePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MediaService {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    private final MediaStoragePort storage;   // <-- the port, not the adapter

    public MediaResponse upload(MediaUploadRequest request) {
        MultipartFile file = request.file();

        if (file == null || file.isEmpty()) {
            throw new MediaValidationException("Le fichier est vide");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new MediaValidationException("Le fichier dépasse 5 Mo");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new MediaValidationException("Type de fichier non autorisé");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new MediaStorageException("Failed to read uploaded file", e);
        }

        String storageRef = storage.store(
                request.purpose(),
                file.getOriginalFilename(),
                new ByteArrayInputStream(bytes),
                bytes.length,
                contentType
        );

        return new MediaResponse(
                storageRef,
                request.purpose(),
                storage.url(storageRef),
                contentType,
                bytes.length
        );
    }

    public String urlFor(String storageRef) {
        String ref = URLDecoder.decode(storageRef, StandardCharsets.UTF_8);
        return storage.url(ref);
    }

    public void delete(String storageRef) {
        String ref = URLDecoder.decode(storageRef, StandardCharsets.UTF_8);
        storage.delete(ref);
    }

    public void markUsed(String storageRef) {
        if (storageRef == null || storageRef.isBlank()) return;
        storage.updateMetadata(storageRef, Map.of("status", "USED"));
    }

    public void markPending(String storageRef) {
        if (storageRef == null || storageRef.isBlank()) return;
        storage.updateMetadata(storageRef, Map.of("status", "PENDING"));
    }
}