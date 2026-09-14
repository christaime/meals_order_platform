# Multi-Vendor Meal Marketplace – Architecture Document

---

## 1. High-Level Architecture
    +-------------------------------------------------+
    |                  CLIENT LAYER                   |
    | +-------------+ +-------------+ +-------------+ |
    | | Web App     | | Mobile Web  | | Admin UI    | |
    | | (Angular)   | | (Responsive)| | (Angular)   | |
    | +-------------+ +-------------+ +-------------+ |
    +-------------------------------------------------+
                        |
                        v
    +----------------------------------------------------------------------+
    |         API GATEWAY LAYER                                            |
    |        Spring Cloud Gateway                                          |
    |        - Routing & Load Balancing                                    |
    |        - JWT Validation (passthrough)                                |
    |        - Rate Limiting                                               |
    |        - Request/Response Logging                                    |
    +----------------------------------------------------------------------+
            |                               |                         |
            v                               v                         v
    +---------------------------+ +---------------------------+ +--------------------------+
    |    MEAL MANAGEMENT MS     | |      PAYMENT MS           | |     IAM SERVICE          |
    |     (Spring Boot)         | |        (Spring Boot)      | |       (Keycloak)         |
    | Modules:                  | | Modules:                  | |   - OAuth2/OIDC Server   |
    | - Vendor Mgmt             | | - Cart Mgmt               | | - Social Login           |
    | - Meal Mgmt               | | - Checkout                | | - Token Issuance         |
    | - Order Mgmt              | | - Payment Gateway         | | - Role Management        |
    | - Rating Mgmt             | | Integration               | |                          |
    | - Schedule Mgmt           | | - Invoice Generation      | |                          |
    | - Search/Filter           | | - Payment History         | |                          |
    +---------------------------+ +---------------------------+ +--------------------------+
                |                               |
                v                               v
    +---------------------------+ +------------------------------+
    | POSTGRESQL DB             | |         POSTGRESQL DB        |
    | (meal_db)                 | |         (payment_db)         |
    |                           | |                              |
    | - vendors                 | |         - carts              |
    | - meals                   | |         - invoices           |
    | - categories              | |         - transactions       |
    | - ingredients             | |         - payment_methods    |
    | - orders                  | |         - scheduled_payments |
    | - order_items             | |                              |
    | - schedules               | |                              |
    | - schedule_items          | |                              |
    | - ratings                 | |                              |
    | - customer_profiles       | |                              |
    | - vendor_profiles         | |                              |
    +---------------------------+ +------------------------------+
                    | 
                    v
    +-----------------------------------------------------------+
    | DATA STORAGE LAYER                                        |
    | +---------------------------+ +-------------------------+ |
    | | MINIO (S3-compatible)     | | Redis (Cache)           | |
    | | - Meal images             | | - Session cache         | |
    | | - Vendor logos            | | - API response cache    | |
    | | - User avatars            | | - Rate limiting data    | |
    | +---------------------------+ +-------------------------+ |
    +-----------------------------------------------------------+


---

## 2. Microservices Detailed Design

### 2.1 Meal Management Microservice

**Responsibility**: Core business logic for vendors, meals, orders, ratings, and schedules.

**Endpoints by Group**:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| Vendors | POST /api/v1/vendors/register | Register new vendor |
| | PUT /api/v1/vendors/{id} | Update vendor profile |
| | GET /api/v1/vendors/{id} | Get vendor details |
| | GET /api/v1/vendors/search | Search vendors |
| Meals | POST /api/v1/meals | Create meal |
| | PUT /api/v1/meals/{id} | Update meal |
| | DELETE /api/v1/meals/{id} | Delete meal |
| | GET /api/v1/meals | Browse meals with filters |
| | GET /api/v1/meals/{id} | Get meal details |
| Orders | POST /api/v1/orders | Create order |
| | GET /api/v1/orders/{id} | Get order details |
| | PUT /api/v1/orders/{id}/status | Update order status |
| | GET /api/v1/orders/customer/{id} | Customer order history |
| | GET /api/v1/orders/vendor/{id} | Vendor order list |
| Schedules | POST /api/v1/schedules | Create meal batch schedule |
| | PUT /api/v1/schedules/{id} | Update schedule |
| | DELETE /api/v1/schedules/{id} | Cancel schedule |
| | GET /api/v1/schedules/customer/{id} | Get customer schedules |
| Ratings | POST /api/v1/ratings | Submit rating |
| | GET /api/v1/ratings/meal/{id} | Get meal ratings |
| | GET /api/v1/ratings/vendor/{id} | Get vendor ratings |
| Search | GET /api/v1/search/meals | Full-text search with filters |
| | GET /api/v1/search/vendors | Search vendors by name/zone |

