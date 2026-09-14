# API Contract – Multi-Vendor Meal Marketplace

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:8080/api/v1` |
| Development | `https://dev-api.mealmarket.com/api/v1` |
| Production | `https://api.mealmarket.com/api/v1` |

---

## 1. Authentication & Authorization

### 1.1 Keycloak Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/realms/mealmarket/protocol/openid-connect/token` | POST | Get JWT token (email/password) |
| `/auth/realms/mealmarket/protocol/openid-connect/auth` | GET | Social login redirect |
| `/auth/realms/mealmarket/protocol/openid-connect/logout` | POST | Logout |
| `/auth/realms/mealmarket/protocol/openid-connect/userinfo` | GET | Get user info |

### 1.2 Headers

All authenticated endpoints require:
Authorization: Bearer <jwt_token>
Content-Type: application/json

---

## 2. Meal Management Service APIs

### 2.1 Vendor Management

#### Register Vendor
POST /vendors/register

**Request Body:**
```json
{
  "businessName": "Delicious Bites",
  "description": "Authentic Cameroonian cuisine",
  "address": "123 Main Street, Yaoundé",
  "email": "vendor@deliciousbites.com",
  "phone": "+237 6 12 34 56 78",
  "password": "securePassword123",
  "cuisineType": ["Cameroonian", "African"],
  "operatingHours": {
    "monday": {"open": "08:00", "close": "22:00"},
    "tuesday": {"open": "08:00", "close": "22:00"},
    "wednesday": {"open": "08:00", "close": "22:00"},
    "thursday": {"open": "08:00", "close": "22:00"},
    "friday": {"open": "08:00", "close": "23:00"},
    "saturday": {"open": "09:00", "close": "23:00"},
    "sunday": {"open": "09:00", "close": "21:00"}
  },
  "deliveryRadius": 10,
  "pickupAddress": "123 Main Street, Yaoundé"
}
```

**Response (201 Created):**

```json
{
  "id": "vnd_123456",
  "businessName": "Delicious Bites",
  "email": "vendor@deliciousbites.com",
  "isActive": true,
  "ratingAvg": 0,
  "createdAt": "2026-09-05T10:00:00Z"
}
```

#### Get Vendor Profile

GET /vendors/{vendorId}
**Response:**

```json
{
  "id": "vnd_123456",
  "businessName": "Delicious Bites",
  "description": "Authentic Cameroonian cuisine",
  "address": "123 Main Street, Yaoundé",
  "email": "vendor@deliciousbites.com",
  "phone": "+237 6 12 34 56 78",
  "ratingAvg": 4.5,
  "totalRatings": 127,
  "badges": ["Verified", "Top Rated"],
  "isActive": true,
  "deliveryRadius": 10,
  "pickupAddress": "123 Main Street, Yaoundé",
  "operatingHours": {
    "monday": {"open": "08:00", "close": "22:00"},
    "tuesday": {"open": "08:00", "close": "22:00"}
  },
  "createdAt": "2026-09-05T10:00:00Z"
}
```

#### Update Vendor Profile
PUT /vendors/{vendorId}

**Request Body: Same as register (partial updates allowed)**

### 2.2 Meal Management

#### Create Meal

POST /meals
**Request Body:**

```json
{
  "vendorId": "vnd_123456",
  "name": "Ndolé with Plantains",
  "description": "Traditional Cameroonian ndolé with beef, shrimp, and fried plantains",
  "price": 2500,
  "categoryId": "cat_001",
  "dietaryInfo": ["gluten-free", "halal"],
  "ingredients": [
    {"name": "Ndolé leaves", "isAllergen": false},
    {"name": "Beef", "isAllergen": false},
    {"name": "Shrimp", "isAllergen": true},
    {"name": "Plantains", "isAllergen": false}
  ],
  "prepTime": 45,
  "isAvailable": true,
  "dailyLimit": 20,
  "availableDays": ["MONDAY", "WEDNESDAY", "FRIDAY"]
}
```

**Response (201 Created):**

```json
{
  "id": "mea_789012",
  "vendorId": "vnd_123456",
  "name": "Ndolé with Plantains",
  "price": 2500,
  "ratingAvg": 0,
  "imageUrl": "https://minio.mealmarket.com/meals/mea_789012.jpg",
  "isAvailable": true
}
```

#### Upload Meal Image
POST /meals/{mealId}/image
Content-Type: multipart/form-data

**Request Body: file: <image_file>**

**Response:**

