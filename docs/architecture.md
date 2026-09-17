# Manufacturing ERP - Architecture & System Design Documentation

## 1. Project Overview & Business Domain

This application is an enterprise-grade ERP backend and frontend system specifically tailored for a **manufacturing and supply company**. Unlike generic CRUD apps, this system enforces a strict, multi-stage state machine that mirrors real-world industrial procurement and fulfillment operations:

```
Customer Enquiry
      ↓
  Quotation
      ↓
Accepted Quotation
      ↓
 Sales Order
      ↓
Inventory Reservation (ADMIN Confirmed)
      ↓
   Dispatch
```

### Core Tenets of the Design
1. **Relational Integrity Over Schema-less Flexibility**: Workflow steps, line items, and product associations are strictly modeled as relational tables with foreign keys and check constraints. No arrays of JSON objects for transactional data.
2. **Backend Authoritative Calculation & State**: The client is never trusted to calculate invoice totals, line item GST/discounts, or verify stock levels.
3. **Pessimistic Concurrency & ACID Guarantees**: Inventory reservations and order conversions run inside isolated PostgreSQL transactions with row-level locks (`FOR UPDATE`) to mathematically eliminate race conditions.
4. **Strict Multi-Role Access Control (RBAC)**: Fine-grained permissions enforced at the router/middleware level; sales staff cannot confirm orders or dispatch goods.

---

## 2. Multi-Tier Architecture

The system employs a clean, layered architecture separating HTTP handling, business policies, and persistence:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (React)                     │
│  - SPA with React Router, Tailwind CSS, & Role-based views  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (JWT Header)
┌──────────────────────────────▼──────────────────────────────┐
│                    API Gateway / Express                    │
│  - Helmet (Security headers) & CORS                         │
│  - Centralized Logging & Rate Limiting                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Middleware Pipeline                       │
│  1. authenticateJwt: Decodes token, loads verified user     │
│  2. requireRole: Enforces RBAC (ADMIN vs SALES)             │
│  3. validateRequest: Zod schema validation                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Controller Layer                        │
│  - Parses HTTP requests, extracts parameters                │
│  - Invokes domain services                                  │
│  - Returns standardized envelope responses                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Service Layer                          │
│  - Authoritative financial calculations (GST, discounts)   │
│  - State machine transition rules                           │
│  - Prisma Interactive Transactions ($transaction)           │
│  - Row-level lock orchestration                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              Database & ORM Layer (PostgreSQL)              │
│  - Prisma Client with typed relational models               │
│  - Unique constraints (e.g., 1-to-1 Quotation -> SalesOrder)│
│  - ACID Transactions with Row-Level Locking                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Modeling & Relationships

The database model is completely normalized into relational tables:

| Entity | Primary Key | Key Relationships & Foreign Keys | Unique Constraints |
| :--- | :--- | :--- | :--- |
| `User` | `id` (UUID) | 1-to-M with `Enquiry`, `Quotation`, `SalesOrder` | `email` |
| `Customer` | `id` (UUID) | 1-to-M with `Enquiry`, `Quotation`, `SalesOrder` | — |
| `Product` | `id` (UUID) | 1-to-1 with `Inventory`; 1-to-M with Items | `product_code` |
| `Inventory` | `id` (UUID) | Belongs to `Product` (`product_id`) | `product_id` |
| `Enquiry` | `id` (UUID) | Customer (`customer_id`), User (`created_by_id`) | `enquiry_number` |
| `EnquiryItem` | `id` (UUID) | Enquiry (`enquiry_id`), Product (`product_id`) | — |
| `Quotation` | `id` (UUID) | Enquiry (`enquiry_id`), Customer (`customer_id`) | `quotation_number` |
| `QuotationItem`| `id` (UUID) | Quotation (`quotation_id`), Product (`product_id`)| — |
| `SalesOrder` | `id` (UUID) | Quotation (`quotation_id`), Customer (`customer_id`)| `order_number`, **`quotation_id` (1:1)** |
| `SalesOrderItem`| `id` (UUID)| SalesOrder (`sales_order_id`), Product (`product_id`)| — |
| `Dispatch` | `id` (UUID) | SalesOrder (`sales_order_id`), User (`dispatched_by`)| `dispatch_number`, **`sales_order_id` (1:1)** |
| `DispatchItem` | `id` (UUID) | Dispatch (`dispatch_id`), Product (`product_id`) | — |

### Relational Hierarchy
```
Customer
  ├── Enquiries
  │     └── Enquiry Items ──► Product
  │
  └── Quotations (linked to Enquiry)
        ├── Quotation Items ──► Product
        │
        └── Sales Order (strictly 1:1 with Accepted Quotation)
              ├── Sales Order Items ──► Product
              │
              └── Dispatch (strictly 1:1 with Confirmed Order)
                    └── Dispatch Items ──► Product
```

