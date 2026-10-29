# Shanji DNA — Recovery Record

## Why this branch exists

The default branch (`main`) contains only the original 15-file JavaScript prototype
(`77cb2ba "Initial Shanji DNA app"`). The complete TypeScript application was developed
on an unmerged feature branch and never reached `main`.

- `origin/kilo/floral-edge-rl8` — 51-commit full application history.
- Its tip (`2893a6e`) is **corrupted**: five source files contain unresolved
  `<<<<<<< ours / ======= / >>>>>>> theirs` blocks and duplicated modal/function bodies.
- The last coherent, full-featured commit is `0410058`
  ("feat(ui): implement dependency validation and circular dependency detection"),
  63 source files, zero conflict markers, `tsc --noEmit` clean.
- `origin/cline/v2wjcd9d` contains the later Add Project work
  (`a8d4da1`, `ea4c804`, `ac861d1`) and was branched from `main`, so it does not
  contain the full application.

The regression cause: `index.html` / the deployed entry point served the legacy
JavaScript app, and the full TypeScript application existed only on an unmerged,
partially corrupted feature branch. Several real modules (workplan, dependency engine,
comments, global search) were also never imported by `App.tsx`, and the sidebar's
"Plan" link pointed back at the project overview instead of the workplan module.

## Recovery sources

| Content | Source commit |
| --- | --- |
| Complete TypeScript application + schema migrations | `0410058` |
| Add Project organization resolution / route guard / NotFound | `cline/v2wjcd9d` (`a8d4da1..ac861d1`) |
| Migration 003 merge-deconfliction | `66aaa66` (to be reconciled) |

Tags created locally: `recovery/main-initial`, `recovery/full-app-last-clean`,
`recovery/full-app-corrupt-tip`, `recovery/add-project-cline`.

## What was restored in this baseline

- Full TypeScript application (pages, features, hooks, contexts, types, styles).
- The original `MainLayout` sidebar, now using the real workplan route and the
  previously orphaned modules.
- Protected routes and a not-found route, ported from the Add Project branch.
- Add Project now resolves `organization_id` from the signed-in user's `Profiles`
  row and reports profile/organization/RLS errors instead of silently failing.
- `Profiles` table casing corrected for the live database.
- Role selection now persists through auth metadata (frontend UX only; RLS is the
  security boundary).
- React Query provider added (previously missing, which would crash `useQueryClient`).
- Obsolete `.jsx` duplicates removed so only the TypeScript app is built.

## Live database observations (read-only probes)

The live Supabase project (`ciganxsasqlvymlcqdmr`) exposes a **minimal** schema that
does not match the full application's migrations:

- Present: `Profiles`, `projects`, `tasks`, `workplans`, `workplan_items`,
  `workplan_history`, `task_dependencies`, `project_milestones`, `documents`,
  `approvals`, `risks`, `suppliers`, `budgets`, `expenses`, `lessons`,
  `project_handovers`, `notifications`, `comments`, `audit_logs`,
  `activity_logs`, `meetings`.
- Absent: `organizations`, `project_members`, `project_phases`, `wbs_items`,
  `task_assignments`, `issues`, `evidence_records`, `procurement_requests`,
  `quotations`, `purchase_orders`, `deliveries`, `payments`, `funds`,
  `finance_approvals`, `site_reports`, `inspections`, `incidents`,
  `corrective_actions`, `near_misses`, `indicators`, `change_requests`,
  `handover_records`, `document_versions`, `milestones`.
- Verified column differences include `projects.project_manager_id` / `health_score`
  (not `pm_user_id` / `health`), `comments.comment` (not `content`), and
  `notifications.is_read` (not `read`). `workplan_items` has no `workplan_id`.
- Migrations in this repository must **not** be applied blindly: they define a richer,
  partly incompatible schema (`organizations`, `project_members`, etc.).

## Genuine gaps (no implementation exists in any commit)

- Monitoring & Evaluation (M&E) dashboard/indicators — only the `me` role and a
  migration table `indicators` exist; no component or route ever existed.
- Lessons learnt UI.
- Meetings UI.
- Independent milestone management page (timeline is the only recovered view).

These are recorded as gaps, not replaced with placeholders.
