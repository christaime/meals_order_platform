```markdown
# `GEMINI.md`

This file provides system context, architectural guidelines, and codebase operational standards for AI models (including Gemini CLI) interacting with the **Multi-Vendor Meal Marketplace** repository.

---

## 📌 Project Context & Overview

The **Multi-Vendor Meal Marketplace** is a microservices-based, full-stack platform built to connect food vendors (restaurants, caterers, home chefs) with consumers, with a primary focus on scheduled meal batching, local payment integrations (Mobile Money, Orange Money), and role-specific workflows (Customers, Vendors, Admins).

### Key Architectural Concepts
* **Microservices Backend**: Built with **Java 17 / Spring Boot 3.x**, structured using **Hexagonal / Clean Architecture** (`domain`, `application`, `infrastructure`, `shared`).
* **API Gateway**: Spring Cloud Gateway running on port `8080` handling routing, rate-limiting, CORS, and JWT authentication filters.
* **Frontend**: **Angular 18+** with **NgRx** state management, **Tailwind CSS**, and **Angular Material**, split by role modules (`marketplace`, `payment`, `auth`, `admin`).
* **Event-Driven Communication**: **Apache Kafka** orchestrates asynchronous domain events (e.g., `OrderCreatedEvent`, `PaymentConfirmedEvent`).
* **Database & Migrations**: Microservices use isolated PostgreSQL databases (`meal_db`, `payment_db`) with schema evolution managed via **Flyway**.
* **Containerization & Deployment**: Configured for local running via **Docker Compose** and cloud orchestration via **Kubernetes (AKS)**.

---

## 📚 Key Documentation Location

All comprehensive architectural and operational documentation is centralized under the `/docs` directory:

| Document | Path | Context Provided |
| :--- | :--- | :--- |
| **Requirements** | `docs/REQUIREMENTS.md` | Functional requirements, user roles, business rules |
| **Architecture** | `docs/ARCHITECTURE.md` | System design, microservices integration, Kafka events |
| **API Contracts** | `docs/API_CONTRACT.md` | REST API endpoints, DTO schemas, HTTP response contracts |

> **AI Instruction**: Always cross-reference the detailed specifications in `/docs` before generating backend domain logic, Angular components, or database scripts.

---
## 🏗️ Backend Project Instructions

- **Language:** Java 17 (LTS)
- **Framework:** Spring Boot 3.2.0
- **Build Tool:** Gradle 8.5 with multi-module structure
- **Architecture:** Clean Architecture (Domain, Application, Infrastructure, Shared)
- **Database:** PostgreSQL 15 with Flyway migrations
- **ORM:** Spring Data JPA with Hibernate
- **DTO Mapping:** MapStruct 1.5.5.Final
- **Testing:** JUnit 5 + Mockito + Testcontainers
- **Coding Standards:** Google Java Format with Spotless plugin
- **API Documentation:** Swagger/OpenAPI 3.0
- **Logging:** SLF4J + Logback
- **Messaging:** Apache Kafka
- **Cache:** Redis
- **Security:** Keycloak OAuth2/OIDC with JWT
- **Image Storage:** MinIO (S3-compatible)
- **Package Structure:** Follow Clean Architecture layers (domain, application, infrastructure)
- **Error Handling:** Global exception handler with proper HTTP status codes
- **Validation:** Jakarta Validation API for request validation
- **Lombok:** Use `@Slf4j`, `@RequiredArgsConstructor`, `@Data` where appropriate
- **Dependencies:** Declare all dependencies in module-specific `build.gradle` files

---

## 🎨 Frontend Project Instructions

- **Framework:** Angular with Vite
- **Styling:** Use Tailwind CSS for all styling. Do not write custom CSS.
- **Testing:** All new components must include a Jest unit test.
- **Tone:** Be concise. Don't explain basic Angular concepts.
- **State Management:** NgRx for complex state (auth, cart, orders, schedules)
- **API Communication:** HTTP interceptors for JWT authentication
- **Forms:** Reactive Forms with proper validation
- **Routing:** Lazy-loaded modules for auth, payment, marketplace, admin
- **Architecture:** Clean Architecture (Domain, Application, Infrastructure)
- **Components:** Use Angular Material for complex UI components
- **Dashboard Charts:** Use Chart.js for analytics
- **Receipt Printing:** Use jsPDF with jspdf-autotable
- **Folder Structure:** Follow the established module-based structure
- **Type Safety:** Use TypeScript interfaces for all data models
- **Error Handling:** Global error interceptor with user-friendly messages
- **Code Style:** Follow Angular style guide and ESLint rules
- **Environment Configs:** Use environment.ts for API URLs and feature flags

---

## 📁 Repository Structure Blueprint

```text
meal-marketplace/
│
├── backend/
│   ├── common/                         # Shared library (exceptions, enums, utils)
│   │   ├── src/
│   │   ├── build.gradle
│   │   └── Dockerfile
│   │
│   ├── meal-service/                   # Meal Management Microservice (Port: 8081)
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/mealmarket/mealservice/
│   │   │   │   │   ├── domain/               # Entities & Repository Ports
│   │   │   │   │   ├── application/          # DTOs & Service Interfaces
│   │   │   │   │   ├── infrastructure/       # JPA, REST, Kafka, Security
│   │   │   │   │   └── shared/               # Constants & Utilities
│   │   │   │   └── resources/
│   │   │   │       ├── application.yml
│   │   │   │       └── db/migration/         # Flyway Scripts
│   │   │   └── test/
│   │   ├── build.gradle
│   │   └── Dockerfile
│   │
│   ├── payment-service/                # Payment Microservice (Port: 8082)
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/mealmarket/paymentservice/
│   │   │   │   │   ├── domain/               # Cart, Invoice, Transaction
│   │   │   │   │   ├── application/          # Checkout, Payment DTOs
│   │   │   │   │   ├── infrastructure/       # JPA, REST, Kafka, Gateways
│   │   │   │   │   └── shared/
│   │   │   │   └── resources/
│   │   │   │       ├── application.yml
│   │   │   │       └── db/migration/         # Flyway Scripts
│   │   │   └── test/
│   │   ├── build.gradle
│   │   └── Dockerfile
│   │
│   └── gateway/                        # API Gateway (Port: 8080)
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/mealmarket/gateway/
│       │   │   │   ├── config/               # Routes, Rate Limiting, CORS
│       │   │   │   ├── filter/               # JWT, Logging, Rate Limiting
│       │   │   │   └── handler/              # Fallback Handler
│       │   │   └── resources/
│       │   │       └── application.yml
│       │   └── test/
│       ├── build.gradle
│       └── Dockerfile
│
├── frontend/                           # Angular 18+ Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                   # Domain Models, Services, State (NgRx)
│   │   │   ├── modules/
│   │   │   │   ├── auth/               # Login, Register, Social Auth
│   │   │   │   ├── payment/            # Cart, Checkout, Payment Methods
│   │   │   │   ├── marketplace/        # Customer: Browse, Search, Order
│   │   │   │   │   ├── shop-order/     # Customer Facing
│   │   │   │   │   └── vendor-admin/   # Vendor Dashboard
│   │   │   │   └── admin/              # Admin UI (Vendor Management, Analytics)
│   │   │   └── shared/                 # Components, Directives, Pipes
│   │   ├── assets/                     # Images, Icons, Fonts
│   │   ├── environments/               # Dev, Prod Configs
│   │   └── styles/                     # Global Styles, Tailwind
│   ├── angular.json
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── k8s/                                # Kubernetes Manifests (AKS)
│   ├── namespaces/
│   ├── configmaps/
│   ├── secrets/
│   ├── deployments/                    # All Service Deployments
│   ├── services/                       # ClusterIP, LoadBalancer
│   ├── statefulsets/                   # PostgreSQL, MinIO, Kafka
│   ├── hpa/                            # Horizontal Pod Autoscaling
│   └── ingress/                        # Ingress Controller
│
├── docs/                               # Project Documentation
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── DATABASE_SCHEMA.md
│   ├── FRONTEND_STRUCTURE.md
│   └── DEPLOYMENT.md
│
├── prompts/                            # AI Generation Prompts
│   ├── mvp_code_base_prompt.txt
│   ├── customer_domain_prompt.txt
│   └── ...
│
├── scripts/                            # Utility Scripts
│   ├── deploy-aks.sh
│   ├── backup-db.sh
│   └── seed-data.sh
│
├── gradle/                             # Gradle Wrapper
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
│
├── .github/
│   └── workflows/                      # CI/CD Pipelines
│       ├── ci.yml
│       └── cd.yml
│
├── docker-compose.yml                  # Full Stack (Dev & Prod)
├── docker-compose.dev.yml              # Development Only
├── gradlew
├── gradlew.bat
├── build.gradle                        # Root Gradle Build
├── settings.gradle                     # Multi-module Configuration
├── gradle.properties
├── .gitignore
├── .env.example
├── README.md
├── GEMINI.md                           # Gemini CLI Setup Guide
├── LICENSE
└── CHANGELOG.md
```

---

## ⚙️ Development Commands & Conventions

### 1. Build & Execution

* **Root Gradle Builds**:
```bash
# Build all backend microservices
./gradlew build

