'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { apiClient, ApiError } from '@/lib/api-client';

const steps = [
  { label: 'Profile', help: 'Tell us who you are.' },
  { label: 'KYC review', help: 'Submit your profile for identity verification.' },
  { label: 'Ready', help: 'After verification, property listing becomes available.' },
];

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  interface OwnerProfile { fullName?: string; phoneNumber?: string; email?: string; state?: string; }
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiClient.get<OwnerProfile>('/owner-profile');
        setProfile(data);
        if (data) setFormData({ fullName: data.fullName || '', phoneNumber: data.phoneNumber || '', email: data.email || '' });
      } catch (e: any) {
        if (!(e instanceof ApiError && e.status === 404)) setError('We could not load your profile. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (profile) await apiClient.patch('/owner-profile', formData);
      else await apiClient.post('/owner-profile/draft', formData);
      setProfile(await apiClient.get<OwnerProfile>('/owner-profile'));
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'We could not save your profile.');
    } finally { setSaving(false); }
  };

  const submitKyc = async () => {
    setSaving(true); setError('');
    try {
      await apiClient.post('/owner-profile/submit-kyc');
      setProfile(await apiClient.get('/owner-profile'));
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'We could not submit your verification.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="mx-auto max-w-2xl rounded-xl border bg-white p-12 text-center text-slate-500">Loading your verification journey…</div>;

  const state = profile?.state || 'NOT_STARTED';
  const active = state === 'VERIFIED' ? 3 : state === 'PROFILE_PENDING' ? 2 : 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Owner onboarding</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Complete your verification</h1>
        <p className="mt-2 text-slate-600">We will guide you one step at a time. You can review your information before submitting.</p>
      </div>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((item, index) => {
              const number = index + 1;
              const done = number < active || state === 'VERIFIED';
              return <div key={item.label} className="flex gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-emerald-100 text-emerald-700' : number === active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{done ? '✓' : number}</div>
                <div><p className="font-semibold">{item.label}</p><p className="text-xs text-slate-500">{item.help}</p></div>
              </div>;
            })}
          </div>
        </CardBody>
      </Card>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-bold">Personal information</h2><p className="text-sm text-slate-500">Use the name that matches your verification documents.</p></div>
            {profile && <Badge variant={state === 'VERIFIED' ? 'success' : 'warning'}>{state.replaceAll('_', ' ')}</Badge>}
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveProfile} className="space-y-5">
            <Input label="Full name" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} disabled={state === 'VERIFIED'} required />
            <Input label="Phone number" type="tel" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={state === 'VERIFIED'} required />
            <Input label="Email address" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={state === 'VERIFIED'} />
            {state !== 'VERIFIED' && <Button type="submit" isLoading={saving}>{profile ? 'Save changes' : 'Save profile'}</Button>}
          </form>
        </CardBody>
      </Card>

      {state === 'PROFILE_PENDING' && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold text-indigo-900">Your profile is ready</h2><p className="mt-1 text-sm text-indigo-800">Submit it to start the KYC verification workflow. Review your details first.</p></div>
            <Button onClick={submitKyc} isLoading={saving}>Submit for review →</Button>
          </CardBody>
        </Card>
      )}

      {state === 'VERIFIED' && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody><h2 className="font-bold text-emerald-900">Verification complete</h2><p className="mt-1 text-sm text-emerald-800">Your owner profile is verified. You can continue to the property listing workflow from your dashboard.</p></CardBody>
        </Card>
      )}
    </div>
  );
}