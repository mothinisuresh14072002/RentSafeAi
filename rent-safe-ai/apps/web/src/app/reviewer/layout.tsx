'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!role) {
        router.push('/login');
      } else if (role !== 'REVIEWER' && role !== 'ADMIN') {
        router.push('/access-denied');
      }
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <SkeletonCard className="max-w-2xl w-full" />
      </div>
    );
  }

  if (!role || (role !== 'REVIEWER' && role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold tracking-tight text-white">RentSafe Reviewer</span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link href="/reviewer/dashboard" className="border-indigo-500 text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Queue
                </Link>
                <Link href="/reviewer/history" className="border-transparent text-slate-300 hover:border-slate-300 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Audit History
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">Internal Secure Zone</span>
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