```json
{
  "imageUrl": "https://minio.mealmarket.com/meals/mea_789012.jpg"
}
```

Browse Meals (with Filters)

GET /meals?page=0&size=20&sort=rating
Query Parameters:

Parameter	Type	Description
vendorId	string	Filter by vendor
categoryId	string	Filter by category
dietary	string	Filter by dietary preference
excludeIngredients	string	Comma-separated ingredient IDs/names to exclude
lat	float	Latitude for proximity search
lng	float	Longitude for proximity search
radius	int	Search radius in km
minPrice	int	Minimum price
maxPrice	int	Maximum price
search	string	Full-text search (meal name, description)
available	boolean	Filter by availability
page	int	Page number (default: 0)
size	int	Page size (default: 20)
sort	string	Sort field (rating, price, name)
Response:

```json
{
  "content": [
    {
      "id": "mea_789012",
      "vendorId": "vnd_123456",
      "vendorName": "Delicious Bites",
      "name": "Ndolé with Plantains",
      "description": "Traditional Cameroonian ndolé...",
      "price": 2500,
      "imageUrl": "https://minio.mealmarket.com/meals/mea_789012.jpg",
      "ratingAvg": 4.7,
      "dietaryInfo": ["gluten-free", "halal"],
      "ingredients": ["Ndolé leaves", "Beef", "Shrimp", "Plantains"],
      "isAvailable": true,
      "distance": 2.3,
      "vendorRating": 4.5
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 45,
  "totalPages": 3
}
```
Get Meal Details

GET /meals/{mealId}
Response:

```json
{
  "id": "mea_789012",
  "vendorId": "vnd_123456",
  "vendorName": "Delicious Bites",
  "name": "Ndolé with Plantains",
  "description": "Traditional Cameroonian ndolé with beef, shrimp, and fried plantains",
  "price": 2500,
  "category": "Main Dish",
  "imageUrl": "https://minio.mealmarket.com/meals/mea_789012.jpg",
  "dietaryInfo": ["gluten-free", "halal"],
  "ingredients": [
    {"name": "Ndolé leaves", "isAllergen": false},
    {"name": "Beef", "isAllergen": false},
    {"name": "Shrimp", "isAllergen": true}
  ],
  "prepTime": 45,
  "isAvailable": true,
  "dailyLimit": 20,
  "availableDays": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "ratingAvg": 4.7,
  "totalRatings": 89,
  "vendorRating": 4.5
}
```
Update Meal
PUT /meals/{mealId}
Request Body: Same as create (partial updates allowed)

Delete Meal

DELETE /meals/{mealId}
Response (204 No Content)

2.3 Order Management
Create Order
POST /orders
Request Body:

```json
{
  "customerId": "cus_456789",
  "vendorId": "vnd_123456",
  "items": [
    {
      "mealId": "mea_789012",
      "quantity": 2,
      "unitPrice": 2500
    },
    {
      "mealId": "mea_345678",
      "quantity": 1,
      "unitPrice": 3000
    }
  ],
  "deliveryType": "delivery",
  "deliveryAddress": "456 Avenue, Douala",
  "deliveryInstructions": "Gate code: 1234",
  "scheduledDate": "2026-09-06T12:00:00Z",
  "specialInstructions": "Extra spicy please",
  "paymentTerm": "upfront"
}
```
Response (201 Created):

```json
{
  "id": "ord_567890",
  "customerId": "cus_456789",
  "vendorId": "vnd_123456",
  "status": "PENDING",
  "totalAmount": 8000,
  "items": [
    {
      "mealId": "mea_789012",
      "mealName": "Ndolé with Plantains",
      "quantity": 2,
      "unitPrice": 2500,
      "total": 5000
    },
    {
      "mealId": "mea_345678",
      "mealName": "Poulet DG",
      "quantity": 1,
      "unitPrice": 3000,
      "total": 3000
    }
  ],
  "createdAt": "2026-09-05T10:30:00Z",
  "invoiceId": "inv_234567"
}
```
Get Order Details
GET /orders/{orderId}
Response:

```json
{
  "id": "ord_567890",
  "customerId": "cus_456789",
  "customerName": "John Doe",
  "vendorId": "vnd_123456",
  "vendorName": "Delicious Bites",
  "status": "PREPARING",
  "totalAmount": 8000,
  "items": [...],
  "deliveryType": "delivery",
  "deliveryAddress": "456 Avenue, Douala",
  "scheduledDate": "2026-09-06T12:00:00Z",
  "paymentTerm": "upfront",
  "invoiceId": "inv_234567",
  "createdAt": "2026-09-05T10:30:00Z",
  "updatedAt": "2026-09-05T10:45:00Z"
}
```
Update Order Status
PUT /orders/{orderId}/status
Request Body:

