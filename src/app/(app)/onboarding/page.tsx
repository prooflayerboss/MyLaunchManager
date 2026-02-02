'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Rocket, ArrowRight, ArrowLeft, Plus, X, Check, Sparkles,
  Users, Briefcase, Building2, Package, Handshake, FolderKanban,
  Clock, Zap, LayoutTemplate
} from 'lucide-react';
import { StatusConfig, DefaultWorkstream, Template, TemplateCategory } from '@/types';

// Use case options
const USE_CASES = [
  { id: 'saas', label: 'Customers', sublabel: 'SaaS Onboarding', icon: Users, description: 'Onboard new customers to your product' },
  { id: 'partner', label: 'Partners', sublabel: 'Channel Programs', icon: Handshake, description: 'Manage partner relationships' },
  { id: 'client', label: 'Clients', sublabel: 'Agency Work', icon: Briefcase, description: 'Track client projects & deliverables' },
  { id: 'project', label: 'Projects', sublabel: 'Internal Teams', icon: FolderKanban, description: 'Coordinate cross-functional launches' },
  { id: 'vendor', label: 'Vendors', sublabel: 'Procurement', icon: Building2, description: 'Track vendor implementations' },
  { id: 'product', label: 'Products', sublabel: 'Product Launches', icon: Package, description: 'Launch new products to market' },
];

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280',
];

// Default fallback if no template
const BLANK_WORKSTREAMS: DefaultWorkstream[] = [
  { name: 'Kickoff', sort_order: 0 },
  { name: 'In Progress', sort_order: 1 },
  { name: 'Review', sort_order: 2 },
  { name: 'Complete', sort_order: 3 },
];

