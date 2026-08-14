'use client';

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function ReviewCasePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SUSPEND' | ''>('');

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !decision) return;
    setSaving(true);
    setError('');

    try {
      await apiClient(`/review/cases/${params.id}/actions`, {
        method: 'POST',
        headers: {
          'x-audit-reason': reason
        },
        body: JSON.stringify({ action: decision })
      });
      router.push('/reviewer/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to submit decision');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Review Case</h1>
        <Badge variant="warning">Action Required</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-slate-900">Verification Checklist</h2>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <span className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-600"></span>
                  </span>
                  <span className="text-slate-700">Identity / KYC (Verified)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-600"></span>
                  </span>
                  <span className="text-slate-700">Property Evidence (Pending Review)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span>
                  </span>
                  <span className="text-slate-700">Duplicate Check (Scanning)</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-slate-900">Evidence Viewer</h2>
            </CardHeader>
            <CardBody className="bg-slate-50 min-h-[300px] flex items-center justify-center border-dashed border-2 border-slate-300 rounded-lg m-4">
              <p className="text-slate-500 text-sm">Secure Document Previews render here...</p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <h2 className="text-lg font-medium text-slate-900">Decision Form</h2>
            </CardHeader>
            <CardBody>
              {error && (
                <div className="bg-red-50 p-3 rounded-md mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <form onSubmit={submitDecision} className="space-y-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Decision</label>
                  <select
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={decision}
                    onChange={(e: any) => setDecision(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a decision...</option>
                    <option value="APPROVE">Approve</option>
                    <option value="REQUEST_CHANGES">Request Changes</option>
                    <option value="REJECT">Reject (Fraud/Policy)</option>
                    <option value="SUSPEND">Suspend Account</option>
                  </select>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audit Reason</label>
                  <textarea
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-24"
                    placeholder="Provide detailed reasoning for this decision. This will be recorded securely in the AuditService."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Reasons are cryptographically hashed and cannot be altered once submitted.</p>
                </div>

                <div className="pt-2 border-t border-slate-200 mt-4">
                  <Button type="submit" isLoading={saving} className="w-full" disabled={!decision || !reason}>
                    Submit Decision
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
