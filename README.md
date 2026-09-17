# Manufacturing ERP - Industrial Fulfillment System

A production-quality full-stack ERP application built for a manufacturing and supply company. The system models and enforces an end-to-end industrial fulfillment state machine:

```
Customer Enquiry ──► Quotation ──► Accepted Quotation ──► Sales Order ──► Inventory Reservation ──► Dispatch
```

---

## Default System Accounts

Authentication and Role-Based Access Control (RBAC) are verified directly via backend JWT claims. To test the role separation in the ERP UI, sign in using the following accounts:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `Admin@123` | Full administrative oversight, Order confirmation, Inventory reservation, Dispatch execution, Physical & damaged stock adjustment, Inventory management |
| **SALES** | `sales@example.com` | `Sales@123` | Customer enquiry creation, Commercial quotation generation, Price calculations, Quotation status updates, Converting accepted quotations to sales orders, Read-only inventory availability |

---

## 1. Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database & ORM**: PostgreSQL 16, Prisma ORM
- **Security & Authentication**: JWT (JSON Web Tokens), bcrypt password hashing, Backend Role-Based Access Control (RBAC)
- **Validation**: Zod (type-safe runtime request parsing)
- **Testing**: Jest, Supertest
- **Containerization**: Docker Compose

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string with public schema | `postgresql://erp_user:erp_password@localhost:5432/erp_case_study?schema=public` |
| `JWT_SECRET` | Secret key used for signing and verifying JWT tokens | `super_secret_jwt_key_for_erp_manufacturing_case_study_2026` |
| `JWT_EXPIRES_IN` | Expiration window for signed JWTs | `24h` |
| `PORT` | Backend HTTP listening port | `5000` |
| `FRONTEND_URL` | Trusted origin allowed by CORS middleware | `http://localhost:3000` |
| `NODE_ENV` | Environment identifier (`development`, `production`, `test`) | `development` |

---

## 3. Quick Start Commands

### Step 1: Start PostgreSQL with Docker Compose
```bash
docker compose up -d
```

### Step 2: Install Dependencies & Generate Prisma Client
```bash
npm install
npm run prisma:generate
```

### Step 3: Run Automated Test Suite
```bash
npm test
```

### Step 4: Build Backend TypeScript
```bash
npm run build:backend
```

### Step 5: Start Backend Service
```bash
# In development mode with watch
npm run dev

# Or in production mode
npm run build:backend && npm start
```

---

## 4. Authentication Endpoints & RBAC

All authentication routes are mounted under `/api/auth`:

### Public Endpoints

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user with bcrypt password hashing | `{ name, email, password, role? }` |
| `POST` | `/api/auth/login` | Authenticate credentials and receive signed JWT | `{ email, password }` |

> **Privilege Escalation Guard**: Unauthenticated registration requests cannot self-elevate to the `ADMIN` role. If an unauthenticated user specifies `"role": "ADMIN"`, the backend automatically falls back to the `SALES` role. Only an existing authenticated `ADMIN` can create other `ADMIN` accounts.

