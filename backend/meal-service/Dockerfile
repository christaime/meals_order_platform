# ─── Stage 1: Build ────────────────────────────────────────────
FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# Copy gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle gradle.properties ./
COPY backend/common backend/common
COPY backend/meal-service backend/meal-service

# Build the application
RUN chmod +x gradlew && \
    ./gradlew :meal-service:bootJar --no-daemon

# ─── Stage 2: Runtime ──────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S mealmarket && adduser -S mealmarket -G mealmarket

# Copy JAR from build stage
COPY --from=build /app/backend/meal-service/build/libs/*.jar app.jar

# Set ownership
RUN chown -R mealmarket:mealmarket /app
USER mealmarket

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:prod}", "app.jar"]