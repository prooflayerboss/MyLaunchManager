'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ActivityLogEntry, ActivityAction } from '@/types';

interface UseActivityOptions {
  partnerId?: string;
  limit?: number;
}

export function useActivity(options: UseActivityOptions = {}) {
  const { partnerId, limit = 50 } = options;
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();

  const fetchActivities = useCallback(async (offset = 0) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data } = await query;

    if (data) {
      if (offset === 0) {
        setActivities(data);
      } else {
        setActivities(prev => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
    }
    setLoading(false);
  }, [supabase, partnerId, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const loadMore = useCallback(() => {
    fetchActivities(activities.length);
  }, [fetchActivities, activities.length]);

  const logActivity = useCallback(async ({
    action,
    entityType,
    entityId,
    entityName,
    partnerId: activityPartnerId,
    oldValue,
    newValue,
    details = {},
  }: {
    action: ActivityAction;
    entityType: string;
    entityId?: string;
    entityName?: string;
    partnerId?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    details?: Record<string, any>;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        partner_id: activityPartnerId || partnerId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        old_value: oldValue,
        new_value: newValue,
        details,
      })
      .select()
      .single();

    if (!error && data) {
      setActivities(prev => [data, ...prev]);
    }

    return { data, error };
  }, [supabase, partnerId]);

  return {
    activities,
    loading,
    hasMore,
    loadMore,
    logActivity,
    refresh: () => fetchActivities(0),
  };
}

// Helper to format activity messages
export function formatActivityMessage(activity: ActivityLogEntry): string {
  const { action, entity_type, entity_name, details } = activity;

  const entityLabel = entity_name || entity_type;

  switch (action) {
    case 'created':
      return `created ${entityLabel}`;
    case 'updated':
      return `updated ${entityLabel}`;
    case 'deleted':
      return `deleted ${entityLabel}`;
    case 'archived':
      return `archived ${entityLabel}`;
    case 'status_changed':
      return `changed status of ${entityLabel} to ${details.new_status}`;
    case 'health_changed':
      return `updated health score to ${details.new_score}`;
    case 'workstream_added':
      return `added workstream "${entityLabel}"`;
    case 'workstream_updated':
      return `updated workstream "${entityLabel}"`;
    case 'workstream_completed':
      return `completed workstream "${entityLabel}"`;
    case 'risk_added':
      return `added risk "${entityLabel}"`;
    case 'risk_updated':
      return `updated risk "${entityLabel}"`;
    case 'risk_closed':
      return `closed risk "${entityLabel}"`;
    case 'note_added':
      return `added note "${entityLabel}"`;
    case 'action_item_completed':
      return `completed action item`;
    case 'milestone_added':
      return `added milestone "${entityLabel}"`;
    case 'milestone_completed':
      return `completed milestone "${entityLabel}"`;
    case 'update_generated':
      return `generated ${details.update_type || ''} update`;
    case 'comment_added':
      return `commented on ${entityLabel}`;
    case 'member_invited':
      return `invited ${details.email} to the team`;
    case 'member_joined':
      return `joined the team`;
    case 'member_removed':
      return `removed ${details.email} from the team`;
    case 'template_applied':
      return `applied template "${entityLabel}"`;
    case 'portal_enabled':
      return `enabled client portal for ${entityLabel}`;
    case 'integration_connected':
      return `connected ${details.provider} integration`;
    default:
      return `performed action on ${entityLabel}`;
  }
}
