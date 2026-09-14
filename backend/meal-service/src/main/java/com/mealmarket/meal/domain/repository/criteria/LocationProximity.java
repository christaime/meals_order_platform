package com.mealmarket.meal.domain.repository.criteria;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class LocationProximity {
    private Double latitude;
    private Double longitude;
    private Integer radiusKm;

    public boolean isValid() {
        return latitude != null && longitude != null && radiusKm != null && radiusKm > 0;
    }

    public static LocationProximity of(Double latitude, Double longitude, Integer radiusKm) {
        return LocationProximity.builder()
                .latitude(latitude)
                .longitude(longitude)
                .radiusKm(radiusKm)
                .build();
    }
}