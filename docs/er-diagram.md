# Manufacturing ERP - Entity Relationship (ER) Diagram

## 1. Relational Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ ENQUIRIES : "created_by"
    USERS ||--o{ QUOTATIONS : "created_by"
    USERS ||--o{ SALES_ORDERS : "confirmed_by"
    USERS ||--o{ DISPATCHES : "dispatched_by"

    CUSTOMERS ||--o{ ENQUIRIES : "places"
    CUSTOMERS ||--o{ QUOTATIONS : "receives"
    CUSTOMERS ||--o{ SALES_ORDERS : "orders"

    PRODUCTS ||--|| INVENTORIES : "maintains (1:1)"
    PRODUCTS ||--o{ ENQUIRY_ITEMS : "enquired in"
    PRODUCTS ||--o{ QUOTATION_ITEMS : "quoted in"
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : "ordered in"
    PRODUCTS ||--o{ DISPATCH_ITEMS : "dispatched in"

    ENQUIRIES ||--|{ ENQUIRY_ITEMS : "contains"
    ENQUIRIES ||--o{ QUOTATIONS : "generates"

    QUOTATIONS ||--|{ QUOTATION_ITEMS : "contains"
    QUOTATIONS ||--o| SALES_ORDERS : "converts to (1:1 UNIQUE)"

    SALES_ORDERS ||--|{ SALES_ORDER_ITEMS : "contains"
    SALES_ORDERS ||--o| DISPATCHES : "dispatched via (1:1 UNIQUE)"

    DISPATCHES ||--|{ DISPATCH_ITEMS : "contains"

    USERS {
        uuid id PK
        string email UK "NOT NULL"
        string password "Hashed bcrypt"
        string name "NOT NULL"
        enum role "ADMIN | SALES"
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMERS {
        uuid id PK
        string company_name "NOT NULL"
        string contact_person "NOT NULL"
        string mobile "NOT NULL"
        string email "NOT NULL"
        string city "NOT NULL"
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        uuid id PK
        string product_code UK "NOT NULL"
        string product_name "NOT NULL"
        string category "NOT NULL"
        string unit "PCS, SET, MTR"
        decimal base_price "12, 2"
        timestamp created_at
        timestamp updated_at
    }

    INVENTORIES {
        uuid id PK
        uuid product_id FK,UK "1:1 with Product"
        int physical_quantity ">= 0"
        int reserved_quantity ">= 0"
        int damaged_quantity ">= 0 (Extensibility ready)"
        timestamp created_at
        timestamp updated_at
    }

    ENQUIRIES {
        uuid id PK
        string enquiry_number UK "NOT NULL"
        uuid customer_id FK "NOT NULL"
        timestamp enquiry_date "DEFAULT now"
        timestamp required_date "NOT NULL"
        string notes "NULLABLE"
        enum status "NEW | QUOTED | WON | LOST"
        uuid created_by_id FK "NOT NULL"
        timestamp created_at
        timestamp updated_at
    }

    ENQUIRY_ITEMS {
        uuid id PK
        uuid enquiry_id FK "NOT NULL, ON DELETE CASCADE"
        uuid product_id FK "NOT NULL, ON DELETE RESTRICT"
        int quantity "> 0"
        timestamp created_at
        timestamp updated_at
    }

    QUOTATIONS {
        uuid id PK
        string quotation_number UK "NOT NULL"
        uuid enquiry_id FK "NOT NULL"
        uuid customer_id FK "NOT NULL"
        timestamp valid_until "NOT NULL"
        decimal subtotal "12, 2"
        decimal discount_amount "12, 2"
        decimal gst_amount "12, 2"
        decimal grand_total "12, 2"
        enum status "DRAFT | SENT | ACCEPTED | REJECTED"
        uuid created_by_id FK "NOT NULL"
        timestamp created_at
        timestamp updated_at
    }

    QUOTATION_ITEMS {
        uuid id PK
        uuid quotation_id FK "NOT NULL, ON DELETE CASCADE"
        uuid product_id FK "NOT NULL, ON DELETE RESTRICT"
        int quantity "> 0"
        decimal unit_price "12, 2"
        decimal discount_pct "5, 2 (0 - 100)"
        decimal gst_pct "5, 2 (0 - 100)"
        decimal line_amount "12, 2"
        timestamp created_at
        timestamp updated_at
    }

    SALES_ORDERS {
        uuid id PK
        string order_number UK "NOT NULL"
        uuid customer_id FK "NOT NULL"
        uuid quotation_id FK,UK "1:1 UNIQUE ENFORCEMENT"
        timestamp order_date "DEFAULT now"
        decimal total_amount "12, 2"
        enum status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        uuid confirmed_by_id FK "NULLABLE"
        uuid cancelled_by_id FK "NULLABLE"
        timestamp created_at
        timestamp updated_at
    }

    SALES_ORDER_ITEMS {
        uuid id PK
        uuid sales_order_id FK "NOT NULL, ON DELETE CASCADE"
        uuid product_id FK "NOT NULL, ON DELETE RESTRICT"
        int quantity "> 0"
        decimal unit_price "12, 2"
        decimal line_amount "12, 2"
        timestamp created_at
        timestamp updated_at
    }

    DISPATCHES {
        uuid id PK
        string dispatch_number UK "NOT NULL"
        uuid sales_order_id FK,UK "1:1 UNIQUE ENFORCEMENT"
        timestamp dispatch_date "DEFAULT now"
        string vehicle_number "NOT NULL"
        string driver_name "NOT NULL"
        string notes "NULLABLE"
        uuid dispatched_by_id FK "NOT NULL"
        timestamp created_at
        timestamp updated_at
    }

    DISPATCH_ITEMS {
        uuid id PK
        uuid dispatch_id FK "NOT NULL, ON DELETE CASCADE"
        uuid product_id FK "NOT NULL, ON DELETE RESTRICT"
        int quantity "> 0"
        timestamp created_at
        timestamp updated_at
    }
```

---

## 2. Table-by-Table Data Dictionary

### Table: `users`
- Stores system operators with role-based access levels.
- `role`: Enum with values `'ADMIN'`, `'SALES'`.
- Passwords stored strictly as `bcrypt` hashes with cost factor 10+.

### Table: `customers`
- Master data for business clients.
- `company_name`, `contact_person`, `mobile`, `email`, `city`.

### Table: `products`
- Master catalog of industrial equipment items.
- `product_code`: Natural unique key (e.g., `"IND-BRG-001"`).
- `base_price`: Decimal representation to eliminate floating point issues.

### Table: `inventories`
- Maintains real-time physical, reserved, and damaged stock levels.
- Strictly 1:1 with `products` via `product_id` unique foreign key.
- $\text{Available} = \text{physical\_quantity} - \text{reserved\_quantity} - \text{damaged\_quantity}$.

### Table: `enquiries` & `enquiry_items`
- Represents formal incoming customer purchase enquiries.
- Relational line items link directly to `products` (no embedded JSON arrays).

### Table: `quotations` & `quotation_items`
- Relational commercial proposal generated against an enquiry.
- Independent authoritative financial calculations for subtotal, discount, GST, and grand total.

### Table: `sales_orders` & `sales_order_items`
- Converts accepted commercial offers into active sales contracts.
- **Race Condition Protection**: `quotation_id` carries a database-level unique constraint (`UNIQUE INDEX`), ensuring one quotation can NEVER yield two sales orders.

### Table: `dispatches` & `dispatch_items`
- Physical fulfillment record.
- **Race Condition Protection**: `sales_order_id` is unique, guaranteeing an order cannot be dispatched twice.
- Dispatch decreases both `physical_quantity` and `reserved_quantity` atomically.
