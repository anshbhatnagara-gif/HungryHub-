# HungryHub REST API Documentation

This document outlines the available REST endpoints exposed by the HungryHub Node/Express backend.

---

## 1. Authentication & Profiles (`/api/auth`)

### Register User
* **Endpoint**: `POST /api/auth/register`
* **Payload**:
  ```json
  {
    "name": "Sarah Jenkins",
    "email": "customer@hungryhub.com",
    "password": "password123",
    "role": "customer",
    "phone": "+1444555666",
    "referred_by": "inviteCode"
  }
  ```
* **Response**: `201 Created` with JWT Token and profile object.

### Login User
* **Endpoint**: `POST /api/auth/login`
* **Payload**:
  ```json
  {
    "email": "customer@hungryhub.com",
    "password": "password123"
  }
  ```
* **Response**: `200 OK` with JWT Token.

### Google Sign-In Simulation
* **Endpoint**: `POST /api/auth/google-login`
* **Payload**:
  ```json
  {
    "email": "google_user@hungryhub.com",
    "name": "Sarah Jenkins",
    "picture": "https://url.com"
  }
  ```
* **Response**: `200 OK` (creates account automatically if missing).

### Get Profile
* **Endpoint**: `GET /api/auth/profile`
* **Headers**: `Authorization: Bearer <token>`
* **Response**: User details with wallet and loyalty points counts.

---

## 2. Restaurants & Cuisines (`/api/restaurants`)

### Search Restaurants List
* **Endpoint**: `GET /api/restaurants`
* **Query Parameters**:
  - `search` (name/cuisine)
  - `category` (category name)
* **Response**: List of restaurant items.

### Get Cuisines Categories
* **Endpoint**: `GET /api/restaurants/categories`
* **Response**: Global categories lists.

### Get AI recommendations
* **Endpoint**: `GET /api/restaurants/recommendations`
* **Response**: List of 4 menu recommendations with AI confidence percentages.

---

## 3. Order Checkouts & Logistics (`/api/orders`)

### Place Order
* **Endpoint**: `POST /api/orders/checkout`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**:
  ```json
  {
    "restaurant_id": 1,
    "items": [{ "id": 1, "quantity": 2, "price": 18.00 }],
    "subtotal": 36.00,
    "delivery_fee": 5.00,
    "tax": 1.80,
    "discount_amount": 10.00,
    "payable_amount": 32.80,
    "payment_method": "wallet",
    "delivery_address": "742 Evergreen Terrace",
    "coupon_code": "HUNGRY50"
  }
  ```
* **Response**: `211 Created` returning generated order ID.

### Validate Discount Coupon
* **Endpoint**: `POST /api/orders/coupon/validate`
* **Payload**:
  ```json
  {
    "code": "HUNGRY50",
    "amount": 36.00
  }
  ```
* **Response**: `200 OK` with valid flag and discount amount calculations.

---

## 4. Admin Management (`/api/admin`)

### Moderation Metrics
* **Endpoint**: `GET /api/admin/metrics`
* **Headers**: `Authorization: Bearer <adminToken>`
* **Response**: Stats for sales, users, orders, commissions.

### Export sales reports (CSV)
* **Endpoint**: `GET /api/admin/export`
* **Headers**: `Authorization: Bearer <adminToken>`
* **Response**: CSV document download.
