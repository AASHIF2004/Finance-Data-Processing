# Finance Dashboard — Data Processing & Access Control Backend

A full-stack finance dashboard application with role-based access control (RBAC), financial records management, dashboard analytics, and user management. Built with React, TypeScript, and Supabase.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Database Schema](#database-schema)
- [Access Control](#access-control)
- [API Layer](#api-layer)
- [Setup & Installation](#setup--installation)
- [Assumptions & Tradeoffs](#assumptions--tradeoffs)

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│              React Frontend             │
│  (Auth, Dashboard, Records, Users UI)   │
└──────────────┬──────────────────────────┘
               │  Supabase JS Client
┌──────────────▼──────────────────────────┐
│           Supabase Backend              │
│  ┌────────────────────────────────┐     │
│  │  PostgreSQL + Row Level Security│     │
│  │  (profiles, user_roles,        │     │
│  │   financial_records)           │     │
│  └────────────────────────────────┘     │
│  ┌────────────────────────────────┐     │
│  │  Auth (email/password, JWT)    │     │
│  └────────────────────────────────┘     │
│  ┌────────────────────────────────┐     │
│  │  Security Definer Functions    │     │
│  │  (has_role, get_user_role)     │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                       |
|------------|----------------------------------|
| Frontend   | React 18, TypeScript, Vite       |
| UI         | Tailwind CSS, shadcn/ui, Recharts|
| Backend    | Supabase (PostgreSQL, Auth, RLS) |
| State      | TanStack React Query             |
| Validation | Zod (schema), HTML5 (forms)      |

## Features

### 1. User & Role Management
- Email/password authentication with JWT sessions
- Three roles: **Admin**, **Analyst**, **Viewer**
- Admin panel for managing user roles and active/inactive status
- Auto-profile creation on signup with default "viewer" role

### 2. Financial Records Management (CRUD)
- Create, read, update, and soft-delete financial entries
- Fields: amount, type (income/expense), category, description, date
- Filtering by type, category, and search by description
- Pagination (15 records per page)

### 3. Dashboard Summary APIs
- Total income, total expenses, net balance
- Category-wise breakdown (pie chart)
- Monthly trends (bar chart, last 6 months)
- Recent activity feed (last 5 transactions)

### 4. Access Control (RBAC)
- Enforced at the **database level** via Row Level Security (RLS)
- Security definer functions prevent RLS recursion
- Role checks in UI for conditional rendering

### 5. Validation & Error Handling
- Client-side form validation (required fields, number ranges, max lengths)
- Supabase returns proper error messages on constraint violations
- Toast notifications for success/error feedback
- Appropriate HTTP status codes from Supabase (401, 403, 422, etc.)

### 6. Data Persistence
- PostgreSQL via Supabase (fully managed)
- Indexed columns for fast filtering (date, type, category, user_id)
- Soft delete (is_deleted flag) preserves data integrity

## Database Schema

### `profiles`
| Column     | Type      | Description              |
|------------|-----------|--------------------------|
| id         | UUID (PK) | Auto-generated           |
| user_id    | UUID (FK) | References auth.users    |
| full_name  | TEXT      | Display name             |
| email      | TEXT      | User email               |
| is_active  | BOOLEAN   | Account active status    |
| created_at | TIMESTAMPTZ | Auto-set              |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger|

### `user_roles`
| Column  | Type           | Description                |
|---------|----------------|----------------------------|
| id      | UUID (PK)      | Auto-generated             |
| user_id | UUID (FK)       | References auth.users      |
| role    | app_role ENUM  | admin, analyst, or viewer  |

### `financial_records`
| Column      | Type         | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Auto-generated           |
| user_id     | UUID (FK)   | Creator reference        |
| amount      | NUMERIC(12,2)| Transaction amount      |
| type        | TEXT (CHECK) | 'income' or 'expense'   |
| category    | TEXT         | Category label           |
| description | TEXT         | Optional notes           |
| date        | DATE         | Transaction date         |
| is_deleted  | BOOLEAN      | Soft delete flag         |

### Database Functions
- `has_role(user_id, role)` — SECURITY DEFINER function to check role without RLS recursion
- `get_user_role(user_id)` — Returns highest priority role for a user
- `handle_new_user()` — Trigger function to auto-create profile and assign viewer role

## Access Control

| Action                    | Viewer | Analyst | Admin |
|---------------------------|--------|---------|-------|
| View dashboard            | ✅     | ✅      | ✅    |
| View financial records    | ✅     | ✅      | ✅    |
| Create financial records  | ❌     | ❌      | ✅    |
| Update financial records  | ❌     | ❌      | ✅    |
| Delete financial records  | ❌     | ❌      | ✅    |
| View user list            | ❌     | ❌      | ✅    |
| Change user roles         | ❌     | ❌      | ✅    |
| Toggle user active status | ❌     | ❌      | ✅    |

Access is enforced at two levels:
1. **Database (RLS policies)** — Cannot be bypassed from client
2. **UI (conditional rendering)** — Hides actions users can't perform

## API Layer

The application uses Supabase's client library which provides a typed API layer over PostgreSQL. All queries go through RLS-protected endpoints.

### Key Endpoints (via Supabase Client)

| Operation               | Method | Table/RPC           |
|--------------------------|--------|---------------------|
| Sign up                 | POST   | auth.signUp         |
| Sign in                 | POST   | auth.signInWithPassword |
| Get user role           | RPC    | get_user_role       |
| List records (filtered) | SELECT | financial_records   |
| Create record           | INSERT | financial_records   |
| Update record           | UPDATE | financial_records   |
| Soft delete record      | UPDATE | financial_records   |
| Dashboard summary       | SELECT | financial_records (aggregated client-side) |
| List users              | SELECT | profiles + user_roles |
| Update role             | UPDATE | user_roles          |
| Toggle user status      | UPDATE | profiles            |

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd finance-dashboard

# Install dependencies
npm install

# Set environment variables
# Create .env with:
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Start development server
npm run dev
```

### Creating an Admin User
1. Sign up through the UI (creates a viewer by default)
2. Use Supabase SQL editor to promote:
```sql
UPDATE public.user_roles SET role = 'admin' WHERE user_id = '<user-uuid>';
```

## Assumptions & Tradeoffs

1. **Client-side aggregation**: Dashboard summaries are computed client-side for simplicity. For large datasets, server-side aggregation (database views or edge functions) would be more performant.

2. **Soft delete**: Records are marked `is_deleted = true` rather than physically removed, preserving audit trail and data integrity.

3. **Single role per user**: Each user has one role in `user_roles`. The schema supports multiple roles per user, but the current implementation uses the highest-priority role.

4. **Category list**: Categories are hardcoded in the frontend for simplicity. A production system would store these in a database table.

5. **Email verification**: Supabase handles email verification. In development, auto-confirm may be enabled for easier testing.

6. **No rate limiting**: The application relies on Supabase's built-in rate limiting. A production system would add application-level rate limiting.

7. **Currency**: All amounts are displayed in USD. Multi-currency support would require additional schema changes.

## Project Structure

```
src/
├── components/
│   ├── AppLayout.tsx          # Sidebar navigation layout
│   └── ui/                    # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx         # Auth state & role management
├── hooks/
│   ├── useFinancialRecords.ts  # CRUD + dashboard hooks
│   └── useUsers.ts             # User management hooks
├── integrations/
│   └── supabase/               # Auto-generated client & types
├── pages/
│   ├── Auth.tsx                # Sign in / Sign up
│   ├── Dashboard.tsx           # Summary analytics
│   ├── Records.tsx             # Financial records CRUD
│   └── UsersManagement.tsx     # Admin user management
└── App.tsx                     # Routes & providers
```