# Run tests across all modules
./gradlew test

```


* **Individual Microservice Run**:
```bash
./gradlew :backend:meal-service:bootRun
./gradlew :backend:payment-service:bootRun
./gradlew :backend:gateway:bootRun

```


* **Frontend Execution**:
```bash
cd frontend
npm install
ng serve

```



### 2. Microservice Layering Standards (Hexagonal Architecture)

When generating or editing backend code within microservices (`meal-service` or `payment-service`), strictly respect layer purity:

* **`domain/`**: Pure Java models, domain values, entity logic, repository interfaces (ports). *No Spring framework or infrastructure imports.*
* **`application/`**: DTOs, mappers, application services, input/output boundary interfaces.
* **`infrastructure/`**: Adapters (JPA entities/repositories, Spring REST controllers, Kafka producers/consumers, Keycloak integration, external payment gateways).
* **`shared/`**: Service-wide constants, helper functions, domain-specific utilities.

### 3. Flyway Database Migrations

* SQL migrations must be placed under `src/main/resources/db/migration/` inside the respective service directory.
* Naming convention: `V<Version>__<Description>.sql` (e.g., `V1__init_meal_schema.sql`).

### 4. Angular Architecture Standards

* **`core/`**: Singletons, domain models, guards, interceptors, and root NgRx state definitions.
* **`shared/`**: Reusable UI components, pipes, directives, and Material/Tailwind utilities.
* **`modules/`**: Feature components organized by user domain (`auth`, `payment`, `marketplace`, `admin`).

---

## 🤖 AI Interaction Guidelines

1. **Context First**: Before generating code, inspect the corresponding architectural specification in `docs/` and the appropriate submodule build configuration (`build.gradle` or `package.json`).
2. **Hexagonal Strictness**: Do not mix JPA annotations or Spring Web annotations inside the `domain` package.
3. **Event Schema Consistency**: Maintain schema consistency for Kafka events published/consumed between `meal-service` and `payment-service`. Refer to `docs/ARCHITECTURE.md`.
4. **Environment Variables**: Always use configuration properties linked to `application.yml` or environment references (`.env.example`) rather than hardcoding secret credentials or dynamic URLs.

```

```