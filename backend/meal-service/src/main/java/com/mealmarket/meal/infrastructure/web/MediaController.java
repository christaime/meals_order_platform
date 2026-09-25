package com.mealmarket.meal.infrastructure.web;

import com.mealmarket.meal.application.dto.MediaResponse;
import com.mealmarket.meal.application.dto.MediaUploadRequest;
import com.mealmarket.meal.application.service.MediaService;
import com.mealmarket.meal.domain.model.MediaPurpose;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Upload and manage media files (MinIO-backed)")
public class MediaController {

    private final MediaService mediaService;

    // ═══════════════════════════════════════════════════════════
    //  Upload
    // ═══════════════════════════════════════════════════════════

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Upload a media file",
            description = """
            Uploads a file to MinIO and returns a `storageRef` (the object key).

            **Flow:**
            1. Client uploads the file here with a `purpose`.
            2. Server stores it in MinIO as `PENDING` and returns the `storageRef` + a computed `url`.
            3. Client includes the `storageRef` on the create/update request of the owning entity
               (meal, vendor, etc.).
            4. When the entity is saved, the server flips the media's status from `PENDING`
               to `USED`, protecting it from the cleanup job.
            5. If the ref is never attached to an entity, a scheduled job deletes it after 24 hours.

            **Constraints:**
            - Max file size: 5 MB
            - Allowed types: `image/jpeg`, `image/png`, `image/webp`
            - The `purpose` namespaces the object key (e.g. `meal_image/<uuid>.jpg`)
              and is stored as MinIO metadata for lifecycle tracking.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Uploaded successfully",
                    content = @Content(schema = @Schema(implementation = MediaResponse.class))
            ),
            @ApiResponse(responseCode = "400", description = "Empty file, size exceeded, or invalid content type"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "500", description = "MinIO upload failed"),
            @ApiResponse(responseCode = "503", description = "Media storage is disabled (minio.enabled=false)")
    })
    public ResponseEntity<MediaResponse> upload(
            @Parameter(description = "Image file (jpeg/png/webp, max 5 MB)", required = true)
            @RequestPart("file") MultipartFile file,

            @Parameter(description = "Purpose of the file — determines object key prefix and metadata", required = true)
            @RequestParam("purpose") MediaPurpose purpose
    ) {
        MediaResponse response = mediaService.upload(new MediaUploadRequest(file, purpose));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════
    //  Resolve URL
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/url")
    @Operation(
            summary = "Resolve a storage ref into a display URL",
            description = """
            Returns a fresh URL for a storage ref (MinIO object key).

            **Why this endpoint exists:**
            If the bucket is private, URLs are presigned and expire
            (default 1 hour, configurable via `minio.presigned-expiry-seconds`).
            A client that has cached an old URL can refresh it here
            without re-uploading or re-fetching the owning entity.

            **Ref encoding:**
            Storage refs contain slashes (`meal_image/<uuid>.jpg`), so the
            `ref` query parameter must be URL-encoded
            (e.g. `ref=meal_image%2F3f2a...jpg`).

            **Null-safe:** a blank `ref` returns `{ "url": null }` rather than an error.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "URL resolved (may be null if ref is blank)",
                    content = @Content(schema = @Schema(implementation = UrlResponse.class))
            ),
            @ApiResponse(responseCode = "500", description = "MinIO unavailable or ref invalid")
    })
    public ResponseEntity<UrlResponse> url(
            @Parameter(description = "Storage ref (MinIO object key), URL-encoded", required = true)
            @RequestParam("ref") @NotBlank String ref
    ) {
        return ResponseEntity.ok(new UrlResponse(ref, mediaService.urlFor(ref)));
    }

    // ═══════════════════════════════════════════════════════════
    //  Delete
    // ═══════════════════════════════════════════════════════════

    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearer-jwt")
    @Operation(
            summary = "Delete a media file",
            description = """
            Deletes the object from MinIO. Best-effort: if the object is already
            gone, the request still returns 204.

            **Usage note:** you rarely need to call this directly. When an entity's
            image is replaced or the entity is deleted, the server marks the old
            ref `PENDING`, and the cleanup job removes it after 24 hours. Use this
            endpoint for explicit "user removed the image before saving" flows.
            """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Deleted (or already gone)"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "Storage ref (MinIO object key), URL-encoded", required = true)
            @RequestParam("ref") @NotBlank String ref
    ) {
        mediaService.delete(ref);
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Response DTO
    // ═══════════════════════════════════════════════════════════

    /**
     * Response body for {@code GET /url}.
     *
     * <p>Returns both the storage ref (echoed back, so the client doesn't have to
     * remember the encoding) and the resolved URL. `url` is null if the ref is
     * blank.</p>
     */
    @Schema(description = "Resolved URL for a storage ref")
    public record UrlResponse(
            @Schema(description = "The storage ref (object key), echoed back", example = "meal_image/3f2a4b6c-...jpg")
            String storageRef,

            @Schema(description = "Display URL (public base + ref, or presigned)", example = "https://cdn.mealmarket.cm/meal_image/3f2a4b6c-...jpg")
            String url
    ) {}
}