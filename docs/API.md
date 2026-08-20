# OrderSarthi — REST API Documentation

All API requests are sent to the Google Apps Script Web App URL via action-based routing.

```
Base URL: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

---

## 1. Response Envelope Format

### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Error Response (HTTP 200 with error payload)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION | PRODUCT_OUT_OF_STOCK | UNAUTHORIZED",
    "message": "Human-readable explanation of error."
  }
}
```

---

## 2. Public Storefront Endpoints

### `GET ?action=getShop`
Returns public shop details and opening hours.
```json
{
  "shop_id": "SHOP-001",
  "shop_name": "OrderSarthi",
  "opening_time": "09:00",
  "closing_time": "21:00",
  "currency": "INR",
  "mobile": "9876543210"
}
```

### `GET ?action=getCategories`
Returns active product categories.
```json
[
  {
    "category_id": "CAT-001",
    "category_name": "Daily Groceries",
    "description": "Flour, pulses, rice",
    "image_url": "https://..."
  }
]
```

### `GET ?action=getProducts&category=CAT-001&search=atta&page=1&limit=30`
Returns slim, paginated product catalog for fast mobile browsing.
```json
{
  "products": [
    {
      "product_id": "PROD-001",
      "product_name": "Aashirvaad Atta 5kg",
      "selling_price": 245,
      "mrp": 275,
      "unit": "5 kg",
      "stock_status": "IN_STOCK",
      "image_url": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total_items": 45,
    "has_more": true
  }
}
```

### `GET ?action=getProductDetail&productId=PROD-001`
Returns full product detail.

### `GET ?action=getPickupSlots&date=2026-08-19`
Returns time slots and live booking capacity.
```json
[
  {
    "slot_id": "SLOT-20260819-0900",
    "start_time": "09:00",
    "end_time": "09:30",
    "max_orders": 10,
    "current_orders": 3,
    "available_slots": 7,
    "is_full": false
  }
]
```

---

## 3. Customer Endpoints

### `POST /customerRegister`
```json
{
  "action": "customerRegister",
  "data": {
    "name": "Rahul Sharma",
    "mobile": "9876543210",
    "email": "rahul@example.com",
    "password": "password123"
  }
}
```

### `POST /customerLogin`
```json
{
  "action": "customerLogin",
  "data": {
    "mobile": "9876543210",
    "password": "password123"
  }
}
```

### `POST /createOrder`
Creates an order with LockService concurrency protection and idempotency deduplication.
```json
{
  "action": "createOrder",
  "token": "SESSION_TOKEN",
  "data": {
    "customerName": "Rahul Sharma",
    "customerMobile": "9876543210",
    "pickupSlotId": "SLOT-20260819-0900",
    "items": [
      { "product_id": "PROD-001", "quantity": 1 }
    ],
    "paymentMethod": "PAY_AT_PICKUP",
    "idempotencyKey": "uuid-v4-string"
  }
}
```

### `GET ?action=trackOrder&orderId=ORD-260819-0001`
Returns live order timeline, timestamps, and line item breakdown.

### `POST /cancelOrder`
Cancels an order if in `NEW` or `ACCEPTED` state.
```json
{
  "action": "cancelOrder",
  "token": "SESSION_TOKEN",
  "data": { "orderId": "ORD-260819-0001" }
}
```

---

## 4. Admin Endpoints

All admin endpoints require valid `token` generated via `adminLogin`.

- `POST /adminLogin` — Admin authentication
- `GET ?action=adminDashboard` — Real-time stats & KPIs
- `GET ?action=adminOrders&status=NEW&date=2026-08-19` — Filterable orders list
- `POST /adminUpdateOrderStatus` — Transition order state (`ACCEPTED`, `PREPARING`, `READY_FOR_PICKUP`, `PICKED_UP`, `REJECTED`)
- `GET ?action=adminProducts` — Full inventory table
- `POST /adminCreateProduct` — Create product with image upload
- `POST /adminUpdateProduct` — Update details, price, MRP
- `POST /adminUpdateStock` — Instant stock level toggle
- `GET ?action=adminCategories` — Category list
- `POST /adminCreateCategory` — Add category
- `GET ?action=adminCustomers` — Customer list & order counts
- `GET ?action=adminReports&startDate=2026-08-01&endDate=2026-08-19` — Sales & product ranking
- `POST /adminUpdateShop` — Store hours & contact update
- `POST /initializeDatabase` — Schema & sample product seeding
