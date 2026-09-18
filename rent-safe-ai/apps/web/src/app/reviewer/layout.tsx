'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { clearTokens } from '@/lib/auth';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!role) router.replace('/login');
      else if (role !== 'REVIEWER' && role !== 'ADMIN') router.replace('/access-denied');
    }
  }, [role, loading, router]);

  const handleSignOut = () => {
    clearTokens();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <SkeletonCard className="max-w-2xl w-full" />
      </div>
    );
  }

  if (!role || (role !== 'REVIEWER' && role !== 'ADMIN')) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between min-h-16">
            <div className="flex items-center min-w-0">
              <Link href="/reviewer/dashboard" className="text-xl font-bold tracking-tight text-white shrink-0">
                RentSafe Reviewer
              </Link>
              <div className="hidden md:flex ml-8 space-x-7 h-16">
                <Link href="/reviewer/dashboard" className="border-indigo-500 text-white inline-flex items-center px-1 border-b-2 text-sm font-medium">
                  Queue
                </Link>
                <Link href="/reviewer/history" className="border-transparent text-slate-300 hover:border-slate-300 hover:text-white inline-flex items-center px-1 border-b-2 text-sm font-medium">
                  Audit history
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                {role === 'ADMIN' ? 'Admin review' : 'Internal secure zone'}
              </span>
              <button type="button" onClick={handleSignOut} className="text-sm font-medium text-slate-200 hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
