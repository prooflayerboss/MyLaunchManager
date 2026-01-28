'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OrganizationSettings } from '@/types';

const DEFAULT_SETTINGS: Partial<OrganizationSettings> = {
  partner_label: 'Partner',
  partner_label_plural: 'Partners',
  workstream_label: 'Workstream',
  workstream_label_plural: 'Workstreams',
  statuses: [
    { value: 'discovery', label: 'Discovery', color: '#8B5CF6' },
    { value: 'kickoff', label: 'Kickoff', color: '#3B82F6' },
    { value: 'build', label: 'Build', color: '#F59E0B' },
    { value: 'pilot', label: 'Pilot', color: '#10B981' },
    { value: 'live', label: 'Live', color: '#22C55E' },
    { value: 'paused', label: 'Paused', color: '#6B7280' },
    { value: 'churned', label: 'Churned', color: '#EF4444' },
  ],
  health_scale_max: 5,
  default_workstreams: [
    { name: 'Kickoff', sort_order: 0 },
    { name: 'Discovery & Requirements', sort_order: 1 },
    { name: 'Configuration', sort_order: 2 },
    { name: 'Integration', sort_order: 3 },
    { name: 'Training', sort_order: 4 },
    { name: 'UAT / Pilot', sort_order: 5 },
    { name: 'Go-Live', sort_order: 6 },
  ],
  onboarding_completed: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default
        const { data: newSettings } = await supabase
          .from('organization_settings')
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
          .select()
          .single();
        setSettings(newSettings);
      } else if (data) {
        // Merge with defaults to fill in any missing fields
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...data,
          // Ensure arrays use defaults if empty/null
          statuses: data.statuses?.length ? data.statuses : DEFAULT_SETTINGS.statuses,
          default_workstreams: data.default_workstreams?.length ? data.default_workstreams : DEFAULT_SETTINGS.default_workstreams,
        } as OrganizationSettings;
        setSettings(mergedSettings);
      }

      setLoading(false);
    };

    fetchSettings();
  }, [supabase]);

  const updateSettings = async (updates: Partial<OrganizationSettings>) => {
    if (!settings) return;

    const { data, error } = await supabase
      .from('organization_settings')
      .update(updates)
      .eq('id', settings.id)
      .select()
      .single();

    if (!error && data) {
      setSettings(data);
    }

    return { data, error };
  };

  return { settings, loading, updateSettings };
}

export function getHealthWord(score: number, max: number = 5): string {
  const percentage = (score / max) * 100;
  if (percentage <= 20) return 'Critical';
  if (percentage <= 40) return 'At Risk';
  if (percentage <= 60) return 'Needs Attention';
  if (percentage <= 80) return 'On Track';
  return 'Strong';
}

export function getHealthColor(score: number, max: number = 5): string {
  const percentage = (score / max) * 100;
  if (percentage <= 20) return '#EF4444';
  if (percentage <= 40) return '#F97316';
  if (percentage <= 60) return '#F59E0B';
  if (percentage <= 80) return '#22C55E';
  return '#10B981';
}
