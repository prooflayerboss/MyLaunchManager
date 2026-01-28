'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings, getHealthColor, getHealthWord } from '@/hooks/useSettings';
import {
  ArrowLeft, Calendar, User, Mail, ExternalLink, MoreHorizontal,
  Edit2, Archive, Trash2, Plus, Check, X, GripVertical,
  AlertTriangle, FileText, Clock, Target, ChevronRight
} from 'lucide-react';
import { Partner, Workstream, Milestone, Risk, Note, WorkstreamStatus } from '@/types';
import { format, differenceInDays } from 'date-fns';

type Tab = 'overview' | 'workstreams' | 'timeline' | 'risks' | 'notes' | 'updates';

const WORKSTREAM_COLUMNS: { status: WorkstreamStatus; label: string; color: string }[] = [
  { status: 'not_started', label: 'Not Started', color: '#6B7280' },
  { status: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { status: 'blocked', label: 'Blocked', color: '#EF4444' },
  { status: 'complete', label: 'Complete', color: '#22C55E' },
];

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;
  const supabase = createClient();
  const { settings } = useSettings();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingHealth, setEditingHealth] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch partner
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .eq('user_id', user.id)
        .single();

      if (!partnerData) {
        router.push('/partners');
        return;
      }
      setPartner(partnerData);

      // Fetch workstreams
      const { data: workstreamsData } = await supabase
        .from('workstreams')
        .select('*')
        .eq('partner_id', partnerId)
        .order('sort_order');
      setWorkstreams(workstreamsData || []);

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('partner_id', partnerId)
        .order('sort_order');
      setMilestones(milestonesData || []);

      // Fetch risks
      const { data: risksData } = await supabase
        .from('risks')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      setRisks(risksData || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('partner_id', partnerId)
        .order('meeting_date', { ascending: false });
      setNotes(notesData || []);

      setLoading(false);
    };
    fetchData();
  }, [partnerId, router, supabase]);

  const updatePartner = useCallback(async (updates: Partial<Partner>) => {
    if (!partner) return;
    const { error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', partner.id);
    if (!error) {
      setPartner({ ...partner, ...updates });
    }
  }, [partner, supabase]);

  const updateWorkstreamStatus = useCallback(async (workstreamId: string, newStatus: WorkstreamStatus) => {
    const { error } = await supabase
      .from('workstreams')
      .update({ status: newStatus })
      .eq('id', workstreamId);
    if (!error) {
      setWorkstreams(prev => prev.map(ws =>
        ws.id === workstreamId ? { ...ws, status: newStatus } : ws
      ));
    }
  }, [supabase]);

  if (loading || !partner) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const partnerLabel = settings?.partner_label || 'Partner';
  const workstreamLabel = settings?.workstream_label || 'Workstream';
  const workstreamLabelPlural = settings?.workstream_label_plural || 'Workstreams';
  const healthMax = settings?.health_scale_max || 5;

  const getStatusConfig = (status: string) => {
    return settings?.statuses?.find(s => s.value === status) || { label: status, color: '#6B7280' };
  };

  const statusConfig = getStatusConfig(partner.status);
  const daysUntilLaunch = partner.target_launch_date
    ? differenceInDays(new Date(partner.target_launch_date), new Date())
    : null;

  const completedWorkstreams = workstreams.filter(ws => ws.status === 'complete').length;
  const openRisks = risks.filter(r => r.status === 'open').length;
  const openActionItems = notes.reduce((count, note) =>
    count + (note.action_items?.filter(ai => !ai.complete).length || 0), 0);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'workstreams', label: workstreamLabelPlural, count: workstreams.length },
    { id: 'timeline', label: 'Timeline', count: milestones.length },
    { id: 'risks', label: 'Risks', count: openRisks },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'updates', label: 'Updates' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/partners"
          className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {settings?.partner_label_plural?.toLowerCase() || 'partners'}
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: getHealthColor(partner.health_score, healthMax) }}
            >
              {partner.health_score}
            </div>
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {partner.name}
              </h1>
              <div className="flex items-center gap-3">
                {/* Status */}
                <button
                  onClick={() => setEditingStatus(!editingStatus)}
                  className="px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                >
                  {statusConfig.label}
                </button>

                {/* Launch date */}
                {partner.target_launch_date && (
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Calendar className="w-4 h-4" />
                    {daysUntilLaunch !== null && daysUntilLaunch >= 0
                      ? `${daysUntilLaunch} days to launch`
                      : format(new Date(partner.target_launch_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-muted)' }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status edit dropdown */}
        {editingStatus && (
          <div
            className="absolute mt-2 w-48 rounded-xl shadow-lg py-2 z-50"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            {settings?.statuses?.map(s => (
              <button
                key={s.value}
                onClick={() => {
                  updatePartner({ status: s.value });
                  setEditingStatus(false);
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-gray-50"
              >
                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? '' : 'hover:bg-white/50'}`}
            style={{
              background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: activeTab === tab.id ? 'var(--accent-soft)' : 'var(--bg-primary)', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Stats */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {completedWorkstreams}/{workstreams.length}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {workstreamLabelPlural} complete
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: openRisks > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                      {openRisks}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Open risks</div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: openActionItems > 0 ? '#F59E0B' : 'var(--text-primary)' }}>
                      {openActionItems}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Open action items</div>
                  </div>
                </div>

                {/* Health slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Health Score
                    </span>
                    <span className="text-sm font-semibold" style={{ color: getHealthColor(partner.health_score, healthMax) }}>
                      {getHealthWord(partner.health_score, healthMax)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={healthMax}
                    value={partner.health_score}
                    onChange={(e) => updatePartner({ health_score: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Critical</span>
                    <span>Strong</span>
                  </div>
                </div>

                {/* Workstream progress */}
                {workstreams.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {workstreamLabel} Progress
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {Math.round((completedWorkstreams / workstreams.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(completedWorkstreams / workstreams.length) * 100}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-4">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Contact</h3>
                {partner.primary_contact_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{partner.primary_contact_name}</span>
                  </div>
                )}
                {partner.primary_contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <a
                      href={`mailto:${partner.primary_contact_email}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      {partner.primary_contact_email}
                    </a>
                  </div>
                )}
                {partner.external_channel && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <a
                      href={partner.external_channel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                      style={{ color: 'var(--accent)' }}
                    >
                      External channel
                    </a>
                  </div>
                )}
                {partner.target_launch_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>
                      {format(new Date(partner.target_launch_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workstreams Tab - Kanban */}
        {activeTab === 'workstreams' && (
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4">
              {WORKSTREAM_COLUMNS.map(column => (
                <div key={column.status}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {column.label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      {workstreams.filter(ws => ws.status === column.status).length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[200px] p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    {workstreams
                      .filter(ws => ws.status === column.status)
                      .map(ws => (
                        <div
                          key={ws.id}
                          className="p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                        >
                          <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                            {ws.name}
                          </div>
                          {ws.due_date && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <Calendar className="w-3 h-3" />
                              {format(new Date(ws.due_date), 'MMM d')}
                            </div>
                          )}
                          {/* Quick status change */}
                          <div className="flex gap-1 mt-2">
                            {WORKSTREAM_COLUMNS.filter(c => c.status !== ws.status).slice(0, 2).map(c => (
                              <button
                                key={c.status}
                                onClick={() => updateWorkstreamStatus(ws.id, c.status)}
                                className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                                style={{ background: `${c.color}20`, color: c.color }}
                              >
                                {c.status === 'complete' ? 'Done' : c.status === 'blocked' ? 'Block' : 'Start'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks Tab */}
        {activeTab === 'risks' && (
          <div className="p-6">
            {risks.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No risks tracked yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {risks.map(risk => (
                  <div
                    key={risk.id}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                            style={{
                              background: risk.severity === 'critical' ? '#FEE2E2' :
                                risk.severity === 'high' ? '#FEF3C7' :
                                  risk.severity === 'medium' ? '#E0F2FE' : '#F0FDF4',
                              color: risk.severity === 'critical' ? '#DC2626' :
                                risk.severity === 'high' ? '#D97706' :
                                  risk.severity === 'medium' ? '#0284C7' : '#16A34A',
                            }}
                          >
                            {risk.severity}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: risk.status === 'open' ? 'var(--accent-soft)' : 'var(--bg-primary)',
                              color: risk.status === 'open' ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {risk.status}
                          </span>
                        </div>
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{risk.title}</h4>
                        {risk.description && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{risk.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="p-6">
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{note.title}</h4>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(note.meeting_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {note.summary && (
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{note.summary}</p>
                    )}
                    {note.action_items && note.action_items.length > 0 && (
                      <div className="space-y-1">
                        {note.action_items.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.complete ? 'bg-green-500 border-green-500' : ''}`}
                              style={{ borderColor: item.complete ? '#22C55E' : 'var(--border)' }}
                            >
                              {item.complete && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span style={{ color: item.complete ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.complete ? 'line-through' : 'none' }}>
                              {item.item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="p-6 text-center py-12">
            <Target className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Generate status updates for stakeholders</p>
            <button
              className="px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Generate Update
            </button>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="p-6 text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>
              {milestones.length === 0 ? 'No milestones yet' : `${milestones.length} milestones`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