const BLANK_STATUSES: StatusConfig[] = [
  { value: 'new', label: 'New', color: '#8B5CF6' },
  { value: 'active', label: 'Active', color: '#3B82F6' },
  { value: 'on_hold', label: 'On Hold', color: '#F59E0B' },
  { value: 'complete', label: 'Complete', color: '#22C55E' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Step 1: Use case selection
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customLabelPlural, setCustomLabelPlural] = useState('');

  // Step 2: Template selection
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Step 3: Customization (pre-filled from template)
  const [workstreams, setWorkstreams] = useState<DefaultWorkstream[]>(BLANK_WORKSTREAMS);
  const [statuses, setStatuses] = useState<StatusConfig[]>(BLANK_STATUSES);
  const [newWorkstream, setNewWorkstream] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Computed labels
  const partnerLabel = customLabel || USE_CASES.find(u => u.id === selectedUseCase)?.label || 'Partner';
  const partnerLabelPlural = customLabelPlural || (partnerLabel.endsWith('s') ? partnerLabel : partnerLabel + 's');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if onboarding already completed
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (settings?.onboarding_completed) {
        router.push('/dashboard');
        return;
      }

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('templates')
        .select('*, category:template_categories(*)')
        .eq('is_public', true)
        .order('use_count', { ascending: false });

      const { data: categoriesData } = await supabase
        .from('template_categories')
        .select('*')
        .order('sort_order');

      if (templatesData) setTemplates(templatesData);
      if (categoriesData) setCategories(categoriesData);

      setLoadingTemplates(false);
      setInitialLoading(false);
    };

    init();
  }, [router, supabase]);

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate?.data) {
      const data = selectedTemplate.data;
      if (data.workstreams?.length) {
        setWorkstreams(data.workstreams);
      }
      if (data.statuses?.length) {
        setStatuses(data.statuses);
      }
    }
  }, [selectedTemplate]);

  const handleUseCaseSelect = (useCaseId: string) => {
    setSelectedUseCase(useCaseId);
    setCustomLabel('');
    setCustomLabelPlural('');
  };

  const handleAddWorkstream = () => {
    if (!newWorkstream.trim()) return;
    setWorkstreams([...workstreams, { name: newWorkstream.trim(), sort_order: workstreams.length }]);
    setNewWorkstream('');
  };

  const handleRemoveWorkstream = (index: number) => {
    setWorkstreams(workstreams.filter((_, i) => i !== index));
  };

  const handleAddStatus = () => {
    if (!newStatus.trim()) return;
    const value = newStatus.toLowerCase().replace(/\s+/g, '_');
    const unusedColor = COLORS.find(c => !statuses.some(s => s.color === c)) || COLORS[0];
    setStatuses([...statuses, { value, label: newStatus.trim(), color: unusedColor }]);
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

  const handleComplete = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const settingsData = {
      partner_label: partnerLabel,
      partner_label_plural: partnerLabelPlural,
      default_workstreams: workstreams,
      statuses: statuses,
      onboarding_completed: true,
    };

    // Try update first, then insert
    const { data: updateData, error: updateError } = await supabase
      .from('organization_settings')
      .update(settingsData)
      .eq('user_id', user.id)
      .select();

    if (updateError || !updateData?.length) {
      await supabase
        .from('organization_settings')
        .insert({ user_id: user.id, ...settingsData });
    }

    // Increment template use count
    if (selectedTemplate) {
      try {
        await supabase.rpc('increment_template_use_count', { template_id: selectedTemplate.id });
      } catch {
        // Ignore - function may not exist yet
      }
    }

    window.location.href = '/dashboard';
  };

  // Filter templates based on use case
  const getRelevantTemplates = () => {
    if (!selectedUseCase) return templates;

    const mapping: Record<string, string[]> = {
      saas: ['saas-onboarding'],
      partner: ['partner-enablement'],
      client: ['agency-clients'],
      project: ['product-launch'],
      vendor: ['professional-services'],
      product: ['product-launch'],
    };

    const relevantSlugs = mapping[selectedUseCase] || [];
    const relevant = templates.filter(t => relevantSlugs.some(slug => t.category?.slug?.includes(slug) || t.slug?.includes(slug)));

    // If no specific matches, show all
    return relevant.length > 0 ? relevant : templates;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left side - Progress */}
      <div className="hidden lg:flex w-80 flex-col p-8" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E54D2E, #8B5CF6)' }}>
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            LaunchPad
          </span>
        </div>

        <div className="space-y-4">
          {[
            { num: 1, title: 'What do you manage?', desc: 'Choose your use case', icon: Users },
            { num: 2, title: 'Pick a template', desc: 'Start with best practices', icon: LayoutTemplate },
            { num: 3, title: 'Customize', desc: 'Make it yours', icon: Sparkles },
            { num: 4, title: 'Ready to launch!', desc: 'Start tracking', icon: Rocket },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold`}
                style={{
                  background: step > s.num ? '#22C55E' : step === s.num ? 'var(--accent)' : 'var(--border)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)'
                }}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Need help? Check our <a href="#" className="underline">setup guide</a>
          </div>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* Step 1: Use Case */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                What are you managing?
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                This helps us customize the experience for you.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {USE_CASES.map((useCase) => {
                  const Icon = useCase.icon;
                  const isSelected = selectedUseCase === useCase.id;
                  return (
                    <button
                      key={useCase.id}
                      onClick={() => handleUseCaseSelect(useCase.id)}
                      className={`p-5 rounded-xl text-left transition-all hover:scale-[1.02] ${isSelected ? 'ring-2 ring-[#E54D2E]' : ''}`}
                      style={{
                        background: isSelected ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: isSelected ? 'var(--accent)' : 'var(--bg-primary)' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{useCase.label}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{useCase.sublabel}</div>
                        </div>
                      </div>
                      <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                        {useCase.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Custom option */}
              <div className="p-5 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                  Or use custom terminology:
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => {
                      setCustomLabel(e.target.value);
                      setSelectedUseCase(null);
                    }}
                    placeholder="Singular (e.g., Account)"
                    className="flex-1 px-4 py-3 rounded-lg text-sm"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    value={customLabelPlural}
                    onChange={(e) => setCustomLabelPlural(e.target.value)}
                    placeholder="Plural (e.g., Accounts)"
                    className="flex-1 px-4 py-3 rounded-lg text-sm"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Start with a template
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Templates include pre-configured workstreams, statuses, and best practices.
              </p>

              {loadingTemplates ? (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading templates...</div>
              ) : (
                <>
                  <div className="grid gap-4 mb-6">
                    {/* Blank option */}
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setWorkstreams(BLANK_WORKSTREAMS);
                        setStatuses(BLANK_STATUSES);
                      }}
                      className={`p-5 rounded-xl text-left transition-all hover:scale-[1.01] ${!selectedTemplate ? 'ring-2 ring-[#E54D2E]' : ''}`}
                      style={{
                        background: !selectedTemplate ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ background: !selectedTemplate ? 'var(--accent)' : 'var(--bg-primary)' }}
                        >
                          <Plus className="w-6 h-6" style={{ color: !selectedTemplate ? 'white' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Start Blank</div>
                          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Configure everything yourself from scratch
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Template options */}
                    {getRelevantTemplates().slice(0, 6).map((template) => {
                      const isSelected = selectedTemplate?.id === template.id;
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`p-5 rounded-xl text-left transition-all hover:scale-[1.01] ${isSelected ? 'ring-2 ring-[#E54D2E]' : ''}`}
                          style={{
                            background: isSelected ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ background: isSelected ? 'var(--accent)' : 'var(--bg-primary)' }}
                              >
                                <LayoutTemplate className="w-6 h-6" style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                              </div>
                              <div>
                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{template.name}</div>
                                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {template.description}
                                </div>
                              </div>
                            </div>
                            {template.settings?.duration_weeks && (
                              <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                                <Clock className="w-3 h-3" />
                                {template.settings.duration_weeks}w
                              </div>
                            )}
                          </div>
                          {template.data?.workstreams && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {template.data.workstreams.slice(0, 4).map((ws, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded"
                                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                                >
                                  {ws.name}
                                </span>
                              ))}
                              {template.data.workstreams.length > 4 && (
                                <span className="text-xs px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                                  +{template.data.workstreams.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Customize */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Customize your setup
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Adjust the workstreams and statuses to match your process.
              </p>

              {/* Workstreams */}
              <div className="mb-8">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Workstreams
                  <span className="font-normal text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                    Phases each {partnerLabel.toLowerCase()} goes through
                  </span>
                </h3>
                <div className="space-y-2 mb-3">
                  {workstreams.map((ws, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg group"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    >
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{ws.name}</span>
                      <button
                        onClick={() => handleRemoveWorkstream(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity"
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
                    className="flex-1 px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleAddWorkstream}
                    className="px-3 py-2 rounded-lg"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Statuses */}
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Statuses
                  <span className="font-normal text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                    Overall {partnerLabel.toLowerCase()} status
                  </span>
                </h3>
                <div className="space-y-2 mb-3">
                  {statuses.map((status, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg group"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    >
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full cursor-pointer" style={{ background: status.color }} />
                        <input
                          type="color"
                          value={status.color}
                          onChange={(e) => handleStatusColorChange(index, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{status.label}</span>
                      <button
                        onClick={() => handleRemoveStatus(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity"
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
                    className="flex-1 px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleAddStatus}
                    className="px-3 py-2 rounded-lg"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="animate-fade-up text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)' }}
              >
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                You're ready to launch!
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Your workspace is configured. Let's start tracking your first {partnerLabel.toLowerCase()}.
              </p>

              <div className="p-6 rounded-xl text-left mb-8 max-w-md mx-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>Your setup:</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Managing</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{partnerLabelPlural}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Template</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedTemplate?.name || 'Custom'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Workstreams</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{workstreams.length} phases</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Statuses</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{statuses.length} stages</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  AI-powered updates
                </div>
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Project plans
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Team collaboration
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedUseCase && !customLabel}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', color: 'white' }}
              >
                {loading ? 'Setting up...' : 'Go to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
