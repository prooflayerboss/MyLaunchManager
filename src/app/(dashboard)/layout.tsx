'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rocket, LayoutGrid, LogOut, Plus, User } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-3" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/projects" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              My Launch Manager
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>

            {/* User menu */}
            <div className="flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
                {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
