-- =====================================================
-- Platform Expansion Migration
-- Adds: Teams, Templates, Comments, Activity, Tags,
--       Notifications, Custom Fields, API Keys
-- =====================================================

-- =====================================================
-- 1. TEAMS & MULTI-USER SUPPORT
-- =====================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  plan_seats INTEGER DEFAULT 3,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  UNIQUE(team_id, user_id)
);

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- Add team_id to existing tables
ALTER TABLE partners ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE workstreams ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- =====================================================
-- 2. TEMPLATES SYSTEM
-- =====================================================

-- Template categories
CREATE TABLE IF NOT EXISTS template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates (project plan templates, workstream templates, etc.)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('project_plan', 'workstreams', 'milestones', 'full_setup')),
  is_system BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  use_count INTEGER DEFAULT 0,
  preview_image_url TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. COMMENTS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Polymorphic association
  entity_type TEXT NOT NULL CHECK (entity_type IN ('partner', 'workstream', 'milestone', 'risk', 'note', 'project_task')),
  entity_id UUID NOT NULL,

  -- Comment content
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',

  -- Threading
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- Metadata
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- =====================================================
-- 4. ACTIVITY LOG (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,

  -- Change tracking
  old_value JSONB,
  new_value JSONB,
  details JSONB DEFAULT '{}',

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_team ON activity_log(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_partner ON activity_log(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);

-- =====================================================
-- 5. TAGS / LABELS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name),
  UNIQUE(user_id, name)
);

-- Junction table for partner tags
CREATE TABLE IF NOT EXISTS partner_tags (
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (partner_id, tag_id)
);

-- =====================================================
-- 6. NOTIFICATIONS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'mention', 'comment', 'assignment', 'due_date',
    'status_change', 'risk_alert', 'team_invite',
    'milestone_reminder', 'health_change', 'system'
  )),
  title TEXT NOT NULL,
  body TEXT,

  -- Links
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,

  -- Status
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Metadata
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- =====================================================
-- 7. CUSTOM FIELDS
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Field definition
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'number', 'date', 'select', 'multi_select',
    'checkbox', 'url', 'email', 'phone', 'currency'
  )),

  -- For select/multi_select types
  options JSONB DEFAULT '[]',

  -- Display settings
  required BOOLEAN DEFAULT FALSE,
  show_in_list BOOLEAN DEFAULT FALSE,
  show_in_card BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  -- Applies to which entity type
  entity_type TEXT NOT NULL DEFAULT 'partner' CHECK (entity_type IN ('partner', 'workstream', 'risk', 'note')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, slug, entity_type),
  UNIQUE(user_id, slug, entity_type)
);

-- =====================================================
-- 8. API KEYS (for integrations)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for display

  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read'],

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,

  -- Limits
  rate_limit INTEGER DEFAULT 1000, -- requests per hour

  -- Status
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. CLIENT PORTAL ACCESS
-- =====================================================

CREATE TABLE IF NOT EXISTS portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Access settings
  enabled BOOLEAN DEFAULT FALSE,
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- What they can see
  can_view_timeline BOOLEAN DEFAULT TRUE,
  can_view_workstreams BOOLEAN DEFAULT TRUE,
  can_view_milestones BOOLEAN DEFAULT TRUE,
  can_view_project_plan BOOLEAN DEFAULT TRUE,
  can_add_comments BOOLEAN DEFAULT FALSE,

  -- Contacts who have access (emails)
  allowed_emails TEXT[] DEFAULT '{}',

  -- Branding
  custom_logo_url TEXT,
  custom_message TEXT,

  -- Activity tracking
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. RECURRING TASKS
-- =====================================================

ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS next_occurrence DATE;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL;

-- =====================================================
-- 11. INTEGRATIONS CONFIG
-- =====================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Integration type
  provider TEXT NOT NULL CHECK (provider IN ('slack', 'google_calendar', 'outlook', 'salesforce', 'hubspot', 'jira', 'linear', 'zapier')),

  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Configuration
  settings JSONB DEFAULT '{}',
  webhook_url TEXT,

  -- Status
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, provider),
  UNIQUE(user_id, provider)
);

-- =====================================================
-- 12. SUBSCRIPTION & USAGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Usage type
  usage_type TEXT NOT NULL CHECK (usage_type IN ('ai_generation', 'export', 'api_call', 'storage')),

  -- Amount
  quantity INTEGER DEFAULT 1,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_team_period ON usage_records(team_id, period_start, period_end);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Teams: owners and members can view
