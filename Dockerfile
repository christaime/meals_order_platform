# ---------- Stage 1: Build ----------
FROM gradle:8.14.2-jdk17 AS build
WORKDIR /app

# Gradle wrapper and build files (at the repo root)
COPY gradlew .
COPY gradlew.bat .
COPY settings.gradle .
COPY build.gradle .
COPY gradle ./gradle/

# Subproject build files
COPY backend/common/build.gradle          ./backend/common/
COPY backend/gateway/build.gradle         ./backend/gateway/
COPY backend/meal-service/build.gradle    ./backend/meal-service/
COPY backend/payment-service/build.gradle ./backend/payment-service/

# Pre-download dependencies (optional, speeds up rebuilds)
RUN ./gradlew --no-daemon dependencies || true

# Full source tree
COPY . .

# Build the AI backend
RUN ./gradlew --no-daemon :meal-service:bootJar

# ---------- Stage 2: Run ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/backend/meal-service/build/libs/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]