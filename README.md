# FixFlow – Smart Repair Management Platform

FixFlow is a production-oriented, multi-tenant SaaS platform built for electronics repair businesses, computer shops, and mobile repair technicians. It features complete tenant isolation, role-based access control (RBAC), PostgreSQL persistence, interactive analytics dashboards, AI-assisted diagnosis via Ollama, secure customer QR status tracking, and PDF billing.

---

## 1. Technology Stack

### Frontend
- **React.js (v18+)** with **Vite**
- **Tailwind CSS** (Clean enterprise navy/blue aesthetic)
- **React Router v6** (Protected routes with role-based navigation)
- **Axios** (With Bearer JWT & automatic token refresh interceptor)
- **TanStack Query (v5)** (Optimistic caching, background refetching)
- **React Hook Form** with **Zod** schema validation
- **Recharts** (Interactive Area and Bar charts)
- **Lucide React** (Modern enterprise iconography)

### Backend
- **Python 3.15+** with **Django 6+**
- **Django REST Framework (DRF)**
- **Django Simple JWT** (Access + Refresh tokens with auto-rotation)
- **django-filter** & **django-cors-headers**
- **drf-spectacular** (OpenAPI 3.0 schema & Swagger UI)
- **Pillow** & **qrcode** (Device inspection images & QR tokens)
- **ReportLab** (PDF invoices & quotation generator)

### Database
- **PostgreSQL 18** (Direct relational database with UUID keys, Decimal fields, and tenant isolation)

### AI Integration
- **Ollama local AI API** (Configurable model e.g. `llama3:latest`, structured JSON diagnostic output, graceful offline fallback)

---

## 2. Architecture & Directory Structure

```text
FixFlow/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   └── base.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/          # CustomUser, Role (SUPER_ADMIN, SHOP_OWNER, RECEPTIONIST, TECHNICIAN, CUSTOMER)
│   │   ├── businesses/        # Business, Branch, ShopSettings, Subscription, Dashboard metrics
│   │   ├── customers/         # Customer CRM, DeviceCategory, Device, DeviceImage
│   │   ├── repairs/           # RepairTicket, RepairStatusHistory, RepairDiagnosis, RepairNote, RepairPart
│   │   ├── inventory/         # InventoryCategory, Supplier, InventoryItem, PurchaseOrder, InventoryTransaction
│   │   ├── billing/           # Quotation, QuotationItem, Invoice, InvoiceItem, Payment, Expense
│   │   ├── warranties/        # Warranty, WarrantyClaim
│   │   ├── ai_assistant/      # Ollama LLM diagnosis service & logs
│   │   ├── notifications/     # Notifications & Alerts
│   │   ├── reports/           # Financial, Repair & Parts reports
│   │   └── audit/             # Security and action audit trails
│   ├── data/
│   │   └── pgdata/            # Isolated PostgreSQL 18 cluster
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   ├── start-db.ps1           # One-click PostgreSQL startup script
│   └── stop-db.ps1            # PostgreSQL shutdown script
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client with JWT refresh interceptors
│   │   ├── components/        # Sidebar, Navbar, StatCard
│   │   ├── contexts/          # AuthContext (JWT management & RBAC helpers)
│   │   ├── layouts/           # AppLayout
│   │   ├── pages/
│   │   │   ├── auth/          # LoginPage (with 1-click role demo switcher)
│   │   │   └── dashboard/     # Real-time PostgreSQL KPI cards & Recharts
│   │   ├── routes/            # AppRoutes & ProtectedRoute
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── README.md
└── .gitignore
```

---

## 3. Database & Development Setup (Windows 10/11)

### Step 1: Start PostgreSQL Database
FixFlow comes with automated cluster scripts that utilize PostgreSQL 18:

```powershell
cd backend
.\start-db.ps1
```
*The database server will start listening on port `5433` (or default port `5432` if configured in `.env`).*

### Step 2: Install Backend Dependencies & Apply Migrations
```powershell
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
```

### Step 3: Seed Initial Roles, Business, and Demo Accounts
FixFlow includes a seed command that populates RBAC roles, demo repair shop, devices, inventory items, and tickets:

```powershell
python manage.py seed_fixflow
```

### Step 4: Run Django REST Backend Server
```powershell
python manage.py runserver 127.0.0.1:8000
```
- API Base: `http://127.0.0.1:8000/api/v1/`
- Interactive Swagger UI: `http://127.0.0.1:8000/api/v1/docs/`
- OpenAPI Schema: `http://127.0.0.1:8000/api/v1/schema/`

### Step 5: Install & Run React Frontend
In a new terminal window:

```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Default Seed Credentials

You can test any role directly using the credentials below or click the role buttons on the login page:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Shop Owner** | `owner@apextech.com` | `Owner@12345` | Full repair shop management, staff, inventory & financials |
| **Technician** | `tech@apextech.com` | `Tech@12345` | Assigned repairs, diagnosis, status updates, parts usage |
| **Receptionist** | `reception@apextech.com` | `Recept@12345` | Customer intake, device registration, quotes, invoices |
| **Super Admin** | `admin@fixflow.com` | `Admin@12345` | Global platform administration, business tenant control |

---

## 5. Verification & Automated Tests

To execute the automated backend test suite verifying authentication, JWT refresh, RBAC permissions, and multi-tenant isolation against the live PostgreSQL database:

```powershell
cd backend
python manage.py test apps.accounts
```