CREATE POLICY teams_select ON teams FOR SELECT USING (
  owner_id = auth.uid() OR
  id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY teams_insert ON teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY teams_update ON teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY teams_delete ON teams FOR DELETE USING (owner_id = auth.uid());

-- Team members: team owners and admins can manage
CREATE POLICY team_members_select ON team_members FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY team_members_insert ON team_members FOR INSERT WITH CHECK (
  team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);
CREATE POLICY team_members_update ON team_members FOR UPDATE USING (
  team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);
CREATE POLICY team_members_delete ON team_members FOR DELETE USING (
  team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

-- Templates: public templates or own templates
CREATE POLICY templates_select ON templates FOR SELECT USING (
  is_public = TRUE OR
  created_by = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY templates_insert ON templates FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY templates_update ON templates FOR UPDATE USING (created_by = auth.uid() OR is_system = FALSE);
CREATE POLICY templates_delete ON templates FOR DELETE USING (created_by = auth.uid() AND is_system = FALSE);

-- Template categories: everyone can view system categories
CREATE POLICY template_categories_select ON template_categories FOR SELECT USING (TRUE);

-- Comments: team members can view and create
CREATE POLICY comments_select ON comments FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY comments_update ON comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY comments_delete ON comments FOR DELETE USING (user_id = auth.uid());

-- Activity log: team members can view
CREATE POLICY activity_log_select ON activity_log FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY activity_log_insert ON activity_log FOR INSERT WITH CHECK (user_id = auth.uid());

-- Tags: own tags or team tags
CREATE POLICY tags_select ON tags FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY tags_insert ON tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tags_update ON tags FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY tags_delete ON tags FOR DELETE USING (user_id = auth.uid());

-- Partner tags: based on partner access
CREATE POLICY partner_tags_select ON partner_tags FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY partner_tags_insert ON partner_tags FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY partner_tags_delete ON partner_tags FOR DELETE USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

-- Notifications: only own notifications
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (user_id = auth.uid());

-- Custom field definitions: own or team
CREATE POLICY custom_field_definitions_select ON custom_field_definitions FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY custom_field_definitions_insert ON custom_field_definitions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY custom_field_definitions_update ON custom_field_definitions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY custom_field_definitions_delete ON custom_field_definitions FOR DELETE USING (user_id = auth.uid());

-- API keys: only own
CREATE POLICY api_keys_select ON api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY api_keys_insert ON api_keys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY api_keys_update ON api_keys FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY api_keys_delete ON api_keys FOR DELETE USING (user_id = auth.uid());

-- Portal access: partner owners
CREATE POLICY portal_access_select ON portal_access FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY portal_access_insert ON portal_access FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY portal_access_update ON portal_access FOR UPDATE USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY portal_access_delete ON portal_access FOR DELETE USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

-- Integrations: own or team
CREATE POLICY integrations_select ON integrations FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY integrations_insert ON integrations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY integrations_update ON integrations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY integrations_delete ON integrations FOR DELETE USING (user_id = auth.uid());

-- Usage records: own or team
CREATE POLICY usage_records_select ON usage_records FOR SELECT USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY usage_records_insert ON usage_records FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- SEED DATA: Template Categories & System Templates
-- =====================================================

-- Insert template categories
INSERT INTO template_categories (name, slug, description, icon, sort_order) VALUES
  ('SaaS Onboarding', 'saas-onboarding', 'Templates for onboarding new SaaS customers', 'rocket', 1),
  ('Partner Enablement', 'partner-enablement', 'Templates for partner and channel programs', 'users', 2),
  ('Agency Clients', 'agency-clients', 'Templates for managing agency client projects', 'briefcase', 3),
  ('Product Launch', 'product-launch', 'Templates for launching new products', 'package', 4),
  ('Professional Services', 'professional-services', 'Templates for consulting and implementation', 'clipboard', 5),
  ('Custom', 'custom', 'User-created templates', 'folder', 99)
ON CONFLICT (slug) DO NOTHING;

-- Insert system templates
INSERT INTO templates (name, slug, description, template_type, is_system, is_public, data, settings) VALUES
-- SaaS Customer Onboarding
('Standard SaaS Onboarding', 'standard-saas-onboarding', 'A comprehensive onboarding flow for new SaaS customers', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Kickoff & Planning", "sort_order": 0},
    {"name": "Discovery & Requirements", "sort_order": 1},
    {"name": "Configuration & Setup", "sort_order": 2},
    {"name": "Integration", "sort_order": 3},
    {"name": "Data Migration", "sort_order": 4},
    {"name": "Training", "sort_order": 5},
    {"name": "UAT & Testing", "sort_order": 6},
    {"name": "Go-Live", "sort_order": 7}
  ],
  "milestones": [
    {"title": "Kickoff Complete", "days_from_start": 7},
    {"title": "Discovery Sign-off", "days_from_start": 21},
    {"title": "Configuration Complete", "days_from_start": 42},
    {"title": "Integration Testing Done", "days_from_start": 56},
    {"title": "Training Complete", "days_from_start": 70},
    {"title": "Go-Live", "days_from_start": 84}
  ],
  "statuses": [
    {"value": "kickoff", "label": "Kickoff", "color": "#8B5CF6"},
    {"value": "discovery", "label": "Discovery", "color": "#3B82F6"},
    {"value": "configuration", "label": "Configuration", "color": "#F59E0B"},
    {"value": "integration", "label": "Integration", "color": "#10B981"},
    {"value": "training", "label": "Training", "color": "#EC4899"},
    {"value": "uat", "label": "UAT", "color": "#6366F1"},
    {"value": "live", "label": "Live", "color": "#22C55E"},
    {"value": "paused", "label": "Paused", "color": "#6B7280"}
  ]
}',
'{"duration_weeks": 12, "industry": "saas", "complexity": "standard"}'),

-- Quick Start SaaS
('Quick Start Onboarding', 'quick-start-onboarding', 'Streamlined onboarding for simpler implementations', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Setup & Configuration", "sort_order": 0},
    {"name": "Training", "sort_order": 1},
    {"name": "Launch", "sort_order": 2}
  ],
  "milestones": [
    {"title": "Account Setup Complete", "days_from_start": 3},
    {"title": "Training Complete", "days_from_start": 7},
    {"title": "Go-Live", "days_from_start": 14}
  ],
  "statuses": [
    {"value": "setup", "label": "Setup", "color": "#3B82F6"},
    {"value": "training", "label": "Training", "color": "#F59E0B"},
    {"value": "live", "label": "Live", "color": "#22C55E"}
  ]
}',
'{"duration_weeks": 2, "industry": "saas", "complexity": "simple"}'),

