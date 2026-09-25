package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.MediaPurpose;

public record MediaResponse(
        String storageRef,
        MediaPurpose purpose,
        String url,
        String mimeType,
        long size
) {}
