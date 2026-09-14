package com.mealmarket.common.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import java.util.Set;
import java.util.stream.Collectors;

public final class DomainValidation {

    private static final Validator VALIDATOR;

    static {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            VALIDATOR = factory.getValidator();
        }
    }

    private DomainValidation() {}

    public static <T> void validate(T object) {
        Set<ConstraintViolation<T>> violations = VALIDATOR.validate(object);
        if (!violations.isEmpty()) {
            String errors = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Validation failed: " + errors);
        }
    }

    public static <T> boolean isValid(T object) {
        return VALIDATOR.validate(object).isEmpty();
    }

    public static <T> Set<ConstraintViolation<T>> getViolations(T object) {
        return VALIDATOR.validate(object);
    }
}