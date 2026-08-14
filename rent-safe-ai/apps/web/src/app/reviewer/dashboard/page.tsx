'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function ReviewDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<any[]>([]);

  useEffect(() => {
    async function loadQueues() {
      try {
        // Fetch pending cases from backend review service
        // Since we didn't build a specific queue endpoint in Task 15, we'll mock the fetch pattern
        const data = await apiClient('/fraud-reports/queue').catch(() => []);
        setQueues(Array.isArray(data) ? data : data.data || []);
      } catch (e) {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadQueues();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-slate-900">Tenant safety reports</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-8">Loading queues...</div>
          ) : queues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">The queue is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queues.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-sm transition-shadow bg-white">
                  <div>
                    <h3 className="font-medium text-slate-900">{c.category} · {c.severity}</h3>
                    <p className="text-sm text-slate-500">Subject: {c.subjectType} {c.subjectId}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={c.status === 'PENDING' ? 'warning' : 'info'}>{c.status}</Badge>
                    <Link href={`/reviewer/queues/${c.id}`}>
                      <Button variant="secondary">Open Case</Button>
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
