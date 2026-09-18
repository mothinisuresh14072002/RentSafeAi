'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient, ApiError } from '@/lib/api-client';
import Link from 'next/link';

type QueueCase = {
  id: string;
  category?: string;
  severity?: string;
  subjectType?: string;
  subjectId?: string;
  status?: string;
};

export default function ReviewDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<QueueCase[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadQueues() {
      setError('');
      try {
        const data = await apiClient.get<QueueCase[]>('/fraud-reports/queue');
        if (active) setQueues(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!active) return;
        setQueues([]);
        setError(e instanceof ApiError ? e.message : 'Unable to load the review queue.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadQueues();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Reviewer workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Review queue</h1>
        <p className="mt-1 text-sm text-slate-600">Work through safety reports and keep decisions traceable.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-slate-900">Tenant safety reports</h2>
              <p className="mt-1 text-sm text-slate-500">Cases requiring reviewer attention.</p>
            </div>
            {!loading && <Badge variant="info">{queues.length} cases</Badge>}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500" role="status">Loading review queue…</div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm font-medium text-red-900">Could not load the queue</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          ) : queues.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</div>
              <p className="mt-4 font-medium text-slate-900">Nothing needs review right now.</p>
              <p className="mt-1 text-sm text-slate-500">New cases will appear here when they require attention.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queues.map((c) => (
                <div key={c.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{c.category || 'Safety report'} · {c.severity || 'Unknown severity'}</h3>
                    <p className="mt-1 text-sm text-slate-500 break-all">Subject: {c.subjectType || 'Case'} {c.subjectId || c.id}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={c.status === 'PENDING' ? 'warning' : 'info'}>{c.status || 'OPEN'}</Badge>
                    <Link href={`/reviewer/queues/${c.id}`}>
                      <Button variant="secondary">Open case</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
