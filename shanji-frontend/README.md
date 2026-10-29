# Shanji DNA — Project Operations System

## Overview

Shanji DNA is a professional project-operations and project-accountability platform designed for organizations managing complex projects involving multiple departments, field teams, contractors, procurement, finance, compliance, and management.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: TanStack React Query + React Context
- **Styling**: Custom CSS with CSS Variables

## Architecture

```
shanji-frontend/
├── src/
│   ├── types/              # TypeScript types and interfaces
│   ├── lib/                # Core utilities (supabase client, permissions, utils)
│   ├── hooks/              # Custom React hooks (data fetching, UI)
│   ├── contexts/           # React Context providers (Auth, Project, Notifications)
│   ├── components/         # Shared UI components (Card, Modal, StatusBadge, etc.)
│   ├── features/           # Feature modules (tasks, risks, procurement, etc.)
│   ├── pages/              # Top-level pages (Dashboard, Projects, Login)
│   ├── layouts/            # App layout (MainLayout with sidebar)
│   └── App.tsx             # Root routing component
```

## Features Implemented

### Phase 1 — Foundation
- ✅ TypeScript project setup with Vite
- ✅ Supabase authentication (login, session management)
- ✅ Role-based access control (centralized permission system)
- ✅ Application shell with sidebar navigation
- ✅ Database schema with RLS policies

### Phase 2 — Project Core
- ✅ Project management (CRUD, status, health)
- ✅ Project members and roles
- ✅ Task management with status workflows
- ✅ Workplans and milestones
- ✅ WBS items

### Phase 3 — Accountability
- ✅ Evidence upload and verification
- ✅ Approval engine (approve, reject, return)
- ✅ Notifications system (read/unread, real-time)
- ✅ Audit logging
- ✅ Comments and communication

### Phase 4 — Operations
- ✅ Risk register with calculated risk scores
- ✅ Issue tracking with severity and escalation
- ✅ Procurement workflow (requests, quotations, orders, deliveries)
- ✅ Finance module (budgets, expenses, variance)
- ✅ Site management (daily reports)
- ✅ Document repository with categories

### Phase 5 — Control
- ✅ Change requests with impact analysis
- ✅ Timeline view (grouped by status)
- ✅ Reports (project status, auto-generated)

### Phase 6 — Closure
- ✅ Handover workflow (preparation → approval → completion)
- ✅ Closure checklist
- ✅ Completion readiness tracking

## Key Business Rules

1. **Authorization**: All access controlled via RLS policies on database level
2. **Evidence**: Tasks cannot skip verification stages
3. **Approvals**: Centralized approval engine, not duplicated per module
4. **Audit**: Append-only audit logs, cannot be deleted
5. **Multi-tenancy**: Organization-based data isolation via RLS

## Running the Application

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npx eslint .
```

## Database

Database schema SQL is located at `supabase/migrations/001_initial_schema.sql`.
Seed data (Loreto Solarization project) is at `supabase/seed.sql`.

## Roles

| Role | Description |
|------|-------------|
| Project Manager | Full project oversight and approvals |
| Project Assistant | Administrative support and documentation |
| Site Supervisor | Field execution and evidence |
| Finance | Budgets, expenses, financial records |
| Procurement | Purchases, quotations, suppliers |
| OHS / HSE | Safety, compliance, inspections |
| M&E | Monitoring and indicators |
| Team Member | General access to assigned work |

## Configuration

Supabase URL and key are configured in `src/lib/supabase.ts`. Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` can override defaults.
