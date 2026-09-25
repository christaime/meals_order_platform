package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.MediaPurpose;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.multipart.MultipartFile;

public record MediaUploadRequest(
        @NotNull MultipartFile file,
        @NotNull MediaPurpose purpose
) {}
