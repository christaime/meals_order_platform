package com.mealmarket.meal.testing;

import com.mealmarket.meal.domain.model.City;

import java.util.UUID;

public final class TestFixtures {

    private TestFixtures() {}

    public static City aCity() {
        return City.builder()
                .id(UUID.fromString("c17a0000-0000-4000-8000-000000000001"))
                .name("Yaoundé")
                .region("Centre")
                .countryCode("CM")
                .build();
    }

    public static City aCity(String name) {
        return City.builder()
                .id(UUID.randomUUID())
                .name(name)
                .region("Centre")
                .countryCode("CM")
                .build();
    }
}