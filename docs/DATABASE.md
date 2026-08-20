# OrderSarthi — Google Sheets Database Schema

One single Google Spreadsheet acts as the relational database engine.

---

## 1. Active Tables Overview

| Sheet Tab | Primary Key | Description | Lifecycle |
|---|---|---|---|
| **`Shop`** | `shop_id` | Single-row store profile and operating hours | Permanent |
| **`Categories`** | `category_id` | Product aisle/category definitions | Permanent |
| **`Products`** | `product_id` | Inventory catalog, prices, and stock | Permanent |
| **`Customers`** | `customer_id` | Registered customer accounts | Permanent |
| **`Orders`** | `order_id` | Master orders table (current month) | Archived Monthly |
| **`Order_Items`** | `order_item_id` | Line item snapshots (current month) | Archived Monthly |
| **`Pickup_Slots`** | `slot_id` | 30-min pickup time slot capacities | Archived Monthly |
| **`Payments`** | `payment_id` | Payment receipts (current month) | Archived Monthly |
| **`Admin_Users`** | `admin_id` | Store manager logins & roles | Permanent |
| **`Settings`** | `key` | Business rules & key-value configuration | Permanent |
| **`Activity_Log`** | `log_id` | Audit trail of logins, orders, and edits | Archived Monthly |

---

## 2. Table Column Specifications

### `Shop`
- `shop_id`: Unique Store ID (e.g. `SHOP-001`)
- `shop_name`: Public brand name
- `logo_url`: Brand logo image URL
- `description`: Tagline and store bio
- `mobile`: Shop contact phone
- `email`: Store support email
- `address`: Full physical pickup address
- `opening_time`: Daily opening time `HH:mm` (e.g. `09:00`)
- `closing_time`: Daily closing time `HH:mm` (e.g. `21:00`)
- `currency`: Currency code (`INR`)
- `timezone`: Timezone (`Asia/Kolkata`)
- `is_active`: Boolean (`TRUE` / `FALSE`)
- `created_at`, `updated_at`: Timestamps

### `Categories`
- `category_id`: Primary Key (e.g. `CAT-001`)
- `category_name`: Title (e.g. `Daily Groceries`)
- `description`: Subtext
- `image_url`: Category visual banner
- `sort_order`: Integer display priority
- `is_active`: Active flag
- `created_at`, `updated_at`: Timestamps

### `Products`
- `product_id`: Primary Key (e.g. `PROD-001`)
- `product_name`: Full product title
- `category_id`: Foreign key to `Categories.category_id`
- `description`: Detailed specifications
- `sku`: Stock Keeping Unit
- `barcode`: EAN barcode string
- `mrp`: Maximum Retail Price in INR
- `selling_price`: Authoritative selling price in INR
- `unit`: Quantity unit (e.g. `5 kg`, `1 L`, `500 g`, `1 pack`)
- `stock_quantity`: Available stock count
- `stock_status`: `IN_STOCK` | `OUT_OF_STOCK`
- `image_file_id`: Google Drive File ID
- `image_url`: Public image CDN URL
- `is_active`: Soft-delete flag
- `sort_order`: Display sequence
- `created_at`, `updated_at`: Timestamps

### `Orders`
- `order_id`: Sequential Primary Key (`ORD-YYMMDD-XXXX`)
- `customer_id`: Foreign key to `Customers` or `GUEST`
- `customer_name`: Name for pickup calling
- `customer_mobile`: 10-digit mobile
- `order_date`: Date placed `YYYY-MM-DD`
- `pickup_date`: Scheduled collection date `YYYY-MM-DD`
- `pickup_slot_id`: Foreign key to `Pickup_Slots`
- `pickup_start`: e.g. `09:00`
- `pickup_end`: e.g. `09:30`
- `subtotal`: Total items amount
- `discount`: Discount amount (0)
- `tax`: Tax amount (0)
- `total_amount`: Final payable amount
- `payment_method`: `PAY_AT_PICKUP` | `UPI` | `RAZORPAY`
- `payment_status`: `PENDING` | `PAID` | `REFUNDED`
- `order_status`: State Machine: `NEW` | `ACCEPTED` | `PREPARING` | `READY_FOR_PICKUP` | `PICKED_UP` | `CANCELLED` | `REJECTED`
- `customer_note`: Optional instructions
- `admin_note`: Internal store note
- `created_at`, `accepted_at`, `preparing_at`, `ready_at`, `picked_up_at`, `cancelled_at`, `rejected_at`, `updated_at`: Workflow timestamps

### `Order_Items`
- `order_item_id`: Primary Key (e.g. `OI-XXXXXX`)
- `order_id`: Foreign key to `Orders.order_id`
- `product_id`: Reference product ID
- `product_name_snapshot`: Preserved product name at order time
- `unit_snapshot`: Preserved unit at order time
- `price_snapshot`: Preserved price at order time (immune to future catalog edits)
- `quantity`: Ordered count (integer >= 1)
- `item_total`: `price_snapshot * quantity`
- `created_at`: Timestamp

### `Pickup_Slots`
- `slot_id`: Primary Key (`SLOT-YYYYMMDD-HHmm`)
- `slot_date`: Date string `YYYY-MM-DD`
- `start_time`: `HH:mm`
- `end_time`: `HH:mm`
- `max_orders`: Maximum order capacity (default 10)
- `current_orders`: Booked order count
- `is_active`: Boolean
- `created_at`, `updated_at`: Timestamps

### `Payments`
- `payment_id`: Primary Key (e.g. `PAY-XXXXXX`)
- `order_id`: Foreign key to `Orders`
- `customer_id`: Customer reference
- `amount`: Transaction amount
- `payment_method`: `PAY_AT_PICKUP`
- `transaction_id`: External reference if UPI/Gateway
- `payment_status`: `PENDING` | `PAID`
- `gateway`: `MANUAL`
- `paid_at`, `created_at`: Timestamps

### `Admin_Users`
- `admin_id`: Primary Key (`ADMIN-001`)
- `name`: Admin full name
- `mobile`: 10-digit mobile
- `email`: Admin email
- `password_hash`: Salted SHA-256 hash
- `salt`: Cryptographic salt string
- `role`: `SUPER_ADMIN`
- `is_active`: Boolean
- `created_at`, `last_login`: Timestamps