```json
{
  "status": "PREPARING",
  "notes": "Preparing your order"
}
```
Status Values: PENDING, PAID, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

Response:

```json
{
  "id": "ord_567890",
  "status": "PREPARING",
  "updatedAt": "2026-09-05T10:45:00Z"
}
```
Get Customer Order History

GET /orders/customer/{customerId}?page=0&size=20
Get Vendor Order List

GET /orders/vendor/{vendorId}?page=0&size=20&status=PREPARING
Query Parameters:

Parameter	Type	Description
status	string	Filter by order status
dateFrom	string	Filter from date
dateTo	string	Filter to date
page	int	Page number
size	int	Page size
2.4 Scheduled Meal Batches
Create Schedule (Batch)
POST /schedules
Request Body:

```json
{
  "customerId": "cus_456789",
  "vendorId": "vnd_123456",
  "scheduleType": "mixed",
  "startDate": "2026-09-06",
  "endDate": "2026-09-27",
  "items": [
    {
      "mealId": "mea_789012",
      "frequency": "weekly",
      "daysOfWeek": [1, 3, 5],
      "quantityPerDay": 1
    },
    {
      "mealId": "mea_345678",
      "specificDates": ["2026-09-08", "2026-09-15"],
      "quantity": 2
    }
  ],
  "paymentTerm": "monthly",
  "deliveryAddress": "456 Avenue, Douala",
  "specialInstructions": "Knock and leave at door"
}
```
Schedule Types: recurring, specific, mixed

Response (201 Created):

```json
{
  "id": "sch_123456",
  "customerId": "cus_456789",
  "vendorId": "vnd_123456",
  "status": "ACTIVE",
  "scheduleType": "mixed",
  "startDate": "2026-09-06",
  "endDate": "2026-09-27",
  "items": [...],
  "totalAmount": 32000,
  "paymentTerm": "monthly",
  "createdAt": "2026-09-05T10:30:00Z"
}
```
Get Customer Schedules

GET /schedules/customer/{customerId}
Get Schedule Details

GET /schedules/{scheduleId}
Update Schedule

PUT /schedules/{scheduleId}
Cancel Schedule

DELETE /schedules/{scheduleId}
Response:

```json
{
  "id": "sch_123456",
  "status": "CANCELLED",
  "cancelledAt": "2026-09-05T11:00:00Z"
}
```
Pause Schedule

POST /schedules/{scheduleId}/pause
Response:

```json
{
  "id": "sch_123456",
  "status": "PAUSED",
  "pausedAt": "2026-09-05T11:00:00Z"
}
```
Resume Schedule

POST /schedules/{scheduleId}/resume
Response:

```json
{
  "id": "sch_123456",
  "status": "ACTIVE",
  "resumedAt": "2026-09-05T11:00:00Z"
}
```

2.5 Ratings
Submit Rating

POST /ratings
Request Body:

```json
{
  "orderId": "ord_567890",
  "customerId": "cus_456789",
  "mealId": "mea_789012",
  "vendorId": "vnd_123456",
  "mealRating": 5,
  "vendorRating": 4,
  "deliveryRating": 5,
  "comment": "Delicious meal! Will order again."
}
```
Response (201 Created):

```json
{
  "id": "rat_987654",
  "orderId": "ord_567890",
  "mealRating": 5,
  "vendorRating": 4,
  "deliveryRating": 5,
  "comment": "Delicious meal! Will order again.",
  "createdAt": "2026-09-05T11:00:00Z"
}
```
Get Meal Ratings

GET /ratings/meal/{mealId}?page=0&size=20
Response:

```json
{
  "content": [
    {
      "customerName": "John Doe",
      "rating": 5,
      "comment": "Excellent!",
      "createdAt": "2026-09-04T14:00:00Z"
    }
  ],
  "averageRating": 4.7,
  "totalRatings": 89
}
```
Get Vendor Ratings

GET /ratings/vendor/{vendorId}?page=0&size=20
Response:

```json
{
  "content": [
    {
      "customerName": "John Doe",
      "mealName": "Ndolé with Plantains",
      "mealRating": 5,
      "vendorRating": 4,
      "deliveryRating": 5,
      "comment": "Delicious meal!",
      "createdAt": "2026-09-04T14:00:00Z"
    }
  ],
  "averageMealRating": 4.7,
  "averageVendorRating": 4.5,
  "averageDeliveryRating": 4.3,
  "totalRatings": 127
}
```
2.6 Search
Search Meals

