# 🛒 OrderSarthi — Local Shop Blinkit-Style 10-Min Store Pickup & POS System

**OrderSarthi** is a production-grade, single-shop online ordering and store pickup system built for individual grocery stores, supermarkets, and local retail shops — rebranded to a high-contrast **Blinkit-style light UI**.

> **Customer orders online via Blinkit-style store app → Shop prepares order in 10 mins → Customer gets "Ready for Pickup" status → Customer visits store → Customer collects order with 10-second handover & zero queue.**

---

## ⚡ Key Highlights & Architecture

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Tailwind CSS v4 CDN (Hosted on **Vercel**).
- **Backend:** Google Apps Script Web App REST API (`doGet` / `doPost` with action-based routing).
- **Database:** One Google Spreadsheet with 11 relational sheets and monthly automated archival.
- **Image Storage:** Google Drive with direct high-speed CDN image preview URLs.
- **High-Volume Capacity:** Engineered to comfortably process **500+ daily orders** without duplicate orders or data overlap.
- **State Machine:** Strict 5-step order workflow (`NEW` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `PICKED_UP`).
- **Security:** Server-side price authority, salted SHA-256 password hashes, `CacheService` sessions, and `LockService` mutex locks.

---

## 📂 Project Structure

```
OrderSarthi/
├── frontend/                     # Vercel Static Frontend
│   ├── index.html                # Shop Landing Page
│   ├── shop.html                 # Product Catalog & Search
│   ├── product.html              # Product Detail View
│   ├── cart.html                 # Shopping Basket
│   ├── checkout.html             # Slot Picker & Order Submit
│   ├── order-success.html        # Order Confirmation
│   ├── track-order.html          # Live Visual Tracking
│   ├── orders.html               # Customer Order History
│   ├── profile.html              # Customer Account Profile
│   ├── login.html                # Customer Login
│   ├── register.html             # Customer Registration
│   │
│   ├── admin/                    # Store Management Portal
│   │   ├── index.html            # Admin Login
│   │   ├── dashboard.html        # Live KPI Dashboard
│   │   ├── orders.html           # Order Workflow Management
│   │   ├── products.html         # Inventory & Stock CRUD
│   │   ├── categories.html       # Category Management
│   │   ├── pickup-slots.html     # Slot Occupancy View
│   │   ├── customers.html        # Customer Directory
│   │   ├── reports.html          # Sales & Revenue Analytics
│   │   └── settings.html         # Operating Hours & Settings
│   │
│   ├── css/
│   │   └── styles.css            # Typography & Theme Styles
│   │
│   ├── js/
│   │   ├── config.js             # API Base URL & App Config
│   │   ├── api.js                # Central REST Client & Deduplication
│   │   ├── auth.js               # Auth Sessions & Route Guards
│   │   ├── cart.js               # Cart Manager & Badge Sync
│   │   ├── products.js           # Catalog Controller
│   │   ├── checkout.js           # Slot & Checkout Controller
│   │   ├── orders.js             # Customer Orders & Tracking
│   │   ├── ui.js                 # Shared Navigation & Modals
│   │   ├── utils.js              # Formatters & Validators
│   │   └── admin/                # Admin Module Controllers
│   │
│   └── vercel.json               # Vercel Clean URL Rewrites
│
├── backend/                      # Google Apps Script REST API
│   ├── Code.gs                   # doGet & doPost Entry Points
│   ├── Router.gs                 # Action Dispatcher
│   ├── Config.gs                 # Sheet Maps, Cache TTLs & Limits
│   ├── SheetService.gs           # Batch Sheet IO & Caching
│   ├── OrderService.gs           # Concurrency, Idempotency & State Machine
│   ├── ProductService.gs         # Catalog & Drive Image Upload
│   ├── CategoryService.gs        # Categories Management
│   ├── PickupSlotService.gs      # Slot Capacity & Booking Mutex
│   ├── AuthService.gs            # Salted SHA-256 Auth
│   ├── SecurityService.gs        # Cache Tokens & Ownership Checks
│   ├── ValidationService.gs      # Input & State Machine Rules
│   ├── ShopService.gs            # Store Profile & Hours
│   ├── CustomerService.gs        # Customer Directory & Counts
│   ├── ReportService.gs          # Sales Analytics & AOV
│   ├── ArchivalService.gs        # Monthly Sheet Archival Trigger
│   ├── NotificationService.gs    # In-App Alerts & Extensible Hooks
│   ├── PaymentService.gs         # Pay-at-Pickup & Gateway Hooks
│   └── Utils.gs                  # Sequential Order IDs & IST Dates
│
└── docs/                         # Documentation Set
    ├── ARCHITECTURE.md           # System Architecture & Topology
    ├── API.md                    # REST API Reference
    ├── DATABASE.md               # Google Sheets Database Schema
    ├── SETUP.md                  # Deployment Guide
    └── TESTING.md                # QA Testing Checklist
```

---

## 🚀 Quick Start Guide

1. **Backend Deployment:** Follow [`docs/SETUP.md`](docs/SETUP.md) to copy the `backend/` scripts into your Google Sheet's Apps Script editor, run `setupDatabase()`, and deploy as a Web App.
2. **Frontend Deployment:** Update `API_BASE_URL` in `frontend/js/config.js` with your deployed Apps Script URL, and deploy the `frontend/` directory to **Vercel**.
3. **Default Admin Login:**
   - **URL:** `https://your-domain.vercel.app/admin/index.html`
   - **Username:** `admin`
   - **Password:** `admin123`

---

## 📄 Documentation

- 📐 [System Architecture & 500+ Daily Orders Engine](docs/ARCHITECTURE.md)
- 🔌 [REST API Reference](docs/API.md)
- 🗄️ [Google Sheets Database Schema](docs/DATABASE.md)
- 🛠️ [Step-by-Step Setup Guide](docs/SETUP.md)
- 🧪 [QA Testing Checklist](docs/TESTING.md)