**Internal Communication**:
- Sends OrderCreatedEvent to Payment MS via Kafka
- Sends OrderStatusChangedEvent to Payment MS
- Receives PaymentConfirmedEvent from Payment MS

---

### 2.2 Payment Microservice

**Responsibility**: Cart management, payment processing, invoice generation, transaction history.

**Endpoints by Group**:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| Cart | POST /api/v1/cart | Add item to cart |
| | PUT /api/v1/cart/{id} | Update cart item |
| | DELETE /api/v1/cart/{id} | Remove from cart |
| | GET /api/v1/cart | Get current cart |
| Checkout | POST /api/v1/checkout | Process checkout |
| | GET /api/v1/checkout/{id}/summary | Get order summary |
| Payments | POST /api/v1/payments/initiate | Initiate payment (Momo/Orange/Card) |
| | POST /api/v1/payments/confirm | Confirm payment |
| | GET /api/v1/payments/status/{id} | Check payment status |
| | POST /api/v1/payments/webhook | Webhook for payment providers |
| Invoices | GET /api/v1/invoices/{id} | Get invoice |
| | GET /api/v1/invoices/customer/{id} | Customer invoices |
| | GET /api/v1/invoices/vendor/{id} | Vendor invoices |
| Scheduled | POST /api/v1/scheduled-payments | Create recurring payment |
| | PUT /api/v1/scheduled-payments/{id} | Update recurring payment |

**Payment Gateways Integrated**:
- MTN Momo (Cameroon)
- Orange Money (Cameroon)
- Stripe (Visa/Mastercard)
- PayPal (Phase 2)

---

### 2.3 API Gateway

**Technology**: Spring Cloud Gateway

**Responsibilities**:
- Route requests to appropriate microservices
- JWT validation (forward to Keycloak or validate locally)
- Rate limiting (token bucket algorithm)
- Request/response transformation
- Circuit breaker (Resilience4j)
- Request logging

**Routing Rules**:

