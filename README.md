# 🌱 Cashio — Frontend
## ఎరువుల దుకాణం — ఫ్రంటెండ్

React frontend for the Cashio (Fertilizer Shop Management System). Built with a Telugu-friendly UI for non-technical village shop owners.

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
| Auth        | Azure AD (MSAL) + Local JWT      |
| Testing     | Vitest + React Testing Library    |

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
- **Quotation mode** — generate estimate PDF without placing order

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

### 👤 User & Role Management
- Create users with roles (admin, manager, cashier, viewer)
- Role-based permission matrix
- Settings page for shop configuration

---

## 📁 Project Structure

```
cashio_frontend/
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── src/
│   ├── api/client.ts          # Axios API client (base URL config)
│   ├── components/            # Layout, Sidebar, ProtectedRoute
│   ├── config/
│   │   ├── authConfig.ts      # Azure AD / MSAL configuration
│   │   └── shopConfig.ts      # Shop details (name, GST, address)
│   ├── context/               # Auth & Language contexts
│   ├── i18n/                  # English & Telugu translations
│   ├── pages/                 # All page components (lazy-loaded)
│   ├── types/                 # TypeScript interfaces
│   ├── __tests__/             # Unit tests (mirrors src/ structure)
│   ├── setupTests.ts          # Test setup (jsdom, mocks)
│   ├── App.tsx                # Router & providers
│   └── main.tsx               # Entry point
├── index.html
├── .env.example               # Template for environment variables
├── .github/workflows/         # CI/CD pipeline (GitHub Actions)
├── run-tests.ps1              # Sequential test runner (Windows)
├── staticwebapp.config.json   # Azure Static Web Apps SPA config
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 Local Development Setup (Step-by-Step)

Follow these steps to set up the frontend on your machine from scratch.

### Step 1: Prerequisites

Install the following tools before starting:

| Tool       | Version | Download Link                              |
|------------|---------|--------------------------------------------|
| Node.js    | 18+     | https://nodejs.org/ (LTS recommended)      |
| npm        | 9+      | Comes with Node.js                         |
| Git        | Any     | https://git-scm.com/downloads              |

**Verify installations:**
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show any version
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/SRINIVAS-16/cashio_frontend.git
cd cashio_frontend
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Now choose one of the two setups below:

---

### 🔹 Option A: Connect to Production Backend API (Easiest)

Use this if you just want to work on the frontend UI without running the backend locally.

Edit `.env`:
```env
# Point directly to the production API
VITE_API_URL=https://cashio-backend.azurewebsites.net/api

# Not needed when using VITE_API_URL directly
VITE_BACKEND_URL=

# Enable username/password login
VITE_LOCAL_AUTH_ENABLED=true

# ─── Azure AD (Optional — leave empty to use local login) ─────
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_AZURE_API_SCOPE=
```

**How it works:**
- `VITE_API_URL` is baked into the build — Axios calls go directly to this URL
- No Vite proxy is used
- CORS must be configured on the production backend to allow `http://localhost:5173`

> ⚠️ **Note:** The production backend must have `FRONTEND_URL` set to include `http://localhost:5173` for CORS to work. Ask the admin to add your localhost to the allowed origins.

---

### 🔹 Option B: Connect to Local Backend API (Full Stack)

Use this for full-stack development with the backend running on your machine.

