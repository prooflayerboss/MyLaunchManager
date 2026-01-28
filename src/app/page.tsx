'use client';

import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock, FileSpreadsheet, LayoutGrid, Rocket, Target, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(253, 251, 247, 0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'var(--accent)' }}>
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              My Launch Manager
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              Features
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(229, 77, 46, 0.08) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />

        <div className="max-w-5xl mx-auto relative">
          {/* Pill badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 opacity-0 animate-fade-up"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Zap className="w-4 h-4" />
            Built for launch managers
          </div>

          {/* Main headline */}
          <h1
            className="text-5xl md:text-7xl leading-[1.1] mb-6 opacity-0 animate-fade-up animation-delay-100"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Your launch
            <br />
            <span className="italic" style={{ color: 'var(--accent)' }}>command center.</span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-xl md:text-2xl max-w-2xl mb-10 leading-relaxed opacity-0 animate-fade-up animation-delay-200"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            Plan launches. Track programs. Hit deadlines.
            <br className="hidden md:block" />
            One simple place for everything you're launching.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-up animation-delay-300">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 14px rgba(229, 77, 46, 0.3)' }}
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              See how it works
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-6 mt-12 pt-8 opacity-0 animate-fade-up animation-delay-400" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Export to Excel & PDF</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Works in seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl p-1.5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--border) 0%, var(--bg-secondary) 100%)' }}
          >
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ background: 'var(--bg-primary)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E' }} />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                    Q1 Product Launch — My Launch Manager
                  </div>
                </div>
              </div>

              {/* Content preview */}
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Q1 Product Launch</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>4 phases · 12 tasks · 3 milestones</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Week</div>
                    <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: 'white' }}>Month</div>
                  </div>
                </div>

                {/* Timeline preview */}
                <div className="space-y-4">
                  <TimelineRow
                    name="Planning & Discovery"
                    color="#3B82F6"
                    start={5}
                    width={20}
                    progress={100}
                  />
                  <TimelineRow
                    name="Development Sprint"
                    color="#10B981"
                    start={22}
                    width={35}
                    progress={65}
                    isActive
                  />
                  <TimelineRow
                    name="QA & Testing"
                    color="#F59E0B"
                    start={52}
                    width={20}
                    progress={0}
                  />
                  <TimelineRow
                    name="Launch & Deploy"
                    color="#8B5CF6"
                    start={70}
                    width={18}
                    progress={0}
                  />
                </div>

                {/* Milestone markers */}
                <div className="flex items-center gap-8 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rotate-45" style={{ background: '#3B82F6' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Design Complete</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rotate-45" style={{ background: '#10B981' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Code Freeze</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rotate-45" style={{ background: '#8B5CF6' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Go Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Launch management,{' '}
              <span className="italic" style={{ color: 'var(--accent)' }}>simplified.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              No learning curve. No bloated features. Just the essentials to keep your launches on track.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StepCard
              number="01"
              icon={<Target className="w-5 h-5" />}
              title="Define your launch"
              description="Add tasks, set dates, and outline milestones. Takes seconds, not hours."
            />
            <StepCard
              number="02"
              icon={<LayoutGrid className="w-5 h-5" />}
              title="Visualize the timeline"
              description="See everything at a glance. Drag to adjust. Click to update progress."
            />
            <StepCard
              number="03"
              icon={<FileSpreadsheet className="w-5 h-5" />}
              title="Share & export"
              description="Export beautiful reports to Excel, PDF, or PNG. Share with stakeholders instantly."
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Everything you need.{' '}
              <span className="italic" style={{ color: 'var(--accent)' }}>Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Calendar className="w-5 h-5" />}
              title="Timeline views"
              description="Switch between day, week, and month views. See the big picture or zoom into details."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Progress tracking"
              description="Update task progress with a simple slider. See what's done and what's left at a glance."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Team collaboration"
              description="Invite your team. Assign tasks. Keep everyone aligned on what matters."
            />
            <FeatureCard
              icon={<FileSpreadsheet className="w-5 h-5" />}
              title="Beautiful exports"
              description="Export to Excel with styling intact. Generate PDFs and PNGs that look professional."
            />
          </div>
        </div>
      </section>

      {/* Social proof / Quote */}
      <section className="py-24 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <svg className="w-12 h-12 mx-auto opacity-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <blockquote
            className="text-2xl md:text-3xl mb-8 leading-relaxed"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            I just needed a simple way to plan launches and share timelines with stakeholders.
            Every other tool was either too complex or too ugly.{' '}
            <span className="italic" style={{ color: 'var(--accent)' }}>So I built this.</span>
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ background: 'var(--accent)' }}>
              C
            </div>
            <div className="text-left">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Curtis</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Creator, My Launch Manager</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl md:text-5xl mb-6"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Ready to simplify
            <br />
            <span className="italic" style={{ color: 'var(--accent)' }}>your next launch?</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
            Join launch managers who stopped wrestling with spreadsheets.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 14px rgba(229, 77, 46, 0.3)' }}
          >
            Get started free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>My Launch Manager</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Built for launch managers.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TimelineRow({
  name,
  color,
  start,
  width,
  progress,
  isActive
}: {
  name: string;
  color: string;
  start: number;
  width: number;
  progress: number;
  isActive?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 flex-shrink-0">
        <span
          className="text-sm font-medium truncate block"
          style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {name}
        </span>
      </div>
      <div className="flex-1 h-10 rounded-lg relative" style={{ background: 'var(--bg-secondary)' }}>
        {/* Progress bar */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-md transition-all flex items-center"
          style={{
            left: `${start}%`,
            width: `${width}%`,
            background: color,
            boxShadow: isActive ? `0 2px 8px ${color}40` : 'none'
          }}
        >
          {progress > 0 && (
            <div
              className="absolute left-0.5 top-0.5 bottom-0.5 rounded-sm bg-black/20"
              style={{ width: `${progress}%` }}
            />
          )}
          <span className="text-xs font-medium text-white/90 ml-2 truncate">
            {progress > 0 && `${progress}%`}
          </span>
        </div>
        {/* Today marker */}
        {isActive && (
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{ left: '45%', background: 'var(--accent)' }}
          >
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-xl transition-all hover:scale-[1.02]"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{number}</span>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-xl flex gap-4 transition-all hover:scale-[1.01]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
    </div>
  );
}