| Path Prefix | Target Service |
|-------------|----------------|
| /api/v1/vendors/** | Meal Management MS |
| /api/v1/meals/** | Meal Management MS |
| /api/v1/orders/** | Meal Management MS |
| /api/v1/schedules/** | Meal Management MS |
| /api/v1/ratings/** | Meal Management MS |
| /api/v1/search/** | Meal Management MS |
| /api/v1/cart/** | Payment MS |
| /api/v1/checkout/** | Payment MS |
| /api/v1/payments/** | Payment MS |
| /api/v1/invoices/** | Payment MS |
| /auth/** | Keycloak |

---

## 3. Data Flow (Key Scenarios)

### 3.1 Order Placement Flow
    +----------+     +----------+     +----------+     +-------+
    | Customer |     | Meal MS  |     |Payment MS|     | Kafka |
    +----------+     +----------+     +----------+     +-------+
    |                |                |                |
    | 1. Browse      |                |                |
    |--------------->|                |                |
    |                |                |                |
    | 2. Select Meal |                |                |
    |--------------->|                |                |
    |                |                |                |
    | 3. Add to Cart |                |                |
    |--------------->|                |                |
    |                |                |                |
    | 4. Proceed to  |                |                |
    |    Checkout    |                |                |
    |--------------->|                |                |
    |                |                |                |
    |                | 5. Create      |                |
    |                |    Order       |                |
    |                |    (status:    |                |
    |                |    PENDING)    |                |
    |                |                |                |
    |                | 6. Publish     |                |
    |                |    Order       |                |
    |                |    Created     |                |
    |                |    Event       |                |
    |                |--------------->|--------------->|
    |                |                |                |
    |                |                | 7. Consume     |
    |                |                |    Event       |
    |                |                |    Create      |
    |                |                |    Invoice     |
    |                |                |    (status:    |
    |                |                |    PENDING)    |
    |                |                |                |
    | 8. Order       |                |                |
    |    Confirmed   |                |                |
    |<---------------|                |                |
    |                |                |                |
    | 9. Initiate    |                |                |
    |    Payment     |                |                |
    |--------------->|                |                |
    |                | 10. Forward    |                |
    |                |    Payment     |                |
    |                |    Request     |                |
    |                |--------------->|                |
    |                |                |                |
    |                |                | 11. Process    |
    |                |                |    Payment     |
    |                |                |    (Momo/      |
    |                |                |    Orange/     |
    |                |                |    Card)       |
    |                |                |                |
    |                |                | 12. Payment    |
    |                |                |    Confirmed   |
    |                |                |                |
    |                |                | 13. Publish    |
    |                |                |    Payment     |
    |                |                |    Confirmed   |
    |                |                |    Event       |
    |                |<---------------|<---------------|
    |                |                |                |
    |                | 14. Update     |                |
    |                |    Order       |                |
    |                |    (status:    |                |
    |                |    PAID)       |                |
    |                |                |                |
    | 15. Order      |                |                |
    |    Status      |                |                |
    |    Updated     |                |                |
    |<---------------|                |                |
    |                |                |                |
    | 16. Vendor     |                |                |
    |    Notified    |                |                |
    |    (WebSocket) |                |                |
    |<---------------|                |                |

### 3.2 Scheduled Meal Batch Flow
    +----------+     +----------+     +----------+     +-------+
    | Customer |     | Meal MS  |     |Payment MS|     | Kafka |
    +----------+     +----------+     +----------+     +-------+
    |                |                |                |
    | 1. Create      |                |                |
    |    Schedule    |                |                |
    |    (Batch)     |                |                |
    |--------------->|                |                |
    |                |                |                |
    |                | 2. Validate:   |                |
    |                |    - Vendor    |                |
    |                |      available |                |
    |                |    - Dates     |                |
    |                |      valid     |                |
    |                |    - Payment   |                |
    |                |      terms     |                |
    |                |                |                |
    |                | 3. Create      |                |
    |                |    Schedule    |                |
    |                |    (status:    |                |
    |                |    ACTIVE)     |                |
    |                |                |                |
    |                | 4. Calculate   |                |
    |                |    Total based |                |
    |                |    on terms    |                |
    |                |                |                |
    |                | 5. Publish     |                |
    |                |    Schedule    |                |
    |                |    Created     |                |
    |                |    Event       |                |
    |                |--------------->|--------------->|
    |                |                |                |
    |                |                | 6. Consume     |
    |                |                |    Event       |
    |                |                |    Create      |
    |                |                |    Recurring   |
    |                |                |    Invoices    |
    |                |                |                |
    | 7. Schedule    |                |                |
    |    Confirmed   |                |                |
    |<---------------|                |                |
    |                |                |                |
    | 8. Weekly      |                |                |
    |    Payment     |                |                |
    |    Reminder    |                |                |
    |<---------------|--------------->|--------------->|
    |                |                |                |
    | 9. Pay via     |                |                |
    |    Momo/Orange |                |                |
    |--------------->|                |                |
    |                | 10. Forward    |                |
    |                |    Payment     |                |
    |                |--------------->|                |
    |                |                |                |
    |                |                | 11. Process    |
    |                |                |    Payment     |
    |                |                |    (Momo/      |
    |                |                |    Orange)     |
    |                |                |                |
    |                |                | 12. Publish    |
    |                |                |    Invoice     |
    |                |                |    Paid Event  |
    |                |                |                |
    |                | 13. Mark Week  |                |
    |                |    as Paid     |                |
    |                |<---------------|<---------------|
    |                |                |                |
    | 14. Payment    |                |                |
    |    Confirmed   |                |                |
    |<---------------|                |                |
    |                |                |                |
    |                |                | 15. Generate   |
    |                |                |    Next        |
    |                |                |    Invoice     |
    |                |                |    for         |
    |                |                |    Next Week   |
    |                |                |                |
    |                | 16. Send       |                |
    |                |    Notification|                |
    |                |    (WebSocket) |                |
    |<---------------|                |                |

---

## 4. Technology Stack

### 4.1 Backend

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Language | Java | 17 LTS | Stability, performance, enterprise-ready |
| Framework | Spring Boot | 3.x | Comprehensive ecosystem, microservices support |
| Security | Spring Security + OAuth2 | - | Keycloak integration |
| API Gateway | Spring Cloud Gateway | 2023.x | Reactive, non-blocking, K8s native |
| ORM | Spring Data JPA | 3.x | Clean database operations |
| Migration | Flyway | 9.x | Version-controlled DB schema |
| Messaging | Apache Kafka | 3.x | Async communication between services |
| Cache | Redis | 7.x | Response caching, session storage |
| Logging | ELK Stack | 8.x | Centralized logging |
| Monitoring | Micrometer + Prometheus | - | Metrics for K8s HPA |

### 4.2 Frontend

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Framework | Angular | 18.x | TypeScript, robust ecosystem, enterprise-grade |
| Styling | Tailwind CSS | 3.x | Utility-first, responsive, customizable |
| UI Components | Angular Material | 18.x | Accessible, pre-built components |
| State Management | NgRx | 18.x | Predictable state, debugging tools |
| HTTP Client | Angular HTTP | 18.x | Interceptors for auth |
| Forms | Reactive Forms | 18.x | Strong validation |
| Charts | Chart.js | 4.x | Lightweight dashboards |
| Testing | Cypress + Jest | - | E2E and unit testing |

### 4.3 Infrastructure

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Containerization | Docker | Standardization, portability |
| Orchestration | Kubernetes (AKS) | Scaling, self-healing |
| IAM | Keycloak | Self-hosted, OAuth2/OIDC, social login |
| Image Storage | MinIO | S3-compatible, self-hosted |
| Database | PostgreSQL | ACID compliance, reliability |
| CI/CD | GitHub Actions | Automation, testing, deployment |
| Secrets Management | Azure Key Vault | Secure credentials |

---

## 5. Database Design (Conceptual)

### 5.1 Meal Management Database (meal_db)

**Core Tables**:

vendors
- id (PK)
- business_name
- description
- address
- email
- phone
- is_active
- rating_avg
- created_at

meals
- id (PK)
- vendor_id (FK)
- name
- description
- price
- category_id (FK)
- image_url
- dietary_info
- is_available
- prep_time
- rating_avg

categories
- id (PK)
- name
- parent_id

ingredients
- id (PK)
- meal_id (FK)
- name
- is_allergen

orders
- id (PK)
- customer_id
- vendor_id
- status
- total_price
- delivery_address
- pickup_address
- scheduled_at
- payment_term
- created_at

order_items
- id (PK)
- order_id (FK)
- meal_id (FK)
- quantity
- unit_price
- total_price

schedules
- id (PK)
- customer_id
- vendor_id
- type (recurring/specific/mixed)
- start_date
- end_date
- frequency
- status
- payment_term
- created_at

schedule_items
- id (PK)
- schedule_id (FK)
- meal_id (FK)
- date
- is_recurring
- quantity

ratings
- id (PK)
- customer_id
- meal_id (FK)
- vendor_id (FK)
- order_id (FK)
- meal_rating (1-5)
- vendor_rating (1-5)
- delivery_rating (1-5)
- comment
- created_at

customer_profiles
- id (PK)
- user_id (Keycloak)
- name
- email
- phone
- default_address
- created_at

vendor_profiles
- id (PK)
- user_id (Keycloak)
- business_name
- description
- address
- email
- phone
- delivery_radius
- pickup_address
- operating_hours
- badges
- is_active
- created_at

### 5.2 Payment Database (payment_db)

**Core Tables**:

carts
- id (PK)
- customer_id
- created_at
- expires_at

cart_items
- id (PK)
- cart_id (FK)
- meal_id (FK)
- quantity
- unit_price

invoices
- id (PK)
- order_id
- customer_id
- vendor_id
- total
- status (pending/paid/failed/cancelled)
- due_date
- paid_at
- payment_term
- created_at

transactions
- id (PK)
- invoice_id (FK)
- amount
- gateway (momo/orange/visa/mastercard)
- reference
- status
- created_at

scheduled_payments
- id (PK)
- invoice_id (FK)
- frequency (weekly/monthly/quarterly)
- next_due_date
- last_paid_date
- status

payment_methods
- id (PK)
- customer_id
- type (momo/orange/visa/mastercard)
- details (encrypted)
- is_default
- created_at

---

## 6. Communication Patterns

### 6.1 Synchronous (REST)
- Frontend to Gateway to Microservices
- Used for: CRUD operations, search, checkout

### 6.2 Asynchronous (Kafka)

**Events**:

| Event | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| OrderCreatedEvent | Meal MS | Payment MS | Create invoice |
| OrderStatusChangedEvent | Meal MS | Payment MS | Update invoice status |
| PaymentConfirmedEvent | Payment MS | Meal MS | Confirm order payment |
| PaymentFailedEvent | Payment MS | Meal MS | Handle payment failure |

### 6.3 Real-time (WebSocket)
- Vendor dashboard: New orders, order status updates
- Customer: Order status tracking, delivery updates

---

## 7. Security Architecture

**Layers**:
1. HTTPS/TLS 1.3
2. Keycloak OAuth2/OIDC (JWT)
3. Spring Security @PreAuthorize
4. Role-based access:
    - ROLE_CUSTOMER
    - ROLE_VENDOR
    - ROLE_ADMIN
5. API Gateway rate limiting
6. Input validation (OWASP)
7. CORS configuration
8. Secrets in Azure Key Vault

---

## 8. Deployment Architecture (Azure)

    +-----------------------------------------------------------+
    |                 AZURE KUBERNETES (AKS)                     |
    +-----------------------------------------------------------+
    |                                                           |
    |  +---------------------------------------------------+   |
    |  |            INGRESS CONTROLLER                      |   |
    |  |         (Nginx / Azure Application Gateway)       |   |
    |  +---------------------------------------------------+   |
    |                         |                                 |
    |  +---------------------------------------------------+   |
    |  |         API GATEWAY (Spring Cloud Gateway)        |   |
    |  |  - Replicas: 2                                   |   |
    |  |  - HPA: CPU 70%                                  |   |
    |  +---------------------------------------------------+   |
    |                         |                                 |
    |      +------------------+------------------+             |
    |      v                  v                  v             |
    |  +----------+    +----------+    +----------+         |
    |  | Meal MS  |    |Payment MS|    |Keycloak  |         |
    |  | Replicas:3|    |Replicas:2|    |Replicas:1|         |
    |  +----------+    +----------+    +----------+         |
    |      |                |                |                 |
    |      +--------+-------+--------+-------+                 |
    |               v               v                         |
    |  +---------------------------------------------------+ |
    |  |         POSTGRESQL (StatefulSet)                  | |
    |  |  - meal_db (Primary + Replica)                    | |
    |  |  - payment_db (Primary + Replica)                 | |
    |  +---------------------------------------------------+ |
    |               |                                         |
    |  +---------------------------------------------------+ |
    |  |      MINIO (StatefulSet)                          | |
    |  |  - 3 replicas (Distributed mode)                  | |
    |  +---------------------------------------------------+ |
    |               |                                         |
    |  +---------------------------------------------------+ |
    |  |      REDIS (StatefulSet)                          | |
    |  |  - 3 replicas (Sentinel)                          | |
    |  +---------------------------------------------------+ |
    |               |                                         |
    |  +---------------------------------------------------+ |
    |  |      KAFKA (StatefulSet)                          | |
    |  |  - 3 brokers                                      | |
    |  +---------------------------------------------------+ |
    +-----------------------------------------------------------+

External Services:
- Azure Key Vault (Secrets)
- Azure Monitor (Metrics/Logs)
- Payment Gateways (Momo, Orange, Stripe)

### External Services:

- **Azure Key Vault (Secrets)**

- **Azure Monitor (Metrics/Logs)**

- **Payment Gateways (Momo, Orange, Stripe)**


---

## 9. Monitoring & Observability

| Component | Tool | Purpose |
|-----------|------|---------|
| Metrics | Prometheus + Grafana | CPU, memory, request latency, error rates |
| Logging | ELK Stack | Centralized logs, error tracking |
| Tracing | Jaeger | Distributed tracing for debugging |
| Alerts | Prometheus AlertManager | Email/Slack alerts for system issues |
| Health Checks | Spring Boot Actuator | /actuator/health, /actuator/metrics |
| Dashboards | Grafana | Custom dashboards for each service |

---

## 10. Performance Targets

| Metric | Target |
|--------|--------|
| API P95 Latency | < 500ms |
| Throughput | 1000 req/sec per service |
| Database Query Time | < 100ms |
| Image Upload Time | < 2s (5MB) |
| Page Load Time | < 2s |
| Concurrent Users | 1000+ |
| Database Connections | 50 per service |
| Cache Hit Rate | > 80% |

---

## 11. Disaster Recovery

| Scenario | Strategy | RTO | RPO |
|----------|----------|-----|-----|
| Pod Failure | K8s auto-restart | 30s | 0 |
| Node Failure | Pod rescheduling | 2min | 0 |
| Database Failure | Read replica promotion | 5min | 5min |
| Region Failure | Geo-replication (future) | - | - |
| Data Corruption | Point-in-time recovery | 1hr | 5min |

---

## 12. Cost Estimation (Azure, Monthly)

| Resource | Estimated Cost |
|----------|---------------|
| AKS Cluster (2 nodes, D4s v3) | $200-300 |
| PostgreSQL (2 instances) | $100-150 |
| Redis | $50-80 |
| MinIO (3 nodes) | $100-150 |
| Kafka (3 brokers) | $150-200 |
| Keycloak | $50-80 |
| Load Balancer + Networking | $50-100 |
| Monitoring (ELK) | $50-100 |
| **Total** | **$750-1,160** |

