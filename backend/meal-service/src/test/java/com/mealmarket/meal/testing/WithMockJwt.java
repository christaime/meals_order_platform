package com.mealmarket.meal.testing;

import org.springframework.security.test.context.support.WithSecurityContext;
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@WithSecurityContext(factory = WithMockJwtSecurityContextFactory.class)
public @interface WithMockJwt {
    String subject() default "00000000-0000-0000-0000-000000000001";
    String email()   default "test@example.com";
    String[] roles() default {};
}