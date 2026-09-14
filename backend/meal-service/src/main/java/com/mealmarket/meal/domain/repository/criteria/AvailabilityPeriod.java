package com.mealmarket.meal.domain.repository.criteria;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@Builder
public class AvailabilityPeriod {
    private LocalDate startDate;
    private LocalDate endDate;
    private AvailabilityMode mode;

    public enum AvailabilityMode {
        ANY,
        ALL
    }

    public boolean isValid() {
        return startDate != null && endDate != null && !endDate.isBefore(startDate);
    }

    public static AvailabilityPeriod any(LocalDate startDate, LocalDate endDate) {
        return AvailabilityPeriod.builder()
                .startDate(startDate)
                .endDate(endDate)
                .mode(AvailabilityMode.ANY)
                .build();
    }

    public static AvailabilityPeriod all(LocalDate startDate, LocalDate endDate) {
        return AvailabilityPeriod.builder()
                .startDate(startDate)
                .endDate(endDate)
                .mode(AvailabilityMode.ALL)
                .build();
    }
}