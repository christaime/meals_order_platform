# Multi-Vendor Meal Marketplace – Requirements Document

## 1. Project Overview

A full-stack platform connecting food vendors (restaurants, caterers, home chefs) with customers. The platform enables vendors to manage their meal offerings, customers to browse, order, and schedule meals, with a unique "Scheduled Meal Batch" feature for recurring or customized meal plans.

### 1.1 Vision
Create a trusted, community-driven food marketplace with transparent vendor ratings, flexible scheduling, and multiple payment options tailored for the Cameroonian market.

### 1.2 Target Audience
- **Vendors**: Restaurants, caterers, home chefs, food businesses
- **Customers**: Individuals, families, offices seeking convenient meal solutions
- **Administrators**: Platform operators managing vendor compliance

---

## 2. Functional Requirements

### 2.1 Vendor Management

#### 2.1.1 Vendor Registration & Profile
| ID | Requirement | Priority |
|----|-------------|----------|
| V-01 | Vendors can register with business name, address, contact info, description | Must |
| V-02 | Vendors can upload a profile picture and cover image | Should |
| V-03 | Vendors can set operating hours and days | Should |
| V-04 | Vendors can define delivery zones or radius | Must |
| V-05 | Vendors can set pickup address | Must |
| V-06 | Vendors can specify cuisine type and specialties | Should |

#### 2.1.2 Meal Management
| ID | Requirement | Priority |
|----|-------------|----------|
| M-01 | Vendors can create, edit, delete meals | Must |
| M-02 | Each meal has: name, description, price, photos | Must |
| M-03 | Meals include dietary information (vegan, gluten-free, halal, etc.) | Should |
| M-04 | Meals include full ingredient list (vendor-declared) | Must |
| M-05 | Vendors can mark meals as available/unavailable | Must |
| M-06 | Vendors can set meal preparation time | Should |
| M-07 | Vendors can set daily meal limits/quotas | Could |

#### 2.1.3 Order Management (Vendor View)
| ID    | Requirement                                                              | Priority |
|-------|--------------------------------------------------------------------------|----------|
| O-01  | Vendors can view incoming orders in real-time                            | Must |
| O-02  | Vendors can update order status (Preparing, Ready, Delivered, Completed) | Must |
| O-03  | Vendors can view order history                                           | Should |
| O-04  | Vendors can cancel orders (with reason)                                  | Should |
| O-05  | Vendors can see customer order notes/preferences                         | Could |
| O-06  | Vendors can print/download receipts for customer orders                  | Should |
| O-07	 | Vendor receipt includes: customer info, order items, total, payment status	| Should |

#### 2.1.4 Vendor Dashboard
| ID | Requirement | Priority |
|----|-------------|----------|
| D-01 | Vendors see daily/weekly/monthly revenue | Must |
| D-02 | Vendors see top-selling meals | Must |
| D-03 | Vendors see order volume trends | Should |
| D-04 | Vendors see customer ratings and complaints | Must |
| D-05 | Vendors see most demanded delivery zones | Should |
| D-06 | Vendors receive alerts for negative ratings | Must |

#### 2.1.5 Vendor Badges & Certification
| ID | Requirement | Priority |
|----|-------------|----------|
| B-01 | Vendors can apply for certification/badges | Should |
| B-02 | Badges require administrative approval | Should |
| B-03 | Badges are displayed on vendor profile and meals | Should |

---

### 2.2 Customer Management

#### 2.2.1 Customer Registration & Profile
| ID | Requirement | Priority |
|----|-------------|----------|
| C-01 | Customers register with email (login), name, phone | Must |
| C-02 | Customers can add multiple delivery addresses | Must |
| C-03 | Customers can save payment methods | Should |
| C-04 | Customers can set default delivery address | Should |
| C-05 | Customers can view order history and payment history | Must |

#### 2.2.2 Browsing & Discovery
| ID | Requirement | Priority |
|----|-------------|----------|
| B-01 | Browse meals by vendor, category, dietary preference | Must |
| B-02 | Search for specific meals or vendors | Must |
| B-03 | Filter by address/zone (proximity) | Must |
| B-04 | Filter by restaurant name/brand | Should |
| B-05 | Filter by meal category | Must |
| B-06 | Filter by ingredients to exclude (allergies) | Must |
| B-07 | Sort by rating, price, popularity | Should |
| B-08 | View vendor rating and reviews | Must |
| B-09 | View meal-specific rating | Must |

#### 2.2.3 Ordering
| ID | Requirement | Priority |
|----|-------------|----------|
| O-06 | One-time meal order for immediate or future delivery/pickup | Must |
| O-07 | **Scheduled Meal Batch** – order multiple meals on a schedule | Must |
| O-08 | Batch can have recurring menu (same meals repeated) | Must |
| O-09 | Batch can have specific meals per date | Must |
| O-10 | Mixed mode (recurring + specific) in same period | Should |
| O-11 | Customers can pause/skip scheduled deliveries | Should |
| O-12 | Customers can modify upcoming scheduled meals | Should |
| O-13 | Customers can cancel scheduled batches (with notice period) | Should |

#### 2.2.4 Ratings & Reviews
| ID | Requirement | Priority |
|----|-------------|----------|
| R-01 | Customers rate: the meal (taste/quality) | Must |
| R-02 | Customers rate: vendor experience (service) | Must |
| R-03 | Customers rate: delivery experience | Should |
| R-04 | Star rating system (1–5) | Must |
| R-05 | Confirmation popup before submission | Must |
| R-06 | No editing after submission | Must |
| R-07 | Customers can leave text reviews | Should |
| R-08 | Negative ratings (≤2 stars) trigger admin email alerts | Must |

#### 2.2.5 Authentication & Security
| ID | Requirement | Priority |
|----|-------------|----------|
| A-01 | Login always via email | Must |
| A-02 | Social login: Google, Facebook, Outlook | Must |
| A-03 | "Order this meal" triggers authentication if not logged in | Must |
| A-04 | JWT-based session management | Must |
| A-05 | Role-based access (Customer, Vendor, Admin) | Must |
| A-06 | Password reset via email | Should |

---

### 2.3 Payment System

#### 2.3.1 Payment Gateways
| ID | Requirement | Priority |
|----|-------------|----------|
| P-01 | Mobile Money (MTN Momo) | Must |
| P-02 | Orange Money | Must |
| P-03 | Prepaid cards (Visa, Mastercard) | Must |
| P-04 | PayPal (Phase 2) | Could |
| P-05 | Platform supports multiple currencies (default XAF) | Should |
| P-06 | Admin can set default currency | Must |

#### 2.3.2 Checkout & Cart
| ID | Requirement | Priority |
|----|-------------|----------|
| P-07 | Shopping cart with add/remove/update quantity | Must |
| P-08 | Cart persists across sessions | Should |
| P-09 | Apply discount/promo codes | Could |
| P-10 | Order summary with itemized pricing | Must |
| P-11 | Customers choose delivery or pickup at checkout | Must |
| P-12 | Select delivery address or pickup location | Must |
| P-13 | Choose payment method | Must |

#### 2.3.3 Payment Terms (Scheduled Batches)
| ID | Requirement | Priority |
|----|-------------|----------|
| P-14 | Vendor chooses payment term for batches | Must |
| P-15 | Options: Upfront, Weekly, Monthly, Quarterly | Must |
| P-16 | System generates recurring invoices | Must |
| P-17 | Automatic payment reminders | Should |
| P-18 | Payment failure notifications | Must |

#### 2.3.4 Invoicing & History
| ID     | Requirement                                                          | Priority |
|--------|----------------------------------------------------------------------|----------|
| P-19   | Customers view payment history                                       | Must |
| P-20   | Vendors view payment/invoice history                                 | Should |
| P-21   | Digital invoices generated (PDF)                                     | Could |
| P-22   | Transaction receipts via email/SMS                                   | Should |
| P-23   | Customers can view and download/print receipts for completed orders	 | Should                               |
| P-24   | Receipt includes: order details, items, total, payment method, date	 | Should                                                               |

---

### 2.4 Admin Management

#### 2.4.1 Super Admin Dashboard
| ID | Requirement | Priority |
|----|-------------|----------|
| AD-01 | Separate Admin UI (lazy-loaded module) | Must |
| AD-02 | View all vendors with status (active/banned) | Must |
| AD-03 | Ban/unban vendors | Must |
| AD-04 | View flagged vendors (negative ratings/complaints) | Must |
| AD-05 | View platform analytics (total orders, revenue, active users) | Should |
| AD-06 | Manage platform settings (default currency, etc.) | Must |
| AD-07 | View system logs and alerts | Could |
| AD-08 | Review badge/certification applications | Should |

