'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings, getHealthColor, getHealthWord } from '@/hooks/useSettings';
import {
  ArrowLeft, Calendar, User, Mail, ExternalLink, MoreHorizontal,
  Edit2, Archive, Trash2, Plus, Check, X, GripVertical,
  AlertTriangle, FileText, Clock, Target, ChevronRight, Copy,
  Sparkles, Send, CheckCircle2, Upload, MessageSquare, CalendarCheck,
  FileBarChart, RefreshCw
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

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;
const RISK_STATUS_OPTIONS = ['open', 'mitigated', 'accepted', 'closed'] as const;

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
  const [editingStatus, setEditingStatus] = useState(false);

  // Modal states
  const [showWorkstreamModal, setShowWorkstreamModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingWorkstream, setEditingWorkstream] = useState<Workstream | null>(null);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Update generator
  const [generatedUpdate, setGeneratedUpdate] = useState('');
  const [generatingUpdate, setGeneratingUpdate] = useState(false);
  const [updateCopied, setUpdateCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const { data: workstreamsData } = await supabase
        .from('workstreams')
        .select('*')
        .eq('partner_id', partnerId)
        .order('sort_order');
      setWorkstreams(workstreamsData || []);

      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('partner_id', partnerId)
        .order('sort_order');
      setMilestones(milestonesData || []);

      const { data: risksData } = await supabase
        .from('risks')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      setRisks(risksData || []);

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

  // Generate AI-powered status update
  const generateUpdate = useCallback(async (updateType: string = 'general', selectedNoteId?: string) => {
    if (!partner || !settings) return;

    setGeneratingUpdate(true);
    setGeneratedUpdate('');

    try {
      const response = await fetch('/api/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner,
          notes,
          workstreams,
          risks,
          milestones,
          settings,
          updateType,
          selectedNoteId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('AI update failed:', result.error);
        const statusConfig = settings.statuses?.find(s => s.value === partner.status);
        const healthWord = getHealthWord(partner.health_score, settings.health_scale_max || 5);
        setGeneratedUpdate(`${partner.name} - ${format(new Date(), 'MMM d, yyyy')}
Status: ${statusConfig?.label || partner.status} | Health: ${healthWord}

⚠️ AI generation unavailable. Add ANTHROPIC_API_KEY to enable smart updates.

Recent Notes: ${notes.length} recorded
Open Risks: ${risks.filter(r => r.status === 'open').length}
Workstreams: ${workstreams.filter(w => w.status === 'complete').length}/${workstreams.length} complete`);
      } else {
        setGeneratedUpdate(result.update);
      }
    } catch (error) {
      console.error('Failed to generate update:', error);
      setGeneratedUpdate('Failed to generate update. Please try again.');
    }

    setGeneratingUpdate(false);
  }, [partner, settings, notes, risks, milestones, workstreams]);

  const copyUpdate = async () => {
    await navigator.clipboard.writeText(generatedUpdate);
    setUpdateCopied(true);
    setTimeout(() => setUpdateCopied(false), 2000);
  };

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
                <div className="relative">
                  <button
                    onClick={() => setEditingStatus(!editingStatus)}
                    className="px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </button>
                  {editingStatus && (
                    <div
                      className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-lg py-2 z-50"
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
        </div>
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
          <OverviewTab
            partner={partner}
            workstreams={workstreams}
            risks={risks}
            notes={notes}
            settings={settings}
            healthMax={healthMax}
            workstreamLabel={workstreamLabel}
            workstreamLabelPlural={workstreamLabelPlural}
            completedWorkstreams={completedWorkstreams}
            openRisks={openRisks}
            openActionItems={openActionItems}
            updatePartner={updatePartner}
          />
        )}

        {/* Workstreams Tab */}
        {activeTab === 'workstreams' && (
          <WorkstreamsTab
            workstreams={workstreams}
            setWorkstreams={setWorkstreams}
            updateWorkstreamStatus={updateWorkstreamStatus}
            partnerId={partnerId}
            supabase={supabase}
            workstreamLabel={workstreamLabel}
            showModal={showWorkstreamModal}
            setShowModal={setShowWorkstreamModal}
            editingItem={editingWorkstream}
            setEditingItem={setEditingWorkstream}
          />
        )}

        {/* Risks Tab */}
        {activeTab === 'risks' && (
          <RisksTab
            risks={risks}
            setRisks={setRisks}
            partnerId={partnerId}
            supabase={supabase}
            showModal={showRiskModal}
            setShowModal={setShowRiskModal}
            editingItem={editingRisk}
            setEditingItem={setEditingRisk}
          />
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            setNotes={setNotes}
            partnerId={partnerId}
            supabase={supabase}
            showModal={showNoteModal}
            setShowModal={setShowNoteModal}
            editingItem={editingNote}
            setEditingItem={setEditingNote}
          />
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <UpdatesTab
            generatedUpdate={generatedUpdate}
            generatingUpdate={generatingUpdate}
            generateUpdate={generateUpdate}
            copyUpdate={copyUpdate}
            updateCopied={updateCopied}
            partner={partner}
            notes={notes}
          />
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <TimelineTab milestones={milestones} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  partner, workstreams, risks, notes, settings, healthMax,
  workstreamLabel, workstreamLabelPlural, completedWorkstreams,
  openRisks, openActionItems, updatePartner
}: any) {
  return (
    <div className="p-6">
      <div className="grid lg:grid-cols-3 gap-6">
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
              <a href={`mailto:${partner.primary_contact_email}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                {partner.primary_contact_email}
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
  );
}

// Workstreams Tab Component
function WorkstreamsTab({
  workstreams, setWorkstreams, updateWorkstreamStatus, partnerId, supabase,
  workstreamLabel, showModal, setShowModal, editingItem, setEditingItem
}: any) {
  const [formData, setFormData] = useState({ name: '', due_date: '', notes: '' });

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingItem) {
      const { error } = await supabase
        .from('workstreams')
        .update({
          name: formData.name,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        })
        .eq('id', editingItem.id);
      if (!error) {
        setWorkstreams((prev: Workstream[]) => prev.map(ws =>
          ws.id === editingItem.id ? { ...ws, ...formData } : ws
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('workstreams')
        .insert({
          user_id: user.id,
          partner_id: partnerId,
          name: formData.name,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
          sort_order: workstreams.length,
        })
        .select()
        .single();
      if (!error && data) {
        setWorkstreams((prev: Workstream[]) => [...prev, data]);
      }
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workstream?')) return;
    const { error } = await supabase.from('workstreams').delete().eq('id', id);
    if (!error) {
      setWorkstreams((prev: Workstream[]) => prev.filter(ws => ws.id !== id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: '', due_date: '', notes: '' });
  };

  const openEdit = (ws: Workstream) => {
    setEditingItem(ws);
    setFormData({
      name: ws.name,
      due_date: ws.due_date || '',
      notes: ws.notes || '',
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {workstreamLabel} Board
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add {workstreamLabel}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {WORKSTREAM_COLUMNS.map(column => (
          <div key={column.status}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {column.label}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {workstreams.filter((ws: Workstream) => ws.status === column.status).length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px] p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              {workstreams
                .filter((ws: Workstream) => ws.status === column.status)
                .map((ws: Workstream) => (
                  <div
                    key={ws.id}
                    className="p-3 rounded-lg group"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div
                        className="font-medium text-sm cursor-pointer hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => openEdit(ws)}
                      >
                        {ws.name}
                      </div>
                      <button
                        onClick={() => handleDelete(ws.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                    {ws.due_date && (
                      <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(ws.due_date), 'MMM d')}
                      </div>
                    )}
                    <div className="flex gap-1">
                      {WORKSTREAM_COLUMNS.filter(c => c.status !== ws.status).slice(0, 2).map(c => (
                        <button
                          key={c.status}
                          onClick={() => updateWorkstreamStatus(ws.id, c.status)}
                          className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                          style={{ background: `${c.color}20`, color: c.color }}
                        >
                          {c.status === 'complete' ? 'Done' : c.status === 'blocked' ? 'Block' : c.status === 'in_progress' ? 'Start' : 'Reset'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editingItem ? 'Edit Workstream' : 'Add Workstream'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Risks Tab Component
function RisksTab({
  risks, setRisks, partnerId, supabase, showModal, setShowModal, editingItem, setEditingItem
}: any) {
  const [formData, setFormData] = useState({
    title: '', description: '', severity: 'medium' as typeof SEVERITY_OPTIONS[number],
    status: 'open' as typeof RISK_STATUS_OPTIONS[number], mitigation_plan: ''
  });

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingItem) {
      const { error } = await supabase
        .from('risks')
        .update(formData)
        .eq('id', editingItem.id);
      if (!error) {
        setRisks((prev: Risk[]) => prev.map(r =>
          r.id === editingItem.id ? { ...r, ...formData } : r
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('risks')
        .insert({ user_id: user.id, partner_id: partnerId, ...formData })
        .select()
        .single();
      if (!error && data) {
        setRisks((prev: Risk[]) => [data, ...prev]);
      }
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this risk?')) return;
    const { error } = await supabase.from('risks').delete().eq('id', id);
    if (!error) {
      setRisks((prev: Risk[]) => prev.filter(r => r.id !== id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ title: '', description: '', severity: 'medium', status: 'open', mitigation_plan: '' });
  };

  const openEdit = (risk: Risk) => {
    setEditingItem(risk);
    setFormData({
      title: risk.title,
      description: risk.description || '',
      severity: risk.severity,
      status: risk.status,
      mitigation_plan: risk.mitigation_plan || '',
    });
    setShowModal(true);
  };

  const getSeverityStyle = (severity: string) => ({
    background: severity === 'critical' ? '#FEE2E2' : severity === 'high' ? '#FEF3C7' : severity === 'medium' ? '#E0F2FE' : '#F0FDF4',
    color: severity === 'critical' ? '#DC2626' : severity === 'high' ? '#D97706' : severity === 'medium' ? '#0284C7' : '#16A34A',
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Risks</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add Risk
        </button>
      </div>

      {risks.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No risks tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk: Risk) => (
            <div
              key={risk.id}
              className="p-4 rounded-xl group"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                      style={getSeverityStyle(risk.severity)}
                    >
                      {risk.severity}
                    </span>
                    <select
                      value={risk.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as typeof RISK_STATUS_OPTIONS[number];
                        await supabase.from('risks').update({ status: newStatus }).eq('id', risk.id);
                        setRisks((prev: Risk[]) => prev.map(r => r.id === risk.id ? { ...r, status: newStatus } : r));
                      }}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: risk.status === 'open' ? 'var(--accent-soft)' : 'var(--bg-primary)',
                        color: risk.status === 'open' ? 'var(--accent)' : 'var(--text-muted)',
                        border: 'none',
                      }}
                    >
                      {RISK_STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <h4
                    className="font-medium cursor-pointer hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => openEdit(risk)}
                  >
                    {risk.title}
                  </h4>
                  {risk.description && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{risk.description}</p>
                  )}
                  {risk.mitigation_plan && (
                    <p className="text-sm mt-2 p-2 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                      <strong>Mitigation:</strong> {risk.mitigation_plan}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(risk.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingItem ? 'Edit Risk' : 'Add Risk'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {SEVERITY_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {RISK_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Mitigation Plan</label>
              <textarea
                value={formData.mitigation_plan}
                onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="How will this risk be mitigated?"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Notes Tab Component
function NotesTab({
  notes, setNotes, partnerId, supabase, showModal, setShowModal, editingItem, setEditingItem
}: any) {
  const [formData, setFormData] = useState({
    title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'), summary: '',
    raw_content: '', action_items: [] as { id: string; item: string; owner: string; complete: boolean }[]
  });
  const [newActionItem, setNewActionItem] = useState({ item: '', owner: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (!response.ok) {
        setUploadError(result.error || 'Failed to parse document');
        setUploading(false);
        return;
      }

      // Append to existing content or set new
      setFormData(prev => ({
        ...prev,
        raw_content: prev.raw_content
          ? prev.raw_content + '\n\n--- Uploaded: ' + file.name + ' ---\n\n' + result.text
          : result.text,
        // Auto-set title from filename if empty
        title: prev.title || file.name.replace(/\.(pdf|docx|txt)$/i, ''),
      }));
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.');
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const noteData = {
      title: formData.title,
      meeting_date: formData.meeting_date,
      summary: formData.summary || null,
      raw_content: formData.raw_content || null,
      action_items: formData.action_items,
    };

    if (editingItem) {
      const { error } = await supabase.from('notes').update(noteData).eq('id', editingItem.id);
      if (!error) {
        setNotes((prev: Note[]) => prev.map(n => n.id === editingItem.id ? { ...n, ...noteData } : n));
      }
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: user.id, partner_id: partnerId, ...noteData })
        .select()
        .single();
      if (!error && data) {
        setNotes((prev: Note[]) => [data, ...prev]);
      }
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      setNotes((prev: Note[]) => prev.filter(n => n.id !== id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'), summary: '',
      raw_content: '', action_items: []
    });
    setUploadError('');
  };

  const openEdit = (note: Note) => {
    setEditingItem(note);
    setFormData({
      title: note.title,
      meeting_date: note.meeting_date,
      summary: note.summary || '',
      raw_content: note.raw_content || '',
      action_items: note.action_items || [],
    });
    setShowModal(true);
  };

  const addActionItem = () => {
    if (!newActionItem.item) return;
    setFormData({
      ...formData,
      action_items: [...formData.action_items, { id: crypto.randomUUID(), ...newActionItem, complete: false }]
    });
    setNewActionItem({ item: '', owner: '' });
  };

  const toggleActionItem = async (noteId: string, itemId: string) => {
    const note = notes.find((n: Note) => n.id === noteId);
    if (!note) return;
    const updatedItems = note.action_items.map((ai: any) =>
      ai.id === itemId ? { ...ai, complete: !ai.complete } : ai
    );
    await supabase.from('notes').update({ action_items: updatedItems }).eq('id', noteId);
    setNotes((prev: Note[]) => prev.map(n =>
      n.id === noteId ? { ...n, action_items: updatedItems } : n
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notes & Meetings</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note: Note) => (
            <div
              key={note.id}
              className="p-4 rounded-xl group"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <h4
                  className="font-medium cursor-pointer hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => openEdit(note)}
                >
                  {note.title}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(note.meeting_date), 'MMM d, yyyy')}
                  </span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              {note.summary && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{note.summary}</p>
              )}
              {note.action_items && note.action_items.length > 0 && (
                <div className="space-y-1">
                  {note.action_items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => toggleActionItem(note.id, item.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.complete ? 'bg-green-500 border-green-500' : ''}`}
                        style={{ borderColor: item.complete ? '#22C55E' : 'var(--border)' }}
                      >
                        {item.complete && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span style={{
                        color: item.complete ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: item.complete ? 'line-through' : 'none'
                      }}>
                        {item.item}
                        {item.owner && <span style={{ color: 'var(--text-muted)' }}> ({item.owner})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingItem ? 'Edit Note' : 'Add Note'} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Meeting title or topic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Date</label>
                <input
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="Brief summary of the meeting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Full Notes / Transcript
              </label>

              {/* File Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mb-2 p-4 rounded-lg border-2 border-dashed text-center transition-colors ${dragActive ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}
                style={{
                  borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
                  background: dragActive ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="note-file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="note-file-upload"
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Parsing document...</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent)' }} className="font-medium">Upload a file</span> or drag and drop
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        PDF, DOCX, or TXT files supported
                      </p>
                    </>
                  )}
                </label>
              </div>

              {uploadError && (
                <p className="text-sm mb-2 text-red-500">{uploadError}</p>
              )}

              {/* Manual paste textarea */}
              <textarea
                value={formData.raw_content}
                onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="Or paste meeting notes / transcript here..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Action Items</label>
              <div className="space-y-2 mb-2">
                {formData.action_items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.item}</span>
                    {item.owner && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({item.owner})</span>}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        action_items: formData.action_items.filter((_, idx) => idx !== i)
                      })}
                      className="p-1 rounded hover:bg-red-50"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActionItem.item}
                  onChange={(e) => setNewActionItem({ ...newActionItem, item: e.target.value })}
                  placeholder="Action item..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                />
                <input
                  type="text"
                  value={newActionItem.owner}
                  onChange={(e) => setNewActionItem({ ...newActionItem, owner: e.target.value })}
                  placeholder="Owner"
                  className="w-32 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={addActionItem}
                  className="px-3 py-2 rounded-lg"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Updates Tab Component
function UpdatesTab({ generatedUpdate, generatingUpdate, generateUpdate, copyUpdate, updateCopied, partner, notes }: any) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  const UPDATE_TYPES = [
    {
      id: 'sync_recap',
      name: 'Sync Recap',
      description: 'Quick Slack message for your team after a sync meeting',
      icon: MessageSquare,
      color: '#8B5CF6',
    },
    {
      id: 'eow_update',
      name: 'EOW Friday Update',
      description: 'End-of-week status update for team Slack channels',
      icon: CalendarCheck,
      color: '#F59E0B',
    },
    {
      id: 'email_recap',
      name: 'Email Recap',
      description: 'Professional email recap to send to the partner after a meeting',
      icon: Mail,
      color: '#3B82F6',
    },
    {
      id: 'status_summary',
      name: 'Status Summary',
      description: 'Comprehensive current status based on all notes and history',
      icon: FileBarChart,
      color: '#10B981',
    },
  ];

  const handleGenerate = (typeId: string) => {
    setSelectedType(typeId);
    if (typeId === 'email_recap' && selectedNoteId) {
      generateUpdate(typeId, selectedNoteId);
    } else {
      generateUpdate(typeId);
    }
  };

  const handleRegenerate = () => {
    if (selectedType) {
      if (selectedType === 'email_recap' && selectedNoteId) {
        generateUpdate(selectedType, selectedNoteId);
      } else {
        generateUpdate(selectedType);
      }
    }
  };

  return (
    <div className="p-6">
      {generatingUpdate ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-soft)' }}>
            <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Generating {UPDATE_TYPES.find(t => t.id === selectedType)?.name || 'update'}...
          </h4>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            AI is analyzing meeting notes, workstreams, and risks.
          </p>
        </div>
      ) : generatedUpdate ? (
        <div>
          {/* Header with type indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedType && (() => {
                const type = UPDATE_TYPES.find(t => t.id === selectedType);
                if (!type) return null;
                const Icon = type.icon;
                return (
                  <>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${type.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: type.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{type.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generated for {partner.name}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <button
              onClick={() => {
                setSelectedType(null);
                setSelectedNoteId('');
              }}
              className="text-sm px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            >
              Back to options
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={copyUpdate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: updateCopied ? '#22C55E' : 'var(--accent)', color: 'white' }}
            >
              {updateCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {updateCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={generatingUpdate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          {/* Generated content */}
          <div
            className="p-6 rounded-xl whitespace-pre-wrap text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {generatedUpdate}
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              Generate AI Updates
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Choose the type of update you want to generate for {partner.name}
            </p>
          </div>

          {/* Update type cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {UPDATE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    if (type.id === 'email_recap') {
                      setSelectedType('email_recap_select');
                    } else {
                      handleGenerate(type.id);
                    }
                  }}
                  className="p-5 rounded-xl text-left transition-all hover:scale-[1.02] hover:shadow-lg group"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${type.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: type.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {type.name}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {type.description}
                      </p>
                    </div>
                    <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: type.color }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Email recap note selection */}
          {selectedType === 'email_recap_select' && (
            <div className="mt-6 p-5 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Select a meeting to recap
              </h4>
              {notes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No meeting notes found. Add a note first to generate an email recap.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {notes.map((note: any) => (
                      <label
                        key={note.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedNoteId === note.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                        style={{ background: selectedNoteId === note.id ? 'var(--accent-soft)' : 'var(--bg-primary)' }}
                      >
                        <input
                          type="radio"
                          name="note"
                          value={note.id}
                          checked={selectedNoteId === note.id}
                          onChange={() => setSelectedNoteId(note.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedNoteId === note.id ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-400'}`}>
                          {selectedNoteId === note.id && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{note.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(note.meeting_date), 'MMM d, yyyy')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedType(null)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleGenerate('email_recap')}
                      disabled={!selectedNoteId}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Email Recap
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Timeline Tab Component
function TimelineTab({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="p-6">
      {milestones.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No milestones yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map(milestone => (
            <div
              key={milestone.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div
                className={`w-3 h-3 rounded-full ${milestone.status === 'complete' ? 'bg-green-500' : milestone.status === 'missed' ? 'bg-red-500' : 'bg-gray-300'}`}
              />
              <div className="flex-1">
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{milestone.title}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                  {milestone.actual_date && ` | Actual: ${format(new Date(milestone.actual_date), 'MMM d, yyyy')}`}
                </div>
              </div>
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  background: milestone.status === 'complete' ? '#DCFCE7' : milestone.status === 'missed' ? '#FEE2E2' : 'var(--bg-primary)',
                  color: milestone.status === 'complete' ? '#16A34A' : milestone.status === 'missed' ? '#DC2626' : 'var(--text-muted)',
                }}
              >
                {milestone.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable Modal Component
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative rounded-2xl shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'} w-full max-h-[90vh] overflow-y-auto`}
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
