# 🍽️ Multi-Vendor Meal Marketplace

A full-stack platform connecting food vendors (restaurants, caterers, home chefs) with customers, enabling meal discovery, ordering, and scheduled meal planning with multiple payment options.

---

## 🎯 Overview

The Multi-Vendor Meal Marketplace is a platform designed to bridge the gap between food vendors and consumers in Cameroon and beyond.

Key Differentiator: Scheduled Meal Batches
Customers can plan meals in advance with recurring menus, specific meals per date, or mixed mode.

Target Users:
- Customers: Browse, order, schedule meals, rate vendors
- Vendors: Manage meals, orders, analytics dashboard
- Admins: Monitor vendors, manage platform settings

---

## ✨ Core Features

- Advanced Search: Filter by location, category, dietary, exclude allergens
- One-Time Orders: Order for immediate or future delivery/pickup
- Scheduled Batches: Plan weekly/monthly meals (recurring or custom)
- Multiple Payments: Momo, Orange Money, Visa/Mastercard
- Ratings: Rate meals, vendors, and delivery (1-5 stars)
- Vendor Dashboard: Track sales, top meals, customer feedback
- Badges: Trust badges through admin verification

---

## 🛠️ Tech Stack

Backend:
- Java 17 + Spring Boot 3.x
- PostgreSQL (Primary DB)
- Spring Cloud Gateway (API Gateway)
- Keycloak (IAM - Self-hosted)
- MinIO (Image Storage - S3-compatible)
- Apache Kafka (Event-driven communication)
- Redis (Cache)

Frontend:
- Angular 18+ + Tailwind CSS
- NgRx (State Management)
- Angular Material (UI Components)
- Chart.js (Dashboards)
- JsPDF (Receipt)

Infrastructure:
- Docker + Kubernetes (AKS)
- Microsoft Azure
- GitHub Actions (CI/CD)

---

## 🏗️ Architecture

                    Angular Frontend
         (Customer UI + Vendor Dashboard + Admin UI)
                              |
                              v
              Spring Cloud API Gateway
              (Redis for rate limiting & caching)
                              |
              -------------------
              |                 |
              v                 v
        Meal Management MS     Payment MS
          - Vendors              - Cart & Checkout
          - Meals                - Payment Gateways
          - Orders               - Invoices
          - Schedules            - Transaction History
          - Ratings
            |                 |
            |                 |
            v                 v
            Kafka Topic      Kafka Topic
            (OrderCreatedEvent)  (PaymentConfirmedEvent)
            |                 |
            -------------------
            |
            v
            PostgreSQL
            (meal_db and payment_db)

---

## 📁 Project Structure

    meal-marketplace/
    ├── backend/
    │   ├── meal-service/          # Meal Management
    │   ├── payment-service/       # Payment
    │   └── gateway/               # API Gateway
    ├── frontend/
    │   └── src/
    │       └── app/
    │           ├── modules/
    │           │   ├── auth/          # Authentication
    │           │   ├── payment/       # Payment
    │           │   └── marketplace/   # Marketplace
    │           │       ├── shop-order/    # Customer
    │           │       └── vendor-admin/  # Vendor
    │           └── admin/             # Admin UI
    ├── k8s/                       # Kubernetes manifests
    ├── docs/                      # Documentation
    └── .github/workflows/         # CI/CD pipelines

---

## 🚀 Quick Start

1. Clone the repository:
   git clone https://github.com/your-org/meal-marketplace.git
   cd meal-marketplace

2. Start infrastructure with Docker Compose:
   docker-compose -f backend/docker-compose.dev.yml up -d

3. Start backend services:
   cd backend/meal-service && ./mvnw spring-boot:run
   cd backend/payment-service && ./mvnw spring-boot:run
   cd backend/gateway && ./mvnw spring-boot:run

4. Start frontend:
   cd frontend
   npm install
   ng serve

Access URLs:
- Frontend: http://localhost:4200
- Admin UI: http://localhost:4200/admin
- API Gateway: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui

---

## 📚 Documentation

- [Requirements](./docs/REQUIREMENTS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API Contract](./docs/API_CONTRACT.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Frontend Structure](./docs/FRONTEND_STRUCTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

---

## 📞 Contact

- Email: support@mealmarket.com
- Issues: GitHub Issues

---

Built with ❤️ for the Cameroonian food community