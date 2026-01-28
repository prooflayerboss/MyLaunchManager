# LaunchPad Build Plan

## Overview
Transform My Launch Manager into LaunchPad - a multi-tenant implementation management SaaS.

**Stack:** Next.js 14 + Supabase (Auth + PostgreSQL + RLS) + Tailwind

---

## Phase 1: Database Schema

### Tables to Create

```sql
-- Organization settings (multi-tenancy config)
organization_settings (
  id, organization_id,
  partner_label, partner_label_plural,
  workstream_label, workstream_label_plural,
  statuses (JSONB),
  health_scale_max,
  slack_update_template,
  default_workstreams (JSONB),
  created_at, updated_at
)

-- Partners (the core entity)
partners (
  id, organization_id,
  name, status,
  target_launch_date, actual_launch_date,
  health_score,
  primary_contact_name, primary_contact_email,
  external_channel,
  custom_fields (JSONB),
  archived,
  created_by,
  created_at, updated_at
)

-- Workstreams (phases/tasks for each partner)
workstreams (
  id, organization_id, partner_id,
  name, status,
  owner_user_id, owner_external,
  due_date, sort_order, notes
)

-- Milestones
milestones (
  id, organization_id, partner_id,
  title, target_date, actual_date,
  status, sort_order
)

-- Risks
risks (
  id, organization_id, partner_id,
  title, description,
  severity, status,
  mitigation_plan,
  owner_user_id,
  created_by, created_at, updated_at
)

-- Notes (meeting notes with action items)
notes (
  id, organization_id, partner_id,
  title, meeting_date,
  source,
  raw_content, summary,
  action_items (JSONB),
  decisions (JSONB),
  attendees (JSONB),
  external_link,
  created_by, created_at
)

-- Generated updates
generated_updates (
  id, organization_id, partner_id,
  update_type, content,
  generated_by, generated_at,
  sent, sent_at
)

-- Activity log
activity_log (
  id, organization_id, partner_id,
  user_id, action,
  entity_type, entity_id,
  details (JSONB),
  created_at
)
```

---

## Phase 2: Page Structure

```
/app
  /(marketing)
    /page.tsx                    # Landing page
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(app)
    /layout.tsx                  # App shell with sidebar
    /onboarding/page.tsx         # New org setup wizard
    /dashboard/page.tsx          # Main dashboard
    /partners/page.tsx           # All partners list
    /partners/new/page.tsx       # Create partner
    /partners/[id]/page.tsx      # Partner detail (tabbed)
    /team/page.tsx               # Team management
    /settings/page.tsx           # Org settings
```

---

## Phase 3: Build Order

### 3.1 Foundation
- [ ] New database schema migration
- [ ] Organization settings table + default creation on signup
- [ ] RLS policies for multi-tenancy
- [ ] Update auth flow to create org settings

### 3.2 Onboarding Flow
- [ ] Step 1: Partner label config
- [ ] Step 2: Default workstreams builder
- [ ] Step 3: Status config with colors
- [ ] Step 4: Team invite (optional)
- [ ] Save to organization_settings

### 3.3 Dashboard
- [ ] Stats bar (active partners, launching soon, at risk, overdue items)
- [ ] "Needs Attention" section
- [ ] Partner grid/list with filters
- [ ] Quick search

### 3.4 Partners List
- [ ] Table view with all partners
- [ ] Filters by status, health, owner
- [ ] Sort options
- [ ] Bulk actions
- [ ] CSV export

### 3.5 Partner Detail Page (Tabbed)
- [ ] Header: name, status, health, launch date
- [ ] Overview tab: details card, quick stats, activity feed
- [ ] Workstreams tab: Kanban board with drag-drop
- [ ] Timeline tab: Milestone visualization
- [ ] Risks tab: Risk table with severity badges
- [ ] Notes tab: Meeting notes with action items
- [ ] Updates tab: Status update generator

### 3.6 Add/Edit Partner
- [ ] Partner form
- [ ] Auto-create default workstreams option

### 3.7 Notes System
- [ ] Notes list view
- [ ] Note detail with action items checklist
- [ ] Add note modal
- [ ] Import from transcript modal

### 3.8 Status Update Generator
- [ ] Template system with variables
- [ ] Generate from partner data
- [ ] Copy to clipboard
- [ ] History of generated updates

### 3.9 Settings
- [ ] Organization settings (labels, statuses, health scale)
- [ ] Template editor
- [ ] Profile settings

### 3.10 Team Management
- [ ] Member list
- [ ] Invite flow
- [ ] Role management

### 3.11 Landing Page
- [ ] Hero section
- [ ] Features grid
- [ ] Pricing placeholder
- [ ] CTA buttons

---

## Phase 4: Components Needed

### UI Components
- StatusBadge (configurable colors)
- HealthIndicator (score visualization)
- KanbanBoard (drag-drop workstreams)
- TimelineView (milestones)
- RiskTable
- NoteCard
- ActionItemChecklist
- TemplateEditor
- StatsCard
- FilterBar
- DataTable (sortable, filterable)

### Shared Components
- AppSidebar
- PageHeader
- EmptyState
- LoadingSkeleton
- ConfirmDialog
- Toast notifications

---

## Design System

Keep the warm, professional aesthetic:
- Background: #FDFBF7 (warm off-white)
- Text: #1C1917 (warm black)
- Accent: #E54D2E (coral/vermillion)
- Success: #22C55E
- Warning: #F59E0B
- Danger: #EF4444
- Font: DM Sans + Instrument Serif

---

## API Routes

```
/api/organization/settings     GET, PATCH
/api/partners                  GET, POST
/api/partners/[id]             GET, PATCH, DELETE
/api/partners/[id]/workstreams GET, POST, PATCH, DELETE
/api/partners/[id]/milestones  GET, POST, PATCH, DELETE
/api/partners/[id]/risks       GET, POST, PATCH, DELETE
/api/partners/[id]/notes       GET, POST, PATCH, DELETE
/api/partners/[id]/generate    POST (generate status update)
/api/activity                  GET (with filters)
/api/team                      GET, POST (invites)
```

---

## Estimated Build Sequence

1. Database migration (new schema)
2. Onboarding flow
3. Dashboard (basic)
4. Partners list + add partner
5. Partner detail - Overview tab
6. Partner detail - Workstreams tab (Kanban)
7. Partner detail - Risks tab
8. Partner detail - Notes tab
9. Partner detail - Updates tab
10. Partner detail - Timeline tab
11. Settings pages
12. Team management
13. Landing page refresh
14. Activity logging
15. Polish + testing
