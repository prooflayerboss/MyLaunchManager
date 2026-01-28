-- LaunchPad Multi-Tenant Schema
-- Run this in Supabase SQL Editor after the initial schema

-- Drop old tables (we're starting fresh with the new model)
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS dependencies CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ============================================
-- ORGANIZATION SETTINGS
-- ============================================
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Terminology customization
  partner_label TEXT DEFAULT 'Partner',
  partner_label_plural TEXT DEFAULT 'Partners',
  workstream_label TEXT DEFAULT 'Workstream',
  workstream_label_plural TEXT DEFAULT 'Workstreams',

  -- Status configuration
  statuses JSONB DEFAULT '[
    {"value": "discovery", "label": "Discovery", "color": "#8B5CF6"},
    {"value": "kickoff", "label": "Kickoff", "color": "#3B82F6"},
    {"value": "build", "label": "Build", "color": "#F59E0B"},
    {"value": "pilot", "label": "Pilot", "color": "#10B981"},
    {"value": "live", "label": "Live", "color": "#22C55E"},
    {"value": "paused", "label": "Paused", "color": "#6B7280"},
    {"value": "churned", "label": "Churned", "color": "#EF4444"}
  ]'::jsonb,

  -- Health scale
  health_scale_max INTEGER DEFAULT 5,

  -- Templates
  slack_update_template TEXT DEFAULT '{{partner_name}} - {{date}}
Status: {{status}} | Health: {{health_word}}

Updates:
{{recent_updates}}

Upcoming:
{{upcoming_milestones}}

Open Items:
{{open_action_items}}

Risks:
{{open_risks}}

{{closing}}',

  -- Default workstreams to create for new partners
  default_workstreams JSONB DEFAULT '[
    {"name": "Kickoff", "sort_order": 0},
    {"name": "Discovery & Requirements", "sort_order": 1},
    {"name": "Configuration", "sort_order": 2},
    {"name": "Integration", "sort_order": 3},
    {"name": "Training", "sort_order": 4},
    {"name": "UAT / Pilot", "sort_order": 5},
    {"name": "Go-Live", "sort_order": 6}
  ]'::jsonb,

  -- Onboarding completed flag
  onboarding_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARTNERS
-- ============================================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  status TEXT DEFAULT 'discovery',

  target_launch_date DATE,
  actual_launch_date DATE,

  health_score INTEGER DEFAULT 3 CHECK (health_score >= 1 AND health_score <= 10),

  primary_contact_name TEXT,
  primary_contact_email TEXT,
  external_channel TEXT, -- Slack channel, Teams link, etc.

  custom_fields JSONB DEFAULT '{}'::jsonb,

  archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKSTREAMS
-- ============================================
CREATE TYPE workstream_status AS ENUM ('not_started', 'in_progress', 'blocked', 'complete');

CREATE TABLE workstreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  status workstream_status DEFAULT 'not_started',

  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_external TEXT, -- For external owners not in the system

  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MILESTONES
-- ============================================
CREATE TYPE milestone_status AS ENUM ('upcoming', 'complete', 'missed', 'skipped');

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  target_date DATE NOT NULL,
  actual_date DATE,

  status milestone_status DEFAULT 'upcoming',
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RISKS
-- ============================================
CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE risk_status AS ENUM ('open', 'mitigated', 'accepted', 'closed');

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  severity risk_severity DEFAULT 'medium',
  status risk_status DEFAULT 'open',

  mitigation_plan TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTES (Meeting notes with action items)
-- ============================================
CREATE TYPE note_source AS ENUM ('manual', 'grain', 'fireflies', 'zoom', 'teams', 'other');

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,

  source note_source DEFAULT 'manual',

  raw_content TEXT,
  summary TEXT,

  -- Action items: [{id, item, owner, due_date, complete}]
  action_items JSONB DEFAULT '[]'::jsonb,

  -- Decisions: ["decision 1", "decision 2"]
  decisions JSONB DEFAULT '[]'::jsonb,

  -- Attendees: ["name 1", "name 2"]
  attendees JSONB DEFAULT '[]'::jsonb,

  external_link TEXT, -- URL to original recording/transcript

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GENERATED UPDATES
-- ============================================
CREATE TYPE update_type AS ENUM ('slack', 'email', 'deck_notes');

CREATE TABLE generated_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,

  update_type update_type DEFAULT 'slack',
  content TEXT NOT NULL,

  generated_at TIMESTAMPTZ DEFAULT NOW(),

  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TYPE activity_action AS ENUM (
  'created', 'updated', 'deleted', 'archived',
  'status_changed', 'health_changed',
  'workstream_added', 'workstream_updated', 'workstream_completed',
  'risk_added', 'risk_updated', 'risk_closed',
  'note_added', 'action_item_completed',
  'milestone_added', 'milestone_completed',
  'update_generated'
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,

  action activity_action NOT NULL,
  entity_type TEXT NOT NULL, -- partner, workstream, risk, note, etc.
  entity_id UUID,

  details JSONB DEFAULT '{}'::jsonb, -- Before/after for changes

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_partners_user ON partners(user_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_archived ON partners(archived);
CREATE INDEX idx_workstreams_partner ON workstreams(partner_id);
CREATE INDEX idx_workstreams_status ON workstreams(status);
CREATE INDEX idx_milestones_partner ON milestones(partner_id);
CREATE INDEX idx_risks_partner ON risks(partner_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_notes_partner ON notes(partner_id);
CREATE INDEX idx_activity_partner ON activity_log(partner_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Organization Settings: Users can only see/edit their own
CREATE POLICY "Users manage own settings" ON organization_settings
  FOR ALL USING (user_id = auth.uid());

-- Partners: Users can only see/manage their own
CREATE POLICY "Users manage own partners" ON partners
  FOR ALL USING (user_id = auth.uid());

-- Workstreams: Users can manage workstreams for their partners
CREATE POLICY "Users manage own workstreams" ON workstreams
  FOR ALL USING (user_id = auth.uid());

-- Milestones: Users can manage milestones for their partners
CREATE POLICY "Users manage own milestones" ON milestones
  FOR ALL USING (user_id = auth.uid());

-- Risks: Users can manage risks for their partners
CREATE POLICY "Users manage own risks" ON risks
  FOR ALL USING (user_id = auth.uid());

-- Notes: Users can manage notes for their partners
CREATE POLICY "Users manage own notes" ON notes
  FOR ALL USING (user_id = auth.uid());

-- Generated Updates: Users can manage their own
CREATE POLICY "Users manage own updates" ON generated_updates
  FOR ALL USING (user_id = auth.uid());

-- Activity Log: Users can view their own activity
CREATE POLICY "Users view own activity" ON activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users create own activity" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on partners
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update updated_at on workstreams
CREATE TRIGGER workstreams_updated_at
  BEFORE UPDATE ON workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update updated_at on risks
CREATE TRIGGER risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update updated_at on organization_settings
CREATE TRIGGER organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Create default settings for new user
-- ============================================
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You'll need to manually create this trigger in Supabase
-- as it references auth.users which requires special permissions
-- Go to SQL Editor and run:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION create_default_settings();