---

## 4. Concurrency & Inventory Reservation Mechanism

### The Problem: Concurrent Overselling
Consider physical stock of 100 units and 0 reserved units (Available = 100).
Two sales orders require stock:
- Order A: 80 units
- Order B: 50 units

If two ADMIN confirmation requests arrive concurrently:
1. Thread A reads: `Available = 100` (80 <= 100, OK)
2. Thread B reads: `Available = 100` (50 <= 100, OK)
3. Thread A reserves 80 (Reserved becomes 80)
4. Thread B reserves 50 (Reserved becomes 130)
5. **Result: Oversold by 30 units (130 > 100)**. Physical stock has been violated!

### The Solution: Transactional Row-Level Locking
To solve this, our inventory confirmation service implements pessimistic row-level locking via PostgreSQL:

```sql
-- Step 1: Open an isolated transaction
BEGIN TRANSACTION;

-- Step 2: Lock the inventory row(s) for the required products in deterministic order
SELECT * FROM inventories 
WHERE product_id IN (...) 
ORDER BY product_id ASC 
FOR UPDATE;

-- Step 3: Compute available quantity
-- available = physical_quantity - reserved_quantity - damaged_quantity;

-- Step 4: Validate sufficiency for each requested item
-- IF required_quantity > available THEN
--    ROLLBACK;
--    RAISE EXCEPTION 'INSUFFICIENT_STOCK';

-- Step 5: Update the reserved quantity
UPDATE inventories 
SET reserved_quantity = reserved_quantity + requested_quantity,
    updated_at = NOW()
WHERE product_id = ...;

-- Step 6: Update Sales Order status to CONFIRMED
UPDATE sales_orders
SET status = 'CONFIRMED',
    confirmed_by_id = ...
WHERE id = ...;

-- Step 7: Commit transaction atomically
COMMIT;
```

**Why sorting by `product_id` matters**:
When an order contains multiple products, acquiring locks in ascending `product_id` order eliminates **deadlocks** between concurrent transactions attempting to acquire the same locks in reverse order.

---

## 5. Duplicate Prevention Strategy

### 1. Duplicate Sales Orders from a Single Quotation
- **Database Defense**: `sales_orders.quotation_id` is decorated with a `@unique` constraint in Prisma and an underlying unique index in PostgreSQL.
- **Race Condition Immunity**: Even if two concurrent `POST /quotations/:id/convert` requests pass the application-layer check, only the first `INSERT` will succeed; the second transaction triggers a `23505 Unique Violation` error and rolls back completely.
- **Status Guard**: Quotation must be in `ACCEPTED` status, and upon conversion, Quotation status transitions to `WON` or is marked as converted.

### 2. Duplicate Dispatches
- **Database Defense**: `dispatches.sales_order_id` has a `@unique` constraint.
- **Status Guard**: The Sales Order status check ensures dispatch can only occur on `CONFIRMED` orders and atomically transitions the status to `DISPATCHED`.

---

## 6. Authoritative Financial Calculations

The backend never trusts line amounts or grand totals sent from the browser:
```typescript
// For each Quotation Item:
const baseAmount = quantity * unitPrice;
const discountAmount = baseAmount * (discountPct / 100);
const taxableAmount = baseAmount - discountAmount;
const gstAmount = taxableAmount * (gstPct / 100);
const lineAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;

// Quotation Grand Total:
const grandTotal = items.reduce((sum, item) => sum + item.lineAmount, 0);
```
All rounding is normalized to two decimal places to avoid floating point drift.

---

## 7. Live Verification Readiness (Architecture Extensibility)

The system is specifically architected to support dynamic technical evaluation changes:

### Requirement Change 1: Damaged Inventory Tracking
- The `Inventory` model includes `damagedQuantity Int @default(0)`.
- The availability formula is encapsulated in `InventoryService.getAvailableQuantity(inv)`:
  $$\text{Available} = \text{Physical} - \text{Reserved} - \text{Damaged}$$
- If damaged goods are reported, damaged inventory is incremented and available stock immediately drops without affecting the reserved stock for existing confirmed orders.

### Requirement Change 2: Confirmed Order Cancellation & Stock Release
- The `SalesOrderService.cancelOrder(orderId)` method operates inside a transaction:
  1. Row-lock corresponding `Inventory` rows (`FOR UPDATE`).
  2. Decrement `reservedQuantity` by the order items' quantities.
  3. Set order status to `CANCELLED` and record `cancelledById`.
  4. Physical inventory remains intact, and stock is immediately returned to the available pool.