GET /search/meals?q=ndole&lat=3.848&lng=11.502&radius=10
Query Parameters:

Parameter	Type	Description
q	string	Search query (meal name, description)
lat	float	Latitude for proximity search
lng	float	Longitude for proximity search
radius	int	Search radius in km
category	string	Filter by category
dietary	string	Filter by dietary preference
exclude	string	Ingredients to exclude (comma-separated)
page	int	Page number
size	int	Page size
Search Vendors

GET /search/vendors?q=delicious&lat=3.848&lng=11.502&radius=10
Query Parameters:

Parameter	Type	Description
q	string	Search query (business name, description)
lat	float	Latitude for proximity search
lng	float	Longitude for proximity search
radius	int	Search radius in km
cuisine	string	Filter by cuisine type
page	int	Page number
size	int	Page size
Response:

```json
{
  "content": [
    {
      "id": "vnd_123456",
      "businessName": "Delicious Bites",
      "description": "Authentic Cameroonian cuisine",
      "address": "123 Main Street, Yaoundé",
      "ratingAvg": 4.5,
      "distance": 2.3,
      "imageUrl": "https://minio.mealmarket.com/vendors/vnd_123456.jpg",
      "badges": ["Verified", "Top Rated"]
    }
  ],
  "totalElements": 15
}
```
3. Payment Service APIs
3.1 Cart Management
Add Item to Cart

POST /cart/items
Request Body:

```json
{
  "customerId": "cus_456789",
  "mealId": "mea_789012",
  "quantity": 2,
  "unitPrice": 2500
}
```
Response:

```json
{
  "cartId": "cart_123",
  "items": [
    {
      "id": "ci_456",
      "mealId": "mea_789012",
      "mealName": "Ndolé with Plantains",
      "quantity": 2,
      "unitPrice": 2500,
      "total": 5000
    }
  ],
  "totalAmount": 5000,
  "totalItems": 2
}
```
Get Cart

GET /cart/{customerId}
Update Cart Item

PUT /cart/items/{itemId}
Request Body: { "quantity": 3 }

Remove from Cart

DELETE /cart/items/{itemId}
Response (204 No Content)

Clear Cart

DELETE /cart/{customerId}
Response (204 No Content)

3.2 Checkout
Initiate Checkout

POST /checkout
Request Body:

```json
{
  "customerId": "cus_456789",
  "cartId": "cart_123",
  "deliveryAddress": "456 Avenue, Douala",
  "deliveryType": "delivery",
  "scheduledDate": "2026-09-06T12:00:00Z",
  "paymentMethod": "momo",
  "paymentTerm": "upfront",
  "specialInstructions": "Call on arrival"
}
```
Response:

```json
{
  "orderId": "ord_567890",
  "invoiceId": "inv_234567",
  "totalAmount": 8000,
  "paymentLink": "https://api.mealmarket.com/pay/inv_234567",
  "status": "pending_payment",
  "expiresAt": "2026-09-05T11:00:00Z"
}
```
Get Checkout Summary

GET /checkout/{checkoutId}/summary
3.3 Payment Processing
Initiate Payment (Momo/Orange/Card)

POST /payments/initiate
Request Body:

```json
{
  "invoiceId": "inv_234567",
  "gateway": "momo",
  "phoneNumber": "+237 6 12 34 56 78",
  "amount": 8000,
  "currency": "XAF"
}
```
Gateways: momo, orange, visa, mastercard, paypal

Response:

```json
{
  "transactionId": "txn_345678",
  "status": "pending",
  "reference": "MOMO-123456",
  "expiresAt": "2026-09-05T10:45:00Z",
  "otpRequired": true
}
```
Confirm Payment (OTP)
POST /payments/confirm
Request Body:

```json
{
  "transactionId": "txn_345678",
  "otp": "123456"
}
```
Response:

```json
{
  "transactionId": "txn_345678",
  "status": "confirmed",
  "invoiceId": "inv_234567",
  "paidAt": "2026-09-05T10:35:00Z"
}
```
Check Payment Status

GET /payments/status/{transactionId}
Payment Webhook (From Gateway)

POST /payments/webhook
Request Body (from Momo):