**First**, set up and start the backend:
1. Follow the [Backend Setup Guide](https://github.com/SRINIVAS-16/cashio_backend#-local-development-setup-step-by-step)
2. Make sure the backend is running on `http://localhost:4000`

Then edit `.env`:
```env
# Leave empty — Vite proxy handles routing to backend
VITE_API_URL=

# Backend URL for the Vite dev proxy
VITE_BACKEND_URL=http://localhost:4000

# Enable username/password login
VITE_LOCAL_AUTH_ENABLED=true

# ─── Azure AD (Optional — leave empty to use local login) ─────
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_AZURE_API_SCOPE=
```

**How it works:**
- When `VITE_API_URL` is empty, Axios calls go to `/api` (relative path)
- Vite dev server proxies `/api/*` requests to `VITE_BACKEND_URL` (default: `http://localhost:4000`)
- No CORS issues because the browser sees everything from `localhost:5173`

> **This is the recommended setup for full-stack development.**

---

### Step 5: Start the Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser.

### Step 6: Login

- **Username**: `admin`
- **Password**: `admin123`

> These credentials work with the seeded backend database. If using the production API, use the credentials provided by your admin.

---

## 🧪 Running Tests

### On Windows (using PowerShell sequential runner)
```bash
npm test
```
This runs `run-tests.ps1` which executes test files one at a time to avoid Windows-specific deadlock issues with Vitest's fork pool.

### On macOS / Linux (or direct vitest)
```bash
npx vitest run --reporter=verbose
```

### Other Test Commands
```bash
# Run a single test file
npx vitest run src/__tests__/pages/Dashboard.test.tsx

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test suite summary:** 29 test suites, 92+ tests covering all pages, API client, and components.

> **Note:** Tests use mocked API calls — no backend connection needed to run tests.

---

## 📋 Available npm Scripts

| Script                | Command                        | Description                              |
|-----------------------|--------------------------------|------------------------------------------|
| `npm run dev`         | `vite`                         | Start dev server with hot reload (port 5173) |
| `npm run build`       | `tsc -b && vite build`        | Type-check and build for production      |
| `npm run preview`     | `vite preview`                 | Preview production build locally         |
| `npm test`            | `pwsh ./run-tests.ps1`        | Run all tests sequentially (Windows)     |
| `npm run test:single` | `vitest run`                   | Run all tests with vitest directly       |
| `npm run test:watch`  | `vitest --pool=threads`       | Watch mode for development               |
| `npm run test:coverage`| `vitest run --coverage`       | Run tests with coverage report           |

---

## 🔧 Configuration

### Shop Details

Edit `src/config/shopConfig.ts` to customize your shop:
- Shop name (English & Telugu)
- Address, phone numbers
- GSTIN number
- GST rates (CGST, SGST)
- Logo path

### Authentication Modes

The app supports two authentication modes:

| Mode | When Active | How to Enable |
|------|-------------|---------------|
| **Local (username/password)** | `VITE_LOCAL_AUTH_ENABLED=true` | Set in `.env` |
| **Microsoft SSO (Azure AD)** | `VITE_AZURE_CLIENT_ID` is set | Configure Azure AD app registration |

- If both are enabled, the login page shows both options
- If neither is enabled, only Microsoft SSO button appears (but won't work without Azure AD config)
- For local development, always set `VITE_LOCAL_AUTH_ENABLED=true`

### Azure AD Setup (Optional)

If you want to enable "Sign in with Microsoft":

1. Go to [Azure Portal](https://portal.azure.com) → Microsoft Entra ID → App Registrations
2. Register a new app (or use existing `Cashio` registration)
3. Copy **Application (client) ID** → `VITE_AZURE_CLIENT_ID`
4. Copy **Directory (tenant) ID** → `VITE_AZURE_TENANT_ID`
5. Add redirect URI: `http://localhost:5173` → `VITE_AZURE_REDIRECT_URI`
6. Expose an API scope → `VITE_AZURE_API_SCOPE` (e.g., `api://<client-id>/access_as_user`)

---

## 🔧 Environment Variables Reference

| Variable                  | Required | Default                 | Description                                      |
|---------------------------|----------|-------------------------|--------------------------------------------------|
| `VITE_API_URL`            | No       | `/api` (uses proxy)     | Full backend API URL. Leave empty for local dev.  |
| `VITE_BACKEND_URL`        | No       | `http://localhost:4000` | Backend URL for Vite dev proxy (dev only)        |
| `VITE_LOCAL_AUTH_ENABLED`  | No       | `false`                 | Show username/password login form                |
| `VITE_AZURE_CLIENT_ID`    | No       | —                       | Azure AD app registration client ID              |
| `VITE_AZURE_TENANT_ID`    | No       | —                       | Azure AD tenant ID                               |
| `VITE_AZURE_REDIRECT_URI` | No       | `window.location.origin`| OAuth redirect URI                               |
| `VITE_AZURE_API_SCOPE`    | No       | `User.Read`             | API scope for access token                       |

### How API Routing Works

```
┌─────────────────────────────────────────────────────────────┐
│ VITE_API_URL set?                                            │
│   YES → Axios calls go directly to that URL                  │
│   NO  → Axios calls go to /api (relative)                    │
│         → Vite dev proxy forwards /api/* to VITE_BACKEND_URL │
└─────────────────────────────────────────────────────────────┘
```

---

## ☁️ Deployment

### Azure Static Web Apps (Current Setup)

The project deploys automatically via GitHub Actions:

1. **On push to `main`** → runs tests → builds → deploys to Azure Static Web Apps
2. **On pull request** → builds a preview environment
3. Tests must pass before deployment proceeds

**Build-time environment variables** are set in the GitHub Actions workflow as `env:` values (secrets configured in GitHub repo settings).

### Manual Deployment to Any Static Host

```bash
# Set production API URL
export VITE_API_URL=https://your-backend.azurewebsites.net/api

# Build
npm run build

# Deploy the dist/ folder to your hosting provider
```

The `staticwebapp.config.json` configures SPA routing (all paths → `index.html`). For other hosts, configure equivalent rewrite rules.

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page after login | Check browser console for CORS errors. Ensure backend `FRONTEND_URL` includes your localhost |
| `CORS error` in console | Backend must allow your frontend origin. Check `FRONTEND_URL` env var on the backend |
| `401 Unauthorized` on all API calls | Token may be expired. Clear `localStorage` and login again |
| `npm run dev` shows proxy errors | Backend is not running. Start it with `npm run dev` in the backend repo |
| `VITE_API_URL` changes not reflecting | Restart the dev server (`Ctrl+C` then `npm run dev`). Vite env vars are loaded at startup |
| Tests hang on Windows | Use `npm test` (runs sequential PowerShell runner). Don't use `vitest` with `--pool=forks` on Windows |
| `tsc -b` fails with type errors | Run `npm install` to ensure all types are installed. Check `tsconfig.json` lib settings |
| Azure AD login not working | Verify `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` are set correctly. Check redirect URI matches |
| Images not loading | Product images come from the backend. Ensure the API URL is correct |

---

## 📄 License
MIT
