# ---------- Stage 1: Build ----------
FROM gradle:8.14.2-jdk17 AS build
WORKDIR /app

# Copy Gradle wrapper and build files first for better caching
COPY gradlew .
COPY gradlew.bat .
COPY settings.gradle .
COPY build.gradle .
COPY gradle ./gradle/

# Copy each subproject's build.gradle so Gradle can resolve the build
COPY common/build.gradle          ./common/
COPY gateway/build.gradle         ./gateway/
COPY meal-service/build.gradle    ./meal-service/
COPY payment-service/build.gradle ./payment-service/

# Pre-download dependencies (optional, speeds up rebuilds)
RUN ./gradlew --no-daemon dependencies || true

# Copy all source code
COPY . .

# Build the executable JAR for the AI backend.
# Adjust the module name if your MealMate code lives in a different one.
RUN ./gradlew --no-daemon :meal-service:bootJar

# ---------- Stage 2: Run ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR. Adjust module name if needed.
COPY --from=build /app/meal-service/build/libs/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]