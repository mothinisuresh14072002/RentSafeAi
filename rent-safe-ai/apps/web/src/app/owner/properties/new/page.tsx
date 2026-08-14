'use client';

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function PropertyWizardPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'APARTMENT',
    doorNumber: '',
    street: '',
    locality: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '',
    latitude: 13.0827,
    longitude: 80.2707,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiClient('/property', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      router.push('/owner/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Property Details</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="APARTMENT">Apartment</option>
                <option value="INDEPENDENT_HOUSE">Independent House</option>
                <option value="VILLA">Villa</option>
                <option value="BUILDER_FLOOR">Builder Floor</option>
              </select>
            </div>
            
            <Input 
              label="Door / Flat Number" 
              value={formData.doorNumber} 
              onChange={e => setFormData({ ...formData, doorNumber: e.target.value })} 
              required
            />
            <Input 
              label="Street Name" 
              value={formData.street} 
              onChange={e => setFormData({ ...formData, street: e.target.value })} 
              required
            />
            <Input 
              label="Locality" 
              value={formData.locality} 
              onChange={e => setFormData({ ...formData, locality: e.target.value })} 
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="City" 
                value={formData.city} 
                disabled
              />
              <Input 
                label="PIN Code" 
                value={formData.pinCode} 
                onChange={e => setFormData({ ...formData, pinCode: e.target.value })} 
                required
              />
            </div>
            
            <div className="pt-4">
              <Button type="submit" isLoading={saving}>Create Property</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
