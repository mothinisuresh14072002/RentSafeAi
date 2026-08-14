'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, propertiesData] = await Promise.all([
          apiClient('/owner-profile').catch(() => null),
          apiClient('/property').catch(() => [])
        ]);
        setProfile(profileData);
        setProperties(propertiesData);
      } catch (e) {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        {profile?.state !== 'VERIFIED' ? (
          <Link href="/owner/onboarding">
            <Button variant="secondary">Complete Onboarding</Button>
          </Link>
        ) : (
          <Link href="/owner/properties/new">
            <Button>+ Add Property</Button>
          </Link>
        )}
      </div>

      {profile?.state !== 'VERIFIED' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You must complete the onboarding and KYC verification process before you can add properties.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Your Properties</h2>
        </CardHeader>
        <CardBody>
          {properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't added any properties yet.</p>
              <Link href="/owner/properties/new">
                <Button disabled={profile?.state !== 'VERIFIED'}>Add Your First Property</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map(prop => (
                <div key={prop.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div>
                    <h3 className="font-medium text-gray-900">{prop.locality}, {prop.city}</h3>
                    <p className="text-sm text-gray-500">{prop.type} • {prop.doorNumber} {prop.street}</p>
                  </div>
                  <Badge>{prop.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