```json
{
  "reference": "MOMO-123456",
  "status": "success",
  "transactionId": "txn_345678",
  "amount": 8000,
  "currency": "XAF",
  "timestamp": "2026-09-05T10:35:00Z",
  "customerPhone": "+237 6 12 34 56 78"
}
```
Response:

```json
{
  "received": true,
  "status": "processed"
}
```
3.4 Invoices
Get Invoice

GET /invoices/{invoiceId}
Response:

```json
{
  "id": "inv_234567",
  "orderId": "ord_567890",
  "customerId": "cus_456789",
  "customerName": "John Doe",
  "vendorId": "vnd_123456",
  "vendorName": "Delicious Bites",
  "items": [
    {
      "mealName": "Ndolé with Plantains",
      "quantity": 2,
      "unitPrice": 2500,
      "total": 5000
    },
    {
      "mealName": "Poulet DG",
      "quantity": 1,
      "unitPrice": 3000,
      "total": 3000
    }
  ],
  "subtotal": 8000,
  "tax": 0,
  "deliveryFee": 0,
  "total": 8000,
  "status": "paid",
  "paymentTerm": "upfront",
  "dueDate": "2026-09-05",
  "paidAt": "2026-09-05T10:35:00Z",
  "createdAt": "2026-09-05T10:30:00Z",
  "transactions": [
    {
      "id": "txn_345678",
      "gateway": "momo",
      "reference": "MOMO-123456",
      "amount": 8000,
      "status": "confirmed",
      "createdAt": "2026-09-05T10:35:00Z"
    }
  ]
}
```
Get Customer Invoices

GET /invoices/customer/{customerId}?page=0&size=20&status=paid
Query Parameters:

Parameter	Type	Description
status	string	Filter by status (pending/paid/failed)
dateFrom	string	Filter from date
dateTo	string	Filter to date
page	int	Page number
size	int	Page size
Get Vendor Invoices

GET /invoices/vendor/{vendorId}?page=0&size=20
Generate Invoice PDF

GET /invoices/{invoiceId}/pdf
Response: PDF file download.

3.5 Scheduled Payments
Create Recurring Payment

POST /scheduled-payments
Request Body:

```json
{
  "invoiceId": "inv_234567",
  "frequency": "weekly",
  "startDate": "2026-09-06",
  "endDate": "2026-09-27"
}
```
Frequency Options: weekly, monthly, quarterly

Response:

```json
{
  "id": "sp_789012",
  "invoiceId": "inv_234567",
  "frequency": "weekly",
  "nextDueDate": "2026-09-13",
  "status": "active",
  "createdAt": "2026-09-05T10:30:00Z"
}
```
Get Scheduled Payments

GET /scheduled-payments/customer/{customerId}
Update Scheduled Payment

PUT /scheduled-payments/{scheduledPaymentId}
Cancel Scheduled Payment

DELETE /scheduled-payments/{scheduledPaymentId}
4. Error Responses
All APIs return standard error format:

400 Bad Request:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed: email must be valid",
  "path": "/api/v1/vendors/register",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email address"
    }
  ]
}
```
401 Unauthorized:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "path": "/api/v1/orders"
}
```
403 Forbidden:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Access denied. Insufficient permissions.",
  "path": "/api/v1/admin/vendors"
}
```
404 Not Found:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Order with ID ord_567890 not found",
  "path": "/api/v1/orders/ord_567890"
}
```
409 Conflict:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Order is already in PREPARING status",
  "path": "/api/v1/orders/ord_567890/status"
}
```
500 Internal Server Error:

```json
{
  "timestamp": "2026-09-05T10:30:00Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "path": "/api/v1/payments/initiate"
}
```

5. Status Codes Summary
Code	Description	Usage
200	OK	Successful GET, PUT, DELETE requests
201	Created	Successful POST requests
204	No Content	Successful DELETE requests
400	Bad Request	Validation errors
401	Unauthorized	Missing/invalid authentication
403	Forbidden	Insufficient permissions
404	Not Found	Resource not found
409	Conflict	Business rule violation
422	Unprocessable Entity	Semantic errors
429	Too Many Requests	Rate limit exceeded
500	Internal Server Error	Server-side errors

6. Rate Limiting
Endpoint Group	Limit	Time Window
Authentication	5 requests	1 minute
Browse/Search	100 requests	1 minute
Orders (POST)	20 requests	1 minute
Payments (POST)	10 requests	1 minute
Ratings (POST)	10 requests	1 minute
Vendor Management	50 requests	1 minute

Rate Limit Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1693929600
