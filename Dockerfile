# ---------- Stage 1: Build ----------
FROM gradle:8.14.2-jdk17 AS build
WORKDIR /app

# Copy Gradle wrapper and build files first for better Docker layer caching
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY gradle ./gradle/

# Copy each subproject's build.gradle so Gradle can resolve dependencies
COPY common/build.gradle ./common/
#COPY gateway/build.gradle ./gateway/
COPY meal-service/build.gradle ./meal-service/
#COPY payment-service/build.gradle ./payment-service/

# Pre-download dependencies (optional but speeds up subsequent builds)
RUN ./gradlew --no-daemon dependencies

# Copy all source code
COPY . .

# Build the executable JAR for your specific service
# REPLACE :meal-service:bootJar with the correct module name for your AI backend
RUN ./gradlew --no-daemon :meal-service:bootJar

# ---------- Stage 2: Run ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR from the build stage
# REPLACE meal-service with your module name and adjust the jar name if needed
COPY --from=build /app/meal-service/build/libs/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]