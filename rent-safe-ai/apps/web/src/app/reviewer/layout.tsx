import React from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { redirect } from 'next/navigation';

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  // Simple role check, we might do this via server components natively or just let the client bounce them
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
