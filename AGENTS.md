# Shanji DNA — Agent Instructions

## Project Overview
Shanji DNA is a professional project-operations and accountability platform. It is NOT a generic task manager — it answers: What is supposed to happen? Who is responsible? What is the status? What evidence proves it? Who approved it?

## Key Architecture Decisions
- TypeScript throughout (no JSX files)
- Supabase for backend (PostgreSQL + Auth + RLS)
- TanStack React Query for server state
- React Context for auth/project/notifications state
- Centralized permission system in `src/lib/permissions.ts`
- Database RLS policies enforce security (frontend checks are UX only)

## Build Commands
- `npm run build` — production build
- `npm run dev` — development server
- `npx tsc --noEmit` — type check

## Important Files
- `supabase/migrations/001_initial_schema.sql` — Full database schema
- `supabase/seed.sql` — Demo data (Loreto Solarization project)
- `src/lib/permissions.ts` — Role-based permissions
- `src/lib/supabase.ts` — Supabase client
- `src/types/index.ts` — All TypeScript types
- `src/App.tsx` — All routes

## Business Rules (Critical)
1. NEVER bypass approval/verification workflows
2. RLS policies are the security boundary, not frontend checks
3. Audit logs are append-only (enforced at DB level)
4. Evidence-dependent tasks cannot skip verification stages
5. Project closure requires all closure checklist items complete + PM approval
6. Workplan changes create new versions (no overwriting approved plans)
7. Procurement delays must be visible and affect project health

## When Adding New Features
1. Follow the module structure: `src/features/[module]/[Module]Page.tsx`
2. Add types to `src/types/index.ts`
3. Create hooks in `src/hooks/use[Module].ts`
4. Use Supabase client from `src/lib/supabase.ts`
5. Check permissions via `src/hooks/usePermissions.ts` or `src/lib/permissions.ts`
6. Add audit logging for significant actions via `src/hooks/useAuditLog.ts`

## Database Patterns
- All tables have RLS policies
- `organizations` → `projects` → sub-entities (multi-tenancy)
- Use `supabase.from('table').select().eq(...)` for queries
- `audit_logs` table is protected from updates/deletes via RLS
