# OrderSarthi — System Architecture & Design

OrderSarthi is a high-performance **Local Shop Click & Collect Ordering System** tailored for individual grocery stores, supermarkets, and local retail shops.

---

## 1. System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vercel)                     │
│  - Vanilla JavaScript ES6+ (No bulky framework overhead)    │
│  - Tailwind CSS v4 CDN                                      │
│  - Instant mobile-first UX with local cart caching          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS REST (Action-Based)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google Apps Script Web App                  │
│  - Router & Controller Architecture                         │
│  - LockService (Mutex Concurrency Engine)                   │
│  - CacheService (Sub-second In-Memory Read Layer)           │
│  - Server-Side Price & Capacity Verification                │
│  - Strict Order State Machine Validation                    │
└──────────────┬──────────────────────────────┬───────────────┘
               │ SpreadsheetApp               │ DriveApp
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  Google Sheets Database      │ │ Google Drive Storage        │
│  - 11 Structured Tables      │ │ - High-res product images   │
│  - Monthly Archival Tables   │ │ - Direct CDN thumbnail URLs │
└──────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. High-Volume Performance Engine (500+ Daily Orders)

Handling 500+ daily orders on Google Sheets requires strict engineering controls to prevent execution timeouts, cell limit exhaustion, and race conditions:

### A. Multi-Tier CacheService
- **Products Catalog:** Active catalog cached in `CacheService` for 10 minutes. Writes to products immediately invalidate `products_active`.
- **Categories:** Cached for 30 minutes.
- **Dashboard Stats:** Aggregated KPI counters cached for 2 minutes to prevent repeated full-sheet scans by admin polling.
- **Session Tokens:** 6-hour TTL in cache for instant validation without reading `Admin_Users` or `Customers` sheets on every request.

### B. Concurrency Mutex with `LockService`
To avoid race conditions during concurrent checkouts:
- **Order Creation Lock:** `LockService.getScriptLock().waitLock(30000)`. Critical sections execute in < 1.5 seconds.
- **Pickup Slot Counter:** Slot capacity is checked and atomically incremented inside the lock. If `current_orders >= max_orders`, order creation fails with `PICKUP_SLOT_FULL`.

### C. Idempotency Key Deduplication
- The frontend generates a UUID `idempotencyKey` once per checkout session.
- On arrival at Apps Script, `CacheService` checks `idemp_{key}`. If an identical request was already completed, the cached order is returned immediately without creating duplicate rows or double-charging.

### D. Single Batch Reads & Writes
- Sheets are **never** updated in loops (`setValue()` in a loop is strictly prohibited).
- Multiple line items are assembled into a 2D array and written in a single `setValues()` call.

### E. Monthly Archival Routine (`ArchivalService`)
- A time-driven trigger runs on the 1st of every month at 02:00 AM.
- Orders and line items older than the current month are migrated to `Orders_YYYY_MM` archive tabs.
- Active sheets remain under 5,000–15,000 rows, ensuring high spreadsheet performance.

---

## 3. Order State Machine

```
   ┌─────────┐
   │   NEW   ├─────────────┬─────────────┐
   └───┬─────┘             │             │
       │                   ▼             ▼
       ▼             ┌───────────┐ ┌───────────┐
 ┌───────────┐       │ REJECTED  │ │ CANCELLED │
 │ ACCEPTED  ├──────►└───────────┘ └───────────┘
 └───┬───────┘
     │
     ▼
┌─────────────┐
│  PREPARING  │
└────┬────────┘
     │
     ▼
┌──────────────────┐
│ READY_FOR_PICKUP │
└────┬─────────────┘
     │
     ▼
┌─────────────┐
│  PICKED_UP  │
└─────────────┘
```

### Transition Validation Rules:
1. `NEW` → `ACCEPTED`, `REJECTED`, or `CANCELLED`
2. `ACCEPTED` → `PREPARING` or `CANCELLED`
3. `PREPARING` → `READY_FOR_PICKUP`
4. `READY_FOR_PICKUP` → `PICKED_UP` (Payment automatically set to `PAID`)
5. All other transitions (e.g. `NEW` → `PICKED_UP`) are rejected by `ValidationService`.

---

## 4. Security & Data Integrity

1. **Server-Side Price Authority:** Frontend cart prices and totals are strictly treated as client previews. The backend re-fetches `selling_price` directly from the sheet, multiplies by validated quantity, and computes the authoritative total.
2. **Customer Order Ownership:** Customers can only query or cancel their own orders. Requests for orders belonging to another `customer_id` are rejected with HTTP 403 `FORBIDDEN`.
3. **Admin Protection:** All admin endpoints enforce `SecurityService.requireAdminAuth(token)`.
4. **Password Security:** Salted SHA-256 password hashing prevents plain-text credential leaks.