### Protected Endpoints (Requires `Authorization: Bearer <token>`)

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/me` | Authenticated | Returns verified profile for current user from JWT claims |
| `GET` | `/api/auth/test/admin-only` | `ADMIN` | Development RBAC test endpoint verifying administrator access |
| `GET` | `/api/auth/test/sales-only` | `SALES` | Development RBAC test endpoint verifying sales representative access |
| `GET` | `/api/auth/test/staff` | `ADMIN` or `SALES` | Access for all internal staff |

---

## 5. Available Roles & Permissions

- **`ADMIN`**:
  - Full system oversight
  - Product catalog management (create/update products)
  - Inventory updates (physical stock and damaged stock adjustments)
  - Sales order confirmation and transactional inventory reservation
  - Sales order cancellation and reservation release
  - Dispatch processing and stock deduction
  - Read access to all records
- **`SALES`**:
  - Customer registration and maintenance
  - Customer enquiry creation and line item entry
  - Quotation generation with authoritative financial calculations
  - Updating quotation statuses (`DRAFT -> SENT -> ACCEPTED / REJECTED`)
  - Converting accepted quotations into pending sales orders
  - Viewing stock availability

---

## 6. Business Logic Endpoints

### Customers (`/api/customers`)
- `GET /api/customers` - List all customers (ADMIN, SALES)
- `GET /api/customers/:id` - Customer details by ID (ADMIN, SALES)
- `POST /api/customers` - Create a new customer (ADMIN, SALES)
- `PATCH /api/customers/:id` - Update customer info (ADMIN, SALES)

### Products (`/api/products`)
- `GET /api/products` - List products with live inventory availability (ADMIN, SALES)
- `GET /api/products/:id` - Product details with inventory (ADMIN, SALES)
- `POST /api/products` - Create product + 1:1 inventory record (ADMIN only)
- `PATCH /api/products/:id` - Update product details (ADMIN only)

### Inventory (`/api/inventory`)
- `GET /api/inventory` - View inventory availability across all products (ADMIN, SALES)
- `GET /api/inventory/:productId` - View inventory details for a product (ADMIN, SALES)
- `PATCH /api/inventory/:productId` - Adjust physical or damaged quantities (ADMIN only)

### Enquiries (`/api/enquiries`)
- `GET /api/enquiries` - List enquiries with customer and items (ADMIN, SALES)
- `GET /api/enquiries/:id` - Enquiry details (ADMIN, SALES)
- `POST /api/enquiries` - Create enquiry with relational line items (ADMIN, SALES)
- `PATCH /api/enquiries/:id/status` - Update status: `NEW`, `QUOTED`, `WON`, `LOST` (ADMIN, SALES)

### Quotations (`/api/quotations`)
- `GET /api/quotations` - List quotations with line items and totals (ADMIN, SALES)
- `GET /api/quotations/:id` - Quotation details (ADMIN, SALES)
- `POST /api/quotations` - Generate quotation with authoritative backend line calculations (ADMIN, SALES)
- `PATCH /api/quotations/:id/status` - Strict status progression: `DRAFT -> SENT -> ACCEPTED / REJECTED` (ADMIN, SALES)
- `POST /api/quotations/:id/convert` - Convert `ACCEPTED` quotation into a `PENDING` Sales Order (ADMIN, SALES)

### Sales Orders & Fulfillment (`/api/sales-orders`)
- `GET /api/sales-orders` - List all sales orders (ADMIN, SALES)
- `GET /api/sales-orders/:id` - Sales order details (ADMIN, SALES)
- `POST /api/sales-orders/:id/confirm` - **ADMIN only**: Atomically verify stock availability and reserve inventory using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`)
- `POST /api/sales-orders/:id/cancel` - **ADMIN only**: Cancel order and atomically release reserved inventory back to available
- `POST /api/sales-orders/:id/dispatch` - **ADMIN only**: Dispatch confirmed order, record vehicle/driver details, and deduct both physical and reserved stock

---

## 7. Architecture & Concurrency Overview

- **Authoritative Calculations**: Unit price, discount percentages, and GST are calculated on the backend to 2 decimal places to prevent rounding drift or client tampering.
- **Transactional Integrity**: Prisma interactive transactions (`prisma.$transaction`) ensure atomicity across line items, orders, and stock updates.
- **Concurrency & Deadlock Prevention**: Row-level locking (`SELECT ... FOR UPDATE`) with deterministic sorting of product IDs eliminates race conditions and deadlocks during concurrent stock reservations.
- **Architectural Specification**: Detailed documentation on multi-tier architecture, transactional row-level locking, and state machines can be found in `docs/architecture.md`.
- **Entity Relationship Diagram**: Detailed data dictionary and Mermaid ER diagram can be found in `docs/er-diagram.md`.
