# OrderSarthi — Step-by-Step Deployment & Setup Guide

Follow these instructions to deploy the entire Click & Collect ordering system to **Google Sheets**, **Google Apps Script**, **Google Drive**, and **Vercel**.

---

## Step 1: Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name the spreadsheet: **`OrderSarthi DB`**.
3. Copy the **Spreadsheet ID** from the browser URL:
   ```
   https://docs.google.com/spreadsheets/d/{YOUR_SPREADSHEET_ID}/edit
   ```

---

## Step 2: Set up Google Apps Script Backend

1. In your Google Sheet, click **Extensions** → **Apps Script**.
2. Rename the Apps Script project to **`OrderSarthi Backend`**.
3. Add the files from the `backend/` directory into the Apps Script editor:
   - `Code.gs`
   - `Router.gs`
   - `Config.gs`
   - `SheetService.gs`
   - `Utils.gs`
   - `ValidationService.gs`
   - `SecurityService.gs`
   - `ShopService.gs`
   - `CategoryService.gs`
   - `ProductService.gs`
   - `PickupSlotService.gs`
   - `PaymentService.gs`
   - `OrderService.gs`
   - `CustomerService.gs`
   - `ReportService.gs`
   - `ArchivalService.gs`
   - `NotificationService.gs`

4. Set the Spreadsheet ID in Script Properties:
   - Click **Project Settings** (gear icon on the left menu).
   - Under **Script Properties**, click **Add script property**.
   - Property: `SPREADSHEET_ID`
   - Value: `{YOUR_SPREADSHEET_ID}` (from Step 1).

5. Initialize the Database & Tables:
   - In the Apps Script code editor, select the function `setupDatabase` in the top toolbar dropdown.
   - Click **Run** and grant the required Google permissions.
   - All 11 sheets with headers and sample products will be populated automatically!

6. Setup Scheduled Monthly Archival:
   - Select the function `setupMonthlyArchivalTrigger` and click **Run**.
   - This sets a time-driven trigger for automatic monthly sheet cleanup.

---

## Step 3: Deploy Apps Script Web App

1. In the top-right corner of Apps Script editor, click **Deploy** → **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Fill in the deployment details:
   - **Description:** `OrderSarthi Production v1`
   - **Execute as:** `Me (your_email@gmail.com)`
   - **Who has access:** `Anyone` (Crucial for REST API access from Vercel).
4. Click **Deploy**.
5. Copy the generated **Web App URL**:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 4: Configure Frontend

1. Open `frontend/js/config.js` in your local code editor.
2. Update `API_BASE_URL` with your deployed Apps Script URL:
   ```javascript
   const CONFIG = {
     API_BASE_URL: "https://script.google.com/macros/s/YOUR_ACTUAL_APP_ID/exec",
     ...
   };
   ```

---

## Step 5: Deploy Frontend to Vercel

### Option A: Using Vercel CLI
```bash
cd frontend
npm i -g vercel
vercel deploy --prod
```

### Option B: Using GitHub & Vercel Dashboard
1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `frontend`.
5. Click **Deploy**.

Your store will now be live on your custom `.vercel.app` domain!

---

## Step 6: Initial Store Admin Credentials

- **Admin Login URL:** `https://your-domain.vercel.app/admin/index.html`
- **Username:** `admin` (or `9876543210`)
- **Default Password:** `admin123`

*(You can update the password and contact details anytime from `/admin/settings.html`)*.
