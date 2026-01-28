'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSettings, getHealthColor, getHealthWord } from '@/hooks/useSettings';
import {
  Plus, Rocket, AlertTriangle, Calendar, CheckCircle2,
  ArrowRight, Clock, Target, User, Users, FileText, Phone
} from 'lucide-react';
import { Partner, DashboardStats, Workstream } from '@/types';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

interface PartnerWithWorkstreams extends Partner {
  workstreams?: Workstream[];
}

export default function DashboardPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [partners, setPartners] = useState<PartnerWithWorkstreams[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_active: 0,
    launching_this_month: 0,
    at_risk_count: 0,
    overdue_action_items: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch partners
      const { data: partnersData } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (partnersData) {
        // Fetch workstreams for all partners
        const { data: workstreamsData } = await supabase
          .from('workstreams')
          .select('*')
          .eq('user_id', user.id);

        // Attach workstreams to partners
        const partnersWithWorkstreams = partnersData.map(partner => ({
          ...partner,
          workstreams: workstreamsData?.filter(w => w.partner_id === partner.id) || [],
        }));

        setPartners(partnersWithWorkstreams);

        // Calculate stats
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const healthMax = settings?.health_scale_max || 5;
        const atRiskThreshold = healthMax * 0.4;

        setStats({
          total_active: partnersData.length,
          launching_this_month: partnersData.filter(p => {
            if (!p.target_launch_date) return false;
            const launchDate = new Date(p.target_launch_date);
            return launchDate >= monthStart && launchDate <= monthEnd;
          }).length,
          at_risk_count: partnersData.filter(p => p.health_score <= atRiskThreshold).length,
          overdue_action_items: 0, // TODO: Calculate from notes
        });
      }

      setLoading(false);
    };
    fetchData();
  }, [supabase, settings]);

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const partnerLabel = settings?.partner_label || 'Partner';
  const partnerLabelPlural = settings?.partner_label_plural || 'Partners';
  const healthMax = settings?.health_scale_max || 5;

  // Get partners needing attention
  const needsAttention = partners.filter(p => {
    const healthPercent = (p.health_score / healthMax) * 100;
    const daysUntilLaunch = p.target_launch_date
      ? differenceInDays(new Date(p.target_launch_date), new Date())
      : null;
    return healthPercent <= 40 || (daysUntilLaunch !== null && daysUntilLaunch <= 14 && daysUntilLaunch >= 0);
  });

  const getStatusConfig = (status: string) => {
    // Check custom statuses first, then fall back to default
    const customStatus = settings?.statuses?.find(s => s.value === status);
    if (customStatus) return customStatus;

    // Default status colors for our new statuses
    const defaultStatuses: Record<string, { label: string; color: string }> = {
      'not_started': { label: 'Not Started', color: '#6B7280' },
      'initiation': { label: 'Initiation', color: '#8B5CF6' },
      'discovery': { label: 'Discovery', color: '#22C55E' },
      'configuration': { label: 'Configuration', color: '#F59E0B' },
      'internal_testing': { label: 'Internal Testing', color: '#22C55E' },
      'uat': { label: 'UAT', color: '#EAB308' },
      'go_no_go': { label: 'Go No Go', color: '#EAB308' },
      'soft_launch': { label: 'Soft Launch', color: '#F59E0B' },
      'live': { label: 'LIVE', color: '#22C55E' },
      'optimisation': { label: 'Optimisation', color: '#F97316' },
      'on_hold': { label: 'On Hold', color: '#EAB308' },
      'blocked': { label: 'Blocked', color: '#EF4444' },
      'closed': { label: 'Closed', color: '#6B7280' },
    };

    return defaultStatuses[status] || { label: status, color: '#6B7280' };
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Welcome back. Here's what's happening with your {partnerLabelPlural.toLowerCase()}.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label={`Active ${partnerLabelPlural}`}
          value={stats.total_active}
          color="var(--accent)"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Launching This Month"
          value={stats.launching_this_month}
          color="#3B82F6"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="At Risk"
          value={stats.at_risk_count}
          color={stats.at_risk_count > 0 ? '#EF4444' : '#22C55E'}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Overdue Items"
          value={stats.overdue_action_items}
          color={stats.overdue_action_items > 0 ? '#F59E0B' : '#22C55E'}
        />
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Needs Attention
            </h2>
          </div>
          <div className="grid gap-3">
            {needsAttention.slice(0, 3).map(partner => {
              const statusConfig = getStatusConfig(partner.status);
              const daysUntilLaunch = partner.target_launch_date
                ? differenceInDays(new Date(partner.target_launch_date), new Date())
                : null;

              return (
                <Link
                  key={partner.id}
                  href={`/partners/${partner.id}`}
                  className="flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.01] group"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ background: getHealthColor(partner.health_score, healthMax) }}
                    >
                      {partner.health_score}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {partner.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                        {daysUntilLaunch !== null && daysUntilLaunch <= 14 && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {daysUntilLaunch === 0 ? 'Launching today' :
                              daysUntilLaunch < 0 ? `${Math.abs(daysUntilLaunch)} days overdue` :
                                `${daysUntilLaunch} days until launch`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* All Partners */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            All {partnerLabelPlural}
          </h2>
          <Link
            href="/partners"
            className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {partners.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Rocket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No {partnerLabelPlural.toLowerCase()} yet
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Add your first {partnerLabel.toLowerCase()} to start tracking your launches.
            </p>
            <Link
              href="/partners/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Plus className="w-5 h-5" />
              Add your first {partnerLabel.toLowerCase()}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.slice(0, 6).map(partner => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                healthMax={healthMax}
                getStatusConfig={getStatusConfig}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
  pm: 'PM',
  aide: 'AIDE',
  csm: 'CSM',
  kms: 'KMS',
  ai_trainer: 'AI Trainer',
  account_executive: 'AE',
  solutions_architect: 'SA',
  technical_lead: 'Tech Lead',
  implementation_specialist: 'Impl Spec',
  other: '',
};

function PartnerCard({
  partner,
  healthMax,
  getStatusConfig,
}: {
  partner: PartnerWithWorkstreams;
  healthMax: number;
  getStatusConfig: (status: string) => { label: string; color: string };
}) {
  const statusConfig = getStatusConfig(partner.status);
  const daysUntilLaunch = partner.target_launch_date
    ? differenceInDays(new Date(partner.target_launch_date), new Date())
    : null;

  // Calculate workstream progress
  const totalWorkstreams = partner.workstreams?.length || 0;
  const completedWorkstreams = partner.workstreams?.filter(w => w.status === 'complete').length || 0;
  const progressPercent = totalWorkstreams > 0 ? (completedWorkstreams / totalWorkstreams) * 100 : 0;

  // Get custom fields
  const customFields = partner.custom_fields || {};
  const stakeholders = customFields.stakeholders || [];
  const discoveryScheduled = customFields.discovery_scheduled;
  const discoveryDate = customFields.discovery_date;
  const assignedDate = customFields.assigned_date;

  // Format stakeholders for display
  const formatStakeholder = (s: { name: string; role: string }) => {
    const roleLabel = ROLE_LABELS[s.role] || s.role;
    return roleLabel ? `${s.name} (${roleLabel})` : s.name;
  };

  return (
    <Link
      href={`/partners/${partner.id}`}
      className="p-5 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg group"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      {/* Header: Status & Health */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
        >
          {statusConfig.label}
        </div>
        <div className="text-right">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Health</div>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ background: getHealthColor(partner.health_score, healthMax) }}
          >
            {partner.health_score}
          </div>
        </div>
      </div>

      {/* Partner Name */}
      <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
        {partner.name}
      </h3>

      {/* Workstream Progress */}
      {totalWorkstreams > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-muted)' }}>Workstream Progress</span>
            <span style={{ color: 'var(--text-secondary)' }}>{completedWorkstreams}/{totalWorkstreams}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100 ? '#22C55E' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Info Table with Labels */}
      <div className="space-y-2 text-sm">
        {/* Launch Date */}
        {partner.target_launch_date && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Launch Date</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {format(new Date(partner.target_launch_date), 'MMM d, yyyy')}
              {daysUntilLaunch !== null && daysUntilLaunch >= 0 && (
                <span style={{ color: 'var(--text-muted)' }}> ({daysUntilLaunch}d)</span>
              )}
            </span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Last Sync</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {format(new Date(partner.updated_at), 'MMM d, yyyy')}
          </span>
        </div>

        {/* Contact */}
        {partner.primary_contact_name && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Contact</span>
            <span className="truncate ml-2" style={{ color: 'var(--text-primary)' }}>
              {partner.primary_contact_name}
            </span>
          </div>
        )}

        {/* Discovery Call */}
        {discoveryScheduled !== null && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Discovery Call</span>
            <span style={{ color: discoveryScheduled ? '#22C55E' : 'var(--text-secondary)' }}>
              {discoveryScheduled
                ? discoveryDate
                  ? format(new Date(discoveryDate), 'MMM d')
                  : 'Scheduled'
                : 'Not scheduled'}
            </span>
          </div>
        )}
      </div>

      {/* Assigned Team */}
      {Array.isArray(stakeholders) && stakeholders.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Assigned Team</div>
          <div className="flex flex-wrap gap-1.5">
            {stakeholders.slice(0, 4).map((s: { name: string; role: string }, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {formatStakeholder(s)}
              </span>
            ))}
            {stakeholders.length > 4 && (
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                +{stakeholders.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          0 notes
        </div>
        <ArrowRight
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--accent)' }}
        />
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