#### 2.4.2 Compliance & Monitoring
| ID | Requirement | Priority |
|----|-------------|----------|
| AD-09 | Automated email alerts for negative vendor ratings | Must |
| AD-10 | Admin can manually review vendors | Should |
| AD-11 | Audit trail for admin actions | Could |

---

## 3. Non-Functional Requirements

### 3.1 Performance
| ID | Requirement | Target |
|----|-------------|--------|
| NF-01 | API response time (95th percentile) | < 500ms |
| NF-02 | Page load time (first contentful paint) | < 2s |
| NF-03 | Concurrent users supported | 1000+ |
| NF-04 | Image upload max size | 5MB |

### 3.2 Security
| ID | Requirement |
|----|-------------|
| NF-05 | All communications via HTTPS |
| NF-06 | JWT tokens with short expiration + refresh |
| NF-07 | Rate limiting on API endpoints |
| NF-08 | Input validation & sanitization (OWASP) |
| NF-09 | PCI DSS compliance for payment handling |
| NF-10 | Secure storage of payment credentials (tokenization) |

### 3.3 Availability & Scalability
| ID | Requirement |
|----|-------------|
| NF-11 | 99.5% uptime target |
| NF-12 | Horizontal scaling capability (microservices) |
| NF-13 | Database replication for failover |
| NF-14 | Auto-scaling based on load (Kubernetes HPA) |

### 3.4 Maintainability
| ID | Requirement |
|----|-------------|
| NF-15 | Comprehensive API documentation (Swagger/OpenAPI) |
| NF-16 | Code coverage > 70% (unit tests) |
| NF-17 | Structured logging (ELK stack or similar) |
| NF-18 | CI/CD pipeline (GitHub Actions/GitLab) |

### 3.5 Usability
| ID | Requirement |
|----|-------------|
| NF-19 | Mobile-first responsive design (Tailwind CSS) |
| NF-20 | Accessibility compliance (WCAG 2.1 AA) |
| NF-21 | Multi-language support (English, French – Phase 2) |
| NF-22 | Intuitive onboarding for vendors |

### 3.6 Data & Privacy
| ID | Requirement |
|----|-------------|
| NF-23 | GDPR compliance (user data handling) |
| NF-24 | Data retention policy (e.g., 7 years for financial data) |
| NF-25 | Regular database backups (daily) |

---

## 4. User Stories

### 4.1 As a Customer
- I want to browse meals near me without logging in
- I want to create an account with email and social login
- I want to filter meals by ingredients I'm allergic to
- I want to order a meal for pickup or delivery
- I want to schedule meals for the week (recurring or custom)
- I want to rate meals and vendors after delivery
- I want to look at my ongoing invoice and pay them.
- I want to see my order and payment history

### 4.2 As a Vendor
- I want to register my business and list my meals
- I want to upload photos and describe my meals with ingredients
- I want to manage my orders and update status
- I want to see which meals sell best and revenue trends
- I want to know customer ratings and feedback
- I want to offer scheduling options with flexible payment terms

### 4.3 As an Admin
- I want to monitor vendor activity and enforce compliance
- I want to ban vendors with repeated negative ratings
- I want to review and approve badge/certification applications
- I want to manage platform settings (currency, etc.)
- I want to view system-wide analytics

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| BR-01 | Vendors must provide accurate ingredient lists; misrepresentation leads to account suspension |
| BR-02 | Customers cannot edit ratings after submission (confirmation required) |
| BR-03 | Vendors with average rating < 2.5 stars (over 30 days) trigger admin alert |
| BR-04 | Scheduled batch cancellations require 24-hour notice for full refund |
| BR-05 | Payment terms for batches are set by vendor at creation time |
| BR-06 | Admin can override default currency; all prices converted at checkout |
| BR-07 | Social login requires email verification |
| BR-08 | Vendor registration is immediate; no approval required |

---

## 6. Constraints & Assumptions

### 6.1 Technical Constraints
- Must use Java 17+, Spring Boot, PostgreSQL
- Must use Angular (latest) + Tailwind CSS
- Must be deployable in Azure Kubernetes Service
- Must use Docker containers

### 6.2 Assumptions
- Most Cameroonians have an email address (required for Android phones)
- Delivery infrastructure is vendor-managed
- Internet connectivity allows for real-time order updates
- Users have basic digital literacy for platform usage

### 6.3 Dependencies
- Keycloak (self-hosted) for IAM
- MinIO for image storage
- Stripe/Paystack integration for card payments
- Mobile Money APIs (Momo, Orange) for Cameroon