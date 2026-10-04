# Chirab Sales Offer Management System

**Centralized · Traceable · Management Controlled**

A production-ready full-stack web application for managing the complete sales-offer lifecycle at Chirab Technologies.

---

## Architecture

```
chirab-sales-system/
├── frontend/          React 18 + TypeScript + Vite + Tailwind CSS
├── backend/           Node.js + Express + TypeScript + Prisma
└── README.md
```

---

## Technology Stack

| Layer       | Technology                                               |
|-------------|----------------------------------------------------------|
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, React Router  |
| State/Data  | TanStack Query (React Query v5)                          |
| Forms       | React Hook Form + Zod                                    |
| Charts      | Recharts                                                 |
| Backend     | Node.js, Express, TypeScript                             |
| Database    | PostgreSQL                                               |
| ORM         | Prisma                                                   |
| Auth        | JWT (jsonwebtoken) + bcryptjs                            |
| Validation  | Zod (both frontend and backend)                          |

---

## Prerequisites

- **Node.js** v18+  
- **PostgreSQL** 14+ running locally or remote  
- **npm** v9+

---

## PostgreSQL Setup

```sql
-- Run in psql or pgAdmin
CREATE DATABASE chirab_sales;
CREATE USER chirab_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE chirab_sales TO chirab_user;
```

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
DATABASE_URL=postgresql://chirab_user:your_strong_password@localhost:5432/chirab_sales
JWT_SECRET=replace_with_64_char_random_string
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Storage: local | s3 | azure
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads/documents

# Email: none | smtp | sendgrid
EMAIL_PROVIDER=none
```

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Installation

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file
copy .env.example .env
# Edit .env with your database credentials and JWT secret

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed demo data
npm run prisma:seed
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
copy .env.example .env
```

---

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
# API running at http://localhost:5000/api
# Health check: http://localhost:5000/api/health
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

---

## Demo Login Credentials

After seeding the database with `npm run prisma:seed`:

| Role       | Email                                    | Password   |
|------------|------------------------------------------|------------|
| ADMIN      | admin@chirabtechnologies.com             | Admin@123  |
| MANAGEMENT | management@chirabtechnologies.com        | Admin@123  |
| SALES      | laxmikant@chirabtechnologies.com         | Sales@123  |
| SALES      | kaushal@chirabtechnologies.com           | Sales@123  |
| APPROVER   | approver@chirabtechnologies.com          | Sales@123  |

---

## API Structure

```
POST   /api/auth/login
GET    /api/auth/profile
POST   /api/auth/change-password

GET    /api/dashboard/summary
GET    /api/dashboard/followups-due

GET    /api/offers
POST   /api/offers
GET    /api/offers/:id
PUT    /api/offers/:id
PATCH  /api/offers/:id/status
POST   /api/offers/:id/revisions
GET    /api/offers/:id/revisions
POST   /api/offers/:id/followups
GET    /api/offers/:id/followups
POST   /api/offers/:id/approvals
POST   /api/offers/:id/documents
GET    /api/offers/:id/documents/:docId/download

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id

GET    /api/users
POST   /api/users
GET    /api/users/salespeople
GET    /api/users/:id
PUT    /api/users/:id

GET    /api/reports/offer-summary
GET    /api/reports/salesperson-performance
GET    /api/reports/won-lost
GET    /api/reports/follow-ups
```

---

## Offer Number Format

Offer numbers are generated server-side with guaranteed uniqueness:

```
CH/26-27/00001
```

- `CH` — Chirab company prefix
- `26-27` — India fiscal year (April–March)
- `00001` — 5-digit zero-padded sequential number

---

## Role-Based Access

| Feature                  | ADMIN | MANAGEMENT | SALES    | APPROVER |
|--------------------------|-------|------------|----------|----------|
| All Offers               | ✓     | ✓          | Own only | ✓        |
| Create Offers            | ✓     | ✓          | ✓        | —        |
| Approve Offers           | ✓     | ✓          | —        | ✓        |
| Manage Users             | ✓     | View       | —        | —        |
| Dashboard                | ✓     | ✓          | Own data | Own data |
| Reports                  | ✓     | ✓          | Own only | —        |
| Audit Logs               | ✓     | ✓          | —        | —        |

---

## Database Schema

Core models:

- **User** — Authentication, role, salesperson profile
- **Customer** — Customer master with auto-generated codes
- **Offer** — Full offer lifecycle with auto offer number
- **OfferRevision** — Immutable revision history (Rev-00, Rev-01, ...)
- **FollowUp** — Communication history per offer
- **OfferApproval** — Approval audit trail
- **OfferDocument** — File attachment metadata
- **AuditLog** — Full system audit trail
- **OfferSequence** — Thread-safe fiscal-year sequence counter

---

## Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or any static host
```

---

## Document Storage

Currently uses local disk storage. To switch to cloud:

Set `STORAGE_PROVIDER` in `backend/.env`:
- `local` — stores under `./uploads/documents/`
- `s3` — configure `AWS_*` variables
- `azure` — configure `AZURE_*` variables

The storage abstraction is in `backend/src/utils/emailService.ts` and the upload middleware in `backend/src/routes/offer.routes.ts`.

---

## Future Integrations

The system is designed for easy integration with:

- **Microsoft 365** (Outlook, SharePoint, OneDrive, Power Automate)
- **Google Workspace** (Gmail, Drive)
- **Email notifications** (configure `EMAIL_PROVIDER`)
- **AWS S3 / Azure Blob** document storage

No external integrations are assumed or hardcoded. Configure via environment variables when ready.

---

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire in 7 days (configurable)
- Rate limiting: 500 req/15min general, 20 req/15min for login
- CORS restricted to `FRONTEND_URL`
- Input validation with Zod on all endpoints
- SQL injection protection via Prisma parameterized queries
- Uploaded files validated for type and size (max 25MB)
- No secrets exposed to frontend

---

## Prisma Commands Reference

```bash
cd backend

# Generate client after schema changes
npx prisma generate

# Create and apply a migration
npx prisma migrate dev --name description

# Seed demo data
npm run prisma:seed

# Open Prisma Studio (visual DB browser)
npx prisma studio
```
