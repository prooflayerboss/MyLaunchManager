'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Rocket, LayoutDashboard, Users, Settings, LogOut, Plus,
  Users2, Bell, BarChart3
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
      setAuthLoading(false);
    };
    getUser();
  }, [router, supabase.auth]);

  // Redirect to onboarding if not completed (except if already on onboarding page)
  useEffect(() => {
    if (!settingsLoading && settings && !settings.onboarding_completed && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [settings, settingsLoading, pathname, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Don't show sidebar on onboarding
  if (pathname === '/onboarding') {
    return <>{children}</>;
  }

  const partnerLabel = settings?.partner_label || 'Partner';
  const partnerLabelPlural = settings?.partner_label_plural || 'Partners';

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/partners', icon: Users, label: partnerLabelPlural },
    { href: '/team', icon: Users2, label: 'Team' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'var(--bg-primary)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="p-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)' }}
            >
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              LaunchPad
            </span>
          </Link>
        </div>

        {/* Add button */}
        <div className="px-4 mb-4">
          <Link
            href="/partners/new"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            New {partnerLabel}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? '' : 'hover:bg-gray-50'}`}
                  style={{
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user.user_metadata?.full_name || 'User'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </div>
            </div>
            <NotificationsDropdown />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
