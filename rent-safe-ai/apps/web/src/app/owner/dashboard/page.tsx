'use client';

import React, { useEffect, useState } from 'react';
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
          apiClient.get('/owner-profile').catch(() => null),
          apiClient.get('/property').catch(() => []),
        ]);
        setProfile(profileData);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className='rounded-xl border bg-white p-12 text-center text-slate-500'>Loading your workspace…</div>;

  const verified = profile?.state === 'VERIFIED';

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl bg-indigo-600 p-6 text-white sm:p-8'>
        <p className='text-sm font-semibold text-indigo-100'>OWNER WORKSPACE</p>
        <div className='mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end'>
          <div><h1 className='text-3xl font-bold'>Welcome back</h1><p className='mt-1 text-indigo-100'>Keep your verification and properties moving.</p></div>
          <Link href={verified ? '/owner/properties/new' : '/owner/onboarding'}><Button className='bg-white text-indigo-700 hover:bg-indigo-50'>{verified ? '+ Add property' : 'Continue verification'}</Button></Link>
        </div>
      </div>

      {!verified && <Card className='border-amber-200 bg-amber-50'><CardBody className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'><div><h2 className='font-bold text-amber-900'>Finish verification before listing</h2><p className='mt-1 text-sm text-amber-800'>Complete onboarding and required verification steps to unlock property creation.</p></div><Link href='/owner/onboarding'><Button variant='secondary'>Continue →</Button></Link></CardBody></Card>}

      <div className='grid gap-4 sm:grid-cols-3'>
        <Card><CardBody><p className='text-sm text-slate-500'>Properties</p><p className='mt-1 text-3xl font-bold'>{properties.length}</p></CardBody></Card>
        <Card><CardBody><p className='text-sm text-slate-500'>Verification</p><p className='mt-1 text-xl font-bold'>{profile?.state || 'Not started'}</p></CardBody></Card>
        <Card><CardBody><p className='text-sm text-slate-500'>Next action</p><p className='mt-1 font-bold'>{verified ? 'Add a property' : 'Complete onboarding'}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader><div className='flex items-center justify-between'><h2 className='text-lg font-bold'>Your properties</h2>{verified && <Link href='/owner/properties'><span className='text-sm font-semibold text-indigo-600'>View all →</span></Link>}</div></CardHeader>
        <CardBody>
          {properties.length === 0 ? <div className='py-10 text-center'><div className='mx-auto mb-3 text-4xl'>⌂</div><h3 className='font-bold'>No properties yet</h3><p className='mx-auto mt-1 max-w-md text-sm text-slate-500'>Once verification is complete, add your first property and start the listing workflow.</p><Link href={verified ? '/owner/properties/new' : '/owner/onboarding'}><Button className='mt-5'>{verified ? 'Add first property' : 'Start onboarding'}</Button></Link></div> : <div className='divide-y'>{properties.slice(0, 5).map((prop) => <div key={prop.id} className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'><div><h3 className='font-semibold'>{prop.locality || 'Property'}{prop.city ? ', ' + prop.city : ''}</h3><p className='text-sm text-slate-500'>{prop.type || 'Property'}{prop.doorNumber ? ' • ' + prop.doorNumber : ''}{prop.street ? ' ' + prop.street : ''}</p></div><Badge>{prop.status || 'PENDING'}</Badge></div>)}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
