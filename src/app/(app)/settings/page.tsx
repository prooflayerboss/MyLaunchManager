'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { StatusConfig, DefaultWorkstream } from '@/types';
import {
  Settings, Save, Plus, X, GripVertical, Check, Tag, Layers, CircleDot, Loader2
} from 'lucide-react';

const SUGGESTED_LABELS = [
  { singular: 'Partner', plural: 'Partners' },
  { singular: 'Client', plural: 'Clients' },
  { singular: 'Customer', plural: 'Customers' },
  { singular: 'Account', plural: 'Accounts' },
  { singular: 'Project', plural: 'Projects' },
];

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280',
];

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [partnerLabel, setPartnerLabel] = useState('');
  const [partnerLabelPlural, setPartnerLabelPlural] = useState('');
  const [workstreams, setWorkstreams] = useState<DefaultWorkstream[]>([]);
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [newWorkstream, setNewWorkstream] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with current settings
  useEffect(() => {
    if (settings) {
      setPartnerLabel(settings.partner_label || 'Partner');
      setPartnerLabelPlural(settings.partner_label_plural || 'Partners');
      setWorkstreams(settings.default_workstreams || []);
      setStatuses(settings.statuses || []);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed =
        partnerLabel !== settings.partner_label ||
        partnerLabelPlural !== settings.partner_label_plural ||
        JSON.stringify(workstreams) !== JSON.stringify(settings.default_workstreams) ||
        JSON.stringify(statuses) !== JSON.stringify(settings.statuses);
      setHasChanges(changed);
    }
  }, [partnerLabel, partnerLabelPlural, workstreams, statuses, settings]);

  const handleLabelSelect = (label: { singular: string; plural: string }) => {
    setPartnerLabel(label.singular);
    setPartnerLabelPlural(label.plural);
  };

  const handleAddWorkstream = () => {
    if (!newWorkstream.trim()) return;
    setWorkstreams([
      ...workstreams,
      { name: newWorkstream.trim(), sort_order: workstreams.length }
    ]);
    setNewWorkstream('');
  };

  const handleRemoveWorkstream = (index: number) => {
    setWorkstreams(workstreams.filter((_, i) => i !== index));
  };

  const handleAddStatus = () => {
    if (!newStatus.trim()) return;
    const value = newStatus.toLowerCase().replace(/\s+/g, '_');
    const unusedColor = COLORS.find(c => !statuses.some(s => s.color === c)) || COLORS[0];
    setStatuses([
      ...statuses,
      { value, label: newStatus.trim(), color: unusedColor }
    ]);
    setNewStatus('');
  };

  const handleRemoveStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const handleStatusColorChange = (index: number, color: string) => {
    const updated = [...statuses];
    updated[index].color = color;
    setStatuses(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const result = await updateSettings({
      partner_label: partnerLabel,
      partner_label_plural: partnerLabelPlural,
      default_workstreams: workstreams,
      statuses: statuses,
    });

    setSaving(false);

    if (!result?.error) {
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Customize your launch management experience
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{
            background: saveSuccess ? '#22C55E' : 'var(--accent)',
            color: 'white'
          }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Terminology Section */}
      <section
        className="p-6 rounded-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Terminology
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              What do you call the companies you're launching?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {SUGGESTED_LABELS.map((label) => (
            <button
              key={label.singular}
              onClick={() => handleLabelSelect(label)}
              className={`p-3 rounded-xl text-left transition-all hover:scale-[1.02] ${partnerLabel === label.singular ? 'ring-2 ring-[#E54D2E]' : ''}`}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{label.plural}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>"{label.singular}"</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Singular
            </label>
            <input
              type="text"
              value={partnerLabel}
              onChange={(e) => setPartnerLabel(e.target.value)}
              placeholder="Partner"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Plural
            </label>
            <input
              type="text"
              value={partnerLabelPlural}
              onChange={(e) => setPartnerLabelPlural(e.target.value)}
              placeholder="Partners"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </section>

      {/* Workstreams Section */}
      <section
        className="p-6 rounded-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Default Workstreams
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              These phases will be added to each new {partnerLabel.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {workstreams.map((ws, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg group"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <GripVertical className="w-4 h-4 cursor-grab" style={{ color: 'var(--text-muted)' }} />
              <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{ws.name}</span>
              <button
                onClick={() => handleRemoveWorkstream(index)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newWorkstream}
            onChange={(e) => setNewWorkstream(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWorkstream()}
            placeholder="Add a workstream..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleAddWorkstream}
            className="px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Statuses Section */}
      <section
        className="p-6 rounded-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <CircleDot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {partnerLabel} Statuses
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Define the stages a {partnerLabel.toLowerCase()} goes through
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {statuses.map((status, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg group"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="relative">
                <div
                  className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{ background: status.color }}
                />
                <input
                  type="color"
                  value={status.color}
                  onChange={(e) => handleStatusColorChange(index, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{status.label}</span>
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                {status.value}
              </span>
              <button
                onClick={() => handleRemoveStatus(index)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
            placeholder="Add a status..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleAddStatus}
            className="px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Color palette for quick reference */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Available colors:
          </div>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color) => (
              <div
                key={color}
                className="w-6 h-6 rounded-full"
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section
        className="p-6 rounded-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid #EF4444' }}
      >
        <h2 className="text-lg font-semibold mb-1 text-red-600">
          Danger Zone
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          These actions cannot be undone. Please proceed with caution.
        </p>

        <button
          className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
              // Reset to defaults
              setPartnerLabel('Partner');
              setPartnerLabelPlural('Partners');
              setWorkstreams([
                { name: 'Kickoff', sort_order: 0 },
                { name: 'Discovery & Requirements', sort_order: 1 },
                { name: 'Configuration', sort_order: 2 },
                { name: 'Integration', sort_order: 3 },
                { name: 'Training', sort_order: 4 },
                { name: 'UAT / Pilot', sort_order: 5 },
                { name: 'Go-Live', sort_order: 6 },
              ]);
              setStatuses([
                { value: 'discovery', label: 'Discovery', color: '#8B5CF6' },
                { value: 'kickoff', label: 'Kickoff', color: '#3B82F6' },
                { value: 'build', label: 'Build', color: '#F59E0B' },
                { value: 'pilot', label: 'Pilot', color: '#10B981' },
                { value: 'live', label: 'Live', color: '#22C55E' },
                { value: 'paused', label: 'Paused', color: '#6B7280' },
                { value: 'churned', label: 'Churned', color: '#EF4444' },
              ]);
            }
          }}
        >
          Reset to Defaults
        </button>
      </section>
    </div>
  );
}