-- Partner Enablement
('Channel Partner Onboarding', 'channel-partner-onboarding', 'Onboard and enable new channel partners', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Partner Agreement", "sort_order": 0},
    {"name": "Technical Enablement", "sort_order": 1},
    {"name": "Sales Training", "sort_order": 2},
    {"name": "Marketing Setup", "sort_order": 3},
    {"name": "First Deal Support", "sort_order": 4}
  ],
  "milestones": [
    {"title": "Agreement Signed", "days_from_start": 14},
    {"title": "Technical Certification", "days_from_start": 30},
    {"title": "Sales Ready", "days_from_start": 45},
    {"title": "First Deal Closed", "days_from_start": 90}
  ],
  "statuses": [
    {"value": "prospecting", "label": "Prospecting", "color": "#8B5CF6"},
    {"value": "contracting", "label": "Contracting", "color": "#3B82F6"},
    {"value": "enablement", "label": "Enablement", "color": "#F59E0B"},
    {"value": "active", "label": "Active", "color": "#22C55E"},
    {"value": "churned", "label": "Churned", "color": "#EF4444"}
  ]
}',
'{"duration_weeks": 12, "industry": "channel", "complexity": "standard"}'),

-- Agency Client
('Agency Client Project', 'agency-client-project', 'Manage agency client deliverables and timelines', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Discovery & Strategy", "sort_order": 0},
    {"name": "Creative Development", "sort_order": 1},
    {"name": "Client Review", "sort_order": 2},
    {"name": "Production", "sort_order": 3},
    {"name": "Launch & Reporting", "sort_order": 4}
  ],
  "milestones": [
    {"title": "Brief Approved", "days_from_start": 7},
    {"title": "Creative Concepts Presented", "days_from_start": 21},
    {"title": "Final Approval", "days_from_start": 35},
    {"title": "Launch", "days_from_start": 42}
  ],
  "statuses": [
    {"value": "briefing", "label": "Briefing", "color": "#8B5CF6"},
    {"value": "in_progress", "label": "In Progress", "color": "#3B82F6"},
    {"value": "review", "label": "Client Review", "color": "#F59E0B"},
    {"value": "approved", "label": "Approved", "color": "#22C55E"},
    {"value": "complete", "label": "Complete", "color": "#6B7280"}
  ]
}',
'{"duration_weeks": 6, "industry": "agency", "complexity": "standard"}'),

