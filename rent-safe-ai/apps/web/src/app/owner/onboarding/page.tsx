'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiClient('/owner-profile');
        setProfile(data);
        if (data) {
          setFormData({
            fullName: data.fullName || '',
            phoneNumber: data.phoneNumber || '',
            email: data.email || ''
          });
        }
      } catch (e: any) {
        if (e.message !== 'Profile not found') {
          setError('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (profile) {
        await apiClient('/owner-profile', {
          method: 'PATCH',
          body: JSON.stringify(formData)
        });
      } else {
        await apiClient('/owner-profile/draft', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      const updated = await apiClient('/owner-profile');
      setProfile(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const submitKyc = async () => {
    setSaving(true);
    try {
      await apiClient('/owner-profile/submit-kyc', { method: 'POST' });
      const updated = await apiClient('/owner-profile');
      setProfile(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to submit KYC');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Owner Onboarding</h1>
        {profile && (
          <Badge variant={profile.state === 'VERIFIED' ? 'success' : 'warning'}>
            {profile.state}
          </Badge>
        )}
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Full Name (As per Bank/Aadhaar)" 
              value={formData.fullName} 
              onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
              disabled={profile?.state === 'VERIFIED'}
              required
            />
            <Input 
              label="Phone Number" 
              type="tel"
              value={formData.phoneNumber} 
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} 
              disabled={profile?.state === 'VERIFIED'}
              required
            />
            <Input 
              label="Email Address" 
              type="email"
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
              disabled={profile?.state === 'VERIFIED'}
            />
            
            {profile?.state !== 'VERIFIED' && (
              <div className="pt-4">
                <Button type="submit" isLoading={saving}>Save Profile</Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      {profile && profile.state === 'PROFILE_PENDING' && (
        <Card>
          <CardBody className="bg-indigo-50 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-indigo-800">Ready for Identity Verification?</h3>
              <p className="text-sm text-indigo-700 mt-1">Submit your profile to begin the KYC check.</p>
            </div>
            <Button onClick={submitKyc} isLoading={saving}>Submit KYC</Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
