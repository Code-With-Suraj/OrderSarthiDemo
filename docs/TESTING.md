# OrderSarthi — Comprehensive Testing & QA Checklist

Execute these test scenarios to verify security, state machine transitions, concurrency, and performance under 500+ daily orders.

---

## 1. Product Catalog & Inventory Tests

- [ ] **Browse Catalog:** Open `/shop.html`. Verify active products are displayed with images, units, prices, and MRP discounts.
- [ ] **Debounced Search:** Type "atta" in the search box. Verify results filter in real-time with 300ms debounce without screen flicker.
- [ ] **Category Filtering:** Click "Dairy & Fresh". Verify only dairy items appear. Click "All Items" to reset.
- [ ] **Out of Stock Behavior:** Mark a product `OUT_OF_STOCK` in admin. Verify the product card shows "Out of Stock" badge and the Add button is disabled.
- [ ] **Admin Product CRUD:** Add a new product in `/admin/products.html`. Verify it immediately shows in customer catalog after cache refresh.

---

## 2. Shopping Cart Tests

- [ ] **Add to Cart:** Click "+ Add" on product card. Verify header cart badge increments and mobile sticky cart bar displays updated subtotal.
- [ ] **Quantity Modification:** Open `/cart.html`. Increase item quantity to 3. Verify subtotal recalculates instantly.
- [ ] **Item Removal:** Click the delete icon. Verify item is removed and badge updates.
- [ ] **Empty Cart Guard:** Clear all items. Verify checkout button is disabled and friendly empty state is rendered.

---

## 3. Order Placement & Idempotency Tests

- [ ] **Slot Selection:** Open `/checkout.html`. Choose "Today" and select a 30-minute pickup slot. Verify slot highlights.
- [ ] **Full Slot Guard:** When `current_orders >= max_orders`, verify slot shows "Slot Full" and cannot be selected.
- [ ] **Order Creation:** Fill name, 10-digit mobile, and click "Confirm Order & Pickup Slot". Verify button enters loading state and redirects to `/order-success.html`.
- [ ] **Duplicate Submission Prevention:** Rapidly click the "Place Order" button twice. Verify only **ONE** order is recorded in the `Orders` sheet.
- [ ] **Snapshot Price Verification:** Place an order for Milk at ₹68. Edit product price in admin to ₹75. Check `/orders.html` and verify past order line item remains recorded at ₹68.

---

## 4. Order State Machine Transition Tests

- [ ] **`NEW` → `ACCEPTED`:** Admin clicks "Accept". Verify order status moves to `ACCEPTED`.
- [ ] **`ACCEPTED` → `PREPARING`:** Admin clicks "Start Preparing". Verify status moves to `PREPARING`.
- [ ] **`PREPARING` → `READY_FOR_PICKUP`:** Admin clicks "Mark Ready". Verify status moves to `READY_FOR_PICKUP`.
- [ ] **`READY_FOR_PICKUP` → `PICKED_UP`:** Admin clicks "Confirm Picked Up". Verify status moves to `PICKED_UP` and Payment moves to `PAID`.
- [ ] **Invalid Transition Rejection:** Attempt to transition directly from `NEW` to `PICKED_UP`. Verify the server rejects the request with `INVALID_STATUS_TRANSITION`.
- [ ] **Customer Cancellation:** In `/track-order.html`, customer clicks "Cancel This Order". Verify order moves to `CANCELLED` and pickup slot capacity is restored.

---

## 5. Security & Authorization Tests

- [ ] **Cross-Customer Order Isolation:** Log in as Customer A. Attempt to view `track-order.html?id=ORDER_B`. Verify access is denied (`FORBIDDEN`).
- [ ] **Unauthenticated Admin Endpoints:** Send a request to `?action=adminOrders` without an admin token. Verify backend returns `FORBIDDEN`.
- [ ] **Price Tampering Defense:** Send a forged POST payload with a modified low price. Verify server recalculates prices from `Products` sheet and ignores client prices.

---

## 6. High-Volume & Concurrency Tests

- [ ] **Simultaneous Slot Booking:** Simulate two simultaneous orders on the same final available slot. Verify `LockService` grants the slot to exactly one request and gracefully informs the second user with `PICKUP_SLOT_FULL`.
- [ ] **Monthly Archival:** In Apps Script editor, run `setupMonthlyArchivalTrigger()`. Trigger `runMonthlyArchival()`. Verify previous month orders move to `Orders_YYYY_MM` archive tab.