-- Product Launch
('Product Launch Checklist', 'product-launch-checklist', 'Coordinate cross-functional product launches', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Product Readiness", "sort_order": 0},
    {"name": "Marketing & Content", "sort_order": 1},
    {"name": "Sales Enablement", "sort_order": 2},
    {"name": "Customer Success Prep", "sort_order": 3},
    {"name": "Technical Documentation", "sort_order": 4},
    {"name": "Launch Execution", "sort_order": 5}
  ],
  "milestones": [
    {"title": "Feature Freeze", "days_from_start": 14},
    {"title": "Beta Complete", "days_from_start": 28},
    {"title": "GTM Ready", "days_from_start": 42},
    {"title": "Launch Day", "days_from_start": 56}
  ],
  "statuses": [
    {"value": "planning", "label": "Planning", "color": "#8B5CF6"},
    {"value": "building", "label": "Building", "color": "#3B82F6"},
    {"value": "beta", "label": "Beta", "color": "#F59E0B"},
    {"value": "ready", "label": "Launch Ready", "color": "#10B981"},
    {"value": "launched", "label": "Launched", "color": "#22C55E"}
  ]
}',
'{"duration_weeks": 8, "industry": "product", "complexity": "complex"}'),

-- Professional Services
('Enterprise Implementation', 'enterprise-implementation', 'Complex enterprise software implementations', 'full_setup', TRUE, TRUE,
'{
  "workstreams": [
    {"name": "Project Initiation", "sort_order": 0},
    {"name": "Business Analysis", "sort_order": 1},
    {"name": "Solution Design", "sort_order": 2},
    {"name": "Development & Configuration", "sort_order": 3},
    {"name": "Integration", "sort_order": 4},
    {"name": "Testing & QA", "sort_order": 5},
    {"name": "Training & Change Management", "sort_order": 6},
    {"name": "Deployment", "sort_order": 7},
    {"name": "Hypercare", "sort_order": 8}
  ],
  "milestones": [
    {"title": "Project Charter Signed", "days_from_start": 14},
    {"title": "Requirements Baselined", "days_from_start": 42},
    {"title": "Design Approved", "days_from_start": 70},
    {"title": "Development Complete", "days_from_start": 126},
    {"title": "UAT Sign-off", "days_from_start": 154},
    {"title": "Go-Live", "days_from_start": 168},
    {"title": "Project Closure", "days_from_start": 182}
  ],
  "statuses": [
    {"value": "initiation", "label": "Initiation", "color": "#8B5CF6"},
    {"value": "analysis", "label": "Analysis", "color": "#3B82F6"},
    {"value": "design", "label": "Design", "color": "#EC4899"},
    {"value": "build", "label": "Build", "color": "#F59E0B"},
    {"value": "test", "label": "Test", "color": "#6366F1"},
    {"value": "deploy", "label": "Deploy", "color": "#10B981"},
    {"value": "live", "label": "Live", "color": "#22C55E"},
    {"value": "closed", "label": "Closed", "color": "#6B7280"}
  ]
}',
'{"duration_weeks": 26, "industry": "enterprise", "complexity": "complex"}')

ON CONFLICT (slug) DO NOTHING;

-- Update templates with category references
UPDATE templates SET category_id = (SELECT id FROM template_categories WHERE slug = 'saas-onboarding')
WHERE slug IN ('standard-saas-onboarding', 'quick-start-onboarding');

UPDATE templates SET category_id = (SELECT id FROM template_categories WHERE slug = 'partner-enablement')
WHERE slug = 'channel-partner-onboarding';

UPDATE templates SET category_id = (SELECT id FROM template_categories WHERE slug = 'agency-clients')
WHERE slug = 'agency-client-project';

UPDATE templates SET category_id = (SELECT id FROM template_categories WHERE slug = 'product-launch')
WHERE slug = 'product-launch-checklist';

UPDATE templates SET category_id = (SELECT id FROM template_categories WHERE slug = 'professional-services')
WHERE slug = 'enterprise-implementation';
