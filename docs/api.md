# Manufacturing ERP - API Reference Documentation

Comprehensive documentation of all backend REST endpoints implemented in the Manufacturing ERP system.

All API routes (except public auth and health endpoints) require a JSON Web Token provided in the HTTP header:
`Authorization: Bearer <token>`

---

## Table of Contents
1. [Health](#1-health)
2. [Authentication](#2-authentication)
3. [Customers](#3-customers)
4. [Enquiries](#4-enquiries)
5. [Products](#5-products)
6. [Inventory](#6-inventory)
7. [Quotations](#7-quotations)
8. [Sales Orders](#8-sales-orders)
9. [Dispatch](#9-dispatch)
10. [Standard Error Responses](#10-standard-error-responses)

---

## 1. Health

### Check Service Health
- **Method**: `GET`
- **Path**: `/api/health`
- **Authentication**: None (Public)
- **Required Role**: None
- **Response**: `200 OK`
```json
{
  "status": "ok"
}
```

---

## 2. Authentication

### Public User Registration
Registers a new user account. Unauthenticated registrations are strictly restricted to the `SALES` role.
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Authentication**: None (Public)
- **Required Role**: None (Assigns `SALES`)
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid_user_1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "SALES",
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Errors**:
  - `400 Bad Request`: Validation failure (short password, invalid email format)
  - `409 Conflict`: Email address already registered

### User Login
Authenticates credentials and returns a signed JWT containing user claims.
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid_admin",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Errors**:
  - `401 Unauthorized`: Invalid email or password

### Get Current User Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cuid_admin",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "createdAt": "2026-09-17T00:00:00.000Z",
    "updatedAt": "2026-09-17T00:00:00.000Z"
  }
}
```

---

## 3. Customers

### List All Customers
- **Method**: `GET`
- **Path**: `/api/customers`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid_cust_1",
      "companyName": "Acme Industrial Corp",
      "contactPerson": "John Doe",
      "mobile": "+91 9876543210",
      "email": "procurement@acme.com",
      "city": "Mumbai",
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    }
  ]
}
```

### Get Customer by ID
- **Method**: `GET`
- **Path**: `/api/customers/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK` (Single customer object)
- **Errors**: `404 Not Found`

### Create Customer
- **Method**: `POST`
- **Path**: `/api/customers`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**:
```json
{
  "companyName": "Apex Technologies",
  "contactPerson": "Rajesh Sharma",
  "mobile": "9876543211",
  "email": "contact@apextech.com",
  "city": "Pune"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cuid_cust_new",
    "companyName": "Apex Technologies",
    "contactPerson": "Rajesh Sharma",
    "mobile": "9876543211",
    "email": "contact@apextech.com",
    "city": "Pune"
  }
}
```

### Update Customer
- **Method**: `PUT`
- **Path**: `/api/customers/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**: Partial customer fields
- **Response**: `200 OK`

---

## 4. Enquiries

### List All Enquiries
- **Method**: `GET`
- **Path**: `/api/enquiries`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK` (Array of enquiries including customer, items with product details, and quotations)

### Get Enquiry by ID
- **Method**: `GET`
- **Path**: `/api/enquiries/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`
- **Errors**: `404 Not Found`

### Create Enquiry
- **Method**: `POST`
- **Path**: `/api/enquiries`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**:
```json
{
  "customerId": "cuid_cust_1",
  "requiredDate": "2026-10-15T00:00:00.000Z",
  "notes": "Urgent delivery requested for project phase 1",
  "items": [
    {
      "productId": "cuid_prod_1",
      "quantity": 25
    }
  ]
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cuid_enq_new",
    "enquiryNumber": "ENQ-1004",
    "status": "NEW",
    "requiredDate": "2026-10-15T00:00:00.000Z",
    "notes": "Urgent delivery requested for project phase 1",
    "customerId": "cuid_cust_1",
    "items": [
      {
        "id": "cuid_enq_item_1",
        "productId": "cuid_prod_1",
        "quantity": 25
      }
    ]
  }
}
```

### Update Enquiry Status
- **Method**: `PATCH`
- **Path**: `/api/enquiries/:id/status`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**:
```json
{
  "status": "QUOTED"
}
```
- **Allowed Statuses**: `NEW`, `QUOTED`, `WON`, `LOST`
- **Response**: `200 OK`

---

## 5. Products

### List All Products
- **Method**: `GET`
- **Path**: `/api/products`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK` (Array of products with inventory summary)

### Get Product by ID
- **Method**: `GET`
- **Path**: `/api/products/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`

### Create Product
- **Method**: `POST`
- **Path**: `/api/products`
- **Authentication**: Required
- **Required Role**: `ADMIN` (SALES receives `403 Forbidden`)
- **Request Body**:
```json
{
  "productCode": "HYD-VALVE-01",
  "productName": "Industrial Hydraulic Valve 25mm",
  "category": "Valves",
  "unit": "PCS",
  "basePrice": 4500,
  "initialPhysicalQuantity": 50
}
```
- **Response**: `201 Created`
- **Errors**: `403 Forbidden` (if called by SALES), `409 Conflict` (duplicate product code)

### Update Product
- **Method**: `PUT`
- **Path**: `/api/products/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN`

---

## 6. Inventory

### List All Inventory
Displays stock metrics for all catalog products including calculated available quantity.
- **Method**: `GET`
- **Path**: `/api/inventory`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid_inv_1",
      "productId": "cuid_prod_1",
      "physicalQuantity": 100,
      "reservedQuantity": 20,
      "damagedQuantity": 5,
      "availableQuantity": 75,
      "product": {
        "productCode": "IND-BEAR-01",
        "productName": "Heavy Duty Roller Bearing 6205",
        "unit": "PCS"
      }
    }
  ]
}
```
*Note*: `availableQuantity = physicalQuantity - reservedQuantity - damagedQuantity`.

### Get Inventory by Product ID
- **Method**: `GET`
- **Path**: `/api/inventory/:productId`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`

### Adjust Inventory Stock
Allows direct adjustment or additive adjustments to physical and damaged counts.
- **Method**: `PATCH`
- **Path**: `/api/inventory/:productId`
- **Authentication**: Required
- **Required Role**: `ADMIN` (SALES receives `403 Forbidden`)
- **Request Body**:
```json
{
  "addPhysicalQuantity": 20,
  "damagedQuantity": 2
}
```
- **Response**: `200 OK`
- **Errors**:
  - `400 Bad Request`: Missing parameters or negative quantities
  - `403 Forbidden`: SALES user attempting adjustment
  - `409 Conflict`: Adjustment would cause available quantity to become negative

---

## 7. Quotations

### List All Quotations
- **Method**: `GET`
- **Path**: `/api/quotations`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK` (Array of quotations including items, customer, enquiry, and sales order link)

### Get Quotation by ID
- **Method**: `GET`
- **Path**: `/api/quotations/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`

### Create Quotation
The backend authoritatively computes line-item discounts, GST tax, subtotal, and grand total.
- **Formula**:
  - `Item Subtotal = quantity * unitPrice`
  - `Item Discount = Item Subtotal * (discountPct / 100)`
  - `Taxable Amount = Item Subtotal - Item Discount`
  - `Item GST = Taxable Amount * (gstPct / 100)`
  - `Item Total = Taxable Amount + Item GST`
  - `Grand Total = sum(Item Total)`
- **Method**: `POST`
- **Path**: `/api/quotations`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**:
```json
{
  "enquiryId": "cuid_enq_1",
  "customerId": "cuid_cust_1",
  "validUntil": "2026-10-30T00:00:00.000Z",
  "items": [
    {
      "productId": "cuid_prod_1",
      "quantity": 10,
      "unitPrice": 1000,
      "discountPct": 10,
      "gstPct": 18
    }
  ]
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cuid_quo_new",
    "quotationNumber": "QUO-1004",
    "status": "DRAFT",
    "subtotal": 10000,
    "totalDiscount": 1000,
    "totalGst": 1620,
    "totalAmount": 10620,
    "items": [
      {
        "productId": "cuid_prod_1",
        "quantity": 10,
        "unitPrice": 1000,
        "discountPct": 10,
        "gstPct": 18,
        "lineTotal": 10620
      }
    ]
  }
}
```

### Update Quotation Status
- **Method**: `PATCH`
- **Path**: `/api/quotations/:id/status`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Request Body**:
```json
{
  "status": "ACCEPTED"
}
```
- **Allowed Statuses**: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`
- **Response**: `200 OK`

### Convert Quotation to Sales Order
Transforms an `ACCEPTED` commercial quotation into an executable `PENDING` Sales Order.
- **Method**: `POST`
- **Path**: `/api/quotations/:id/convert`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Quotation successfully converted to Sales Order",
  "data": {
    "id": "cuid_so_new",
    "orderNumber": "SO-1004",
    "status": "PENDING",
    "totalAmount": 10620,
    "quotationId": "cuid_quo_new",
    "customerId": "cuid_cust_1"
  }
}
```
- **Errors**:
  - `409 Conflict`: Quotation has status `DRAFT` or `REJECTED`
  - `409 Conflict`: A Sales Order has already been generated for this quotation

---

## 8. Sales Orders

### List All Sales Orders
- **Method**: `GET`
- **Path**: `/api/sales-orders`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`

### Get Sales Order by ID
- **Method**: `GET`
- **Path**: `/api/sales-orders/:id`
- **Authentication**: Required
- **Required Role**: `ADMIN` or `SALES`
- **Response**: `200 OK`

### Confirm Sales Order (Reserve Inventory)
Applies PostgreSQL row-level locks (`SELECT ... FOR UPDATE`), verifies stock availability, and reserves required inventory without altering physical counts.
- **Method**: `POST`
- **Path**: `/api/sales-orders/:id/confirm`
- **Authentication**: Required
- **Required Role**: `ADMIN` (SALES receives `403 Forbidden`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Sales Order confirmed and inventory reserved successfully.",
  "data": {
    "id": "cuid_so_1",
    "orderNumber": "SO-1004",
    "status": "CONFIRMED"
  }
}
```
- **Errors**:
  - `403 Forbidden`: Non-ADMIN user
  - `409 Conflict`: Order is not in `PENDING` status
  - `409 Conflict`: Insufficient available inventory (`item.quantity > available`)

### Cancel Sales Order (Release Reservation)
Cancels a `CONFIRMED` sales order and releases the reserved quantity back to available stock.
- **Method**: `POST`
- **Path**: `/api/sales-orders/:id/cancel`
- **Authentication**: Required
- **Required Role**: `ADMIN` (SALES receives `403 Forbidden`)
- **Request Body**:
```json
{
  "reason": "Customer cancellation requested"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Sales Order cancelled successfully.",
  "data": {
    "id": "cuid_so_1",
    "status": "CANCELLED"
  }
}
```
- **Errors**:
  - `403 Forbidden`: Non-ADMIN user
  - `409 Conflict`: Order is already `CANCELLED` or `DISPATCHED`

---

## 9. Dispatch

### Dispatch Confirmed Order
Dispatches a `CONFIRMED` sales order, creates transport dispatch logs, and decrements both physical and reserved inventory.
- **Method**: `POST`
- **Path**: `/api/sales-orders/:id/dispatch`
- **Authentication**: Required
- **Required Role**: `ADMIN` (SALES receives `403 Forbidden`)
- **Request Body**:
```json
{
  "vehicleNumber": "MH-12-AB-1234",
  "driverName": "Ramesh Kumar",
  "notes": "Fragile industrial consignment, handle with care"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Sales Order dispatched successfully and inventory deducted.",
  "data": {
    "salesOrder": {
      "id": "cuid_so_1",
      "status": "DISPATCHED"
    },
    "dispatch": {
      "id": "cuid_disp_1",
      "dispatchNumber": "DSP-1001",
      "vehicleNumber": "MH-12-AB-1234",
      "driverName": "Ramesh Kumar",
      "dispatchedAt": "2026-09-17T00:00:00.000Z"
    }
  }
}
```
- **Errors**:
  - `400 Bad Request`: Missing vehicle number or driver name
  - `403 Forbidden`: Non-ADMIN user
  - `409 Conflict`: Order is not `CONFIRMED` (cannot dispatch `PENDING`, `CANCELLED`, or already `DISPATCHED` orders)

---

## 10. Standard Error Responses

Every error returned by the API follows a standardized JSON schema:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of error",
    "details": []
  }
}
```

| HTTP Status | Code | Description |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Request payload failed Zod schema parsing |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired JWT token |
| `403` | `FORBIDDEN` | Authenticated user lacks permission (e.g., SALES calling ADMIN routes) |
| `404` | `NOT_FOUND` | Requested entity ID does not exist |
| `409` | `CONFLICT` | State machine violation, unique constraint failure, or insufficient inventory |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected backend exception (sensitive details omitted) |
