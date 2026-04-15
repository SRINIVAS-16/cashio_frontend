# Fertilizer Shop — Frontend
## ఎరువుల దుకాణం — ఫ్రంటెండ్

React frontend for the Fertilizer Shop Management System. Built with a Telugu-friendly UI for non-technical village shop owners.

---

## 🏗️ Tech Stack

| Layer       | Technology                       |
|-------------|----------------------------------|
| Framework   | React 18 + TypeScript            |
| Build       | Vite                             |
| Styling     | Tailwind CSS                     |
| Charts      | Recharts                         |
| PDF         | jsPDF + jspdf-autotable          |
| Excel       | xlsx                             |
| HTTP        | Axios                            |
| Routing     | React Router v6                  |

---

## ✨ Features

### 📦 Inventory Management
- Add / Edit / Delete products with Telugu names
- Stock tracking with batch-level detail
- Low stock alert indicator
- Category filtering & search

### 👥 Customer Management
- Add customers with phone, village, address
- Search customers
- View full order history

### 🧾 Billing System (2-Step Process)
1. **Select Customer + Add Products** to cart (with batch selection)
2. **Review & Confirm** bill with payment details

- Auto-calculates GST (CGST + SGST)
- Reduces stock automatically after order
- Supports Cash, UPI, Credit payment modes
- Partial payment support

### 📄 Bill Generation
- Download bill as **A4 PDF** (landscape, with Batch/HSN/MFG/Expiry)
- Download bill as **thermal receipt PDF** (80mm)
- **Print** directly from browser

### 📊 Dashboard
- Today's sales & this month summary
- Total products & customers count
- Low stock products alert
- Top selling products
- Recent orders list
- **Sales trend line chart** (30 days)
- **Product category pie chart**

### 🌐 Telugu (తెలుగు) Support
- Toggle between English and Telugu
- Product names in both languages
- All labels translated

### 📤 Export & Reports
- Export orders as Excel with batch-level details
- Print orders report with item details
- Daily sales summary
- Full audit log tracking

---

## 📁 Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/client.ts          # Axios API client
│   ├── components/            # Layout, Sidebar, ProtectedRoute
│   ├── config/shopConfig.ts   # Shop details (name, GST, address)
│   ├── context/               # Auth & Language contexts
│   ├── i18n/                  # English & Telugu translations
│   ├── pages/                 # Dashboard, Products, Billing, etc.
│   ├── types/                 # TypeScript interfaces
│   ├── App.tsx                # Router & providers
│   └── main.tsx               # Entry point
├── index.html
├── .env.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 Setup

### Prerequisites
- **Node.js** 18+
- Backend API running (see [backend repo](https://github.com/your-org/fertilizer-shop-backend))

### 1. Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

**Environment variables:**
```env
# Leave empty for local dev (uses Vite proxy to backend)
VITE_API_URL=

# Backend URL for Vite dev proxy (development only)
VITE_BACKEND_URL=http://localhost:4000
```

For **production builds**, set `VITE_API_URL` to your deployed backend:
```env
VITE_API_URL=https://your-backend-api.com/api
```

### 3. Run

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

App runs on **http://localhost:5173** by default.

### Default Login
- **Username**: `admin`
- **Password**: `admin123`

---

## 🔧 Shop Configuration

Edit [src/config/shopConfig.ts](src/config/shopConfig.ts) to set your shop details:
- Shop name (English & Telugu)
- Address, phone numbers
- GSTIN
- GST rates

---

## ☁️ Deployment

### Azure Static Web Apps / Any Static Hosting
1. Set `VITE_API_URL` environment variable at build time
2. Build: `npm run build`
3. Deploy the `dist/` folder
4. Configure routing for SPA (all paths → `index.html`)

### Vercel / Netlify
1. Set `VITE_API_URL` in project environment variables
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add rewrite rule: `/* → /index.html`

---

## 📄 License
MIT
