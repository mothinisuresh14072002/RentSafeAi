'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, Loader2, Save } from 'lucide-react';

const PROPERTY_TYPES = [
  'Apartment', 'Condo', 'House', 'Cabin or Cottage', 'Room', 'Studio', 'Other'
];

const AMENITIES_LIST = [
  'Wifi', 'Full Kitchen', 'Washer & Dryer', 'Free Parking', 'Swimming Pool',
  'Hot Tub', '24/7 Security', 'Wheelchair Accessible', 'Elevator Access',
  'Dishwasher', 'Gym/Fitness Center', 'Air Conditioning', 'Balcony/Patio',
  'Smart TV', 'Coffee Maker'
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ListingEditor() {
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const [fields, setFields] = useState({
    type: '',
    name: '',
    description: '',
    location: { street: '', city: '', state: '', zipcode: '' },
    beds: '',
    baths: '',
    square_feet: '',
    amenities: [] as string[],
    rates: { weekly: '', monthly: '', nightly: '' },
    seller_info: { name: '', email: '', phone: '' }
  });

  const debouncedFields = useDebounce(fields, 1000);

  // Fetch initial data
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const data = await apiClient.get<any>(`/properties/${id}`);
        setFields(data);
        setLastSaved(new Date());
      } catch (err: any) {
        setError('Failed to load property data.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id]);

  // Auto-save logic
  useEffect(() => {
    if (loading) return; // Don't auto-save initial load

    const saveChanges = async () => {
      setSaving(true);
      try {
        await apiClient.put(`/properties/${id}`, debouncedFields);
        setLastSaved(new Date());
        setError('');
      } catch (err: any) {
        setError('Auto-save failed.');
      } finally {
        setSaving(false);
      }
    };

    saveChanges();
  }, [debouncedFields, id, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [outerKey, innerKey] = name.split('.');
      setFields((prev) => ({
        ...prev,
        [outerKey]: {
          ...(prev as any)[outerKey],
          [innerKey]: value,
        },
      }));
    } else {
      setFields((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFields((prev) => {
      const updated = [...prev.amenities];
      if (checked) {
        updated.push(value);
      } else {
        const index = updated.indexOf(value);
        if (index !== -1) updated.splice(index, 1);
      }
      return { ...prev, amenities: updated };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Listing Editor</h1>
          <p className="mt-2 text-gray-600">Editing {fields.name || 'Property'}</p>
        </div>
        
        <div className="flex items-center text-sm font-medium">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : saving ? (
            <span className="text-indigo-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </span>
          ) : lastSaved ? (
            <span className="text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Saved at {lastSaved.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8 space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Name</label>
                <Input name="name" value={fields.name} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  name="type"
                  value={fields.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={fields.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="location.street" value={fields.location.street} onChange={handleChange} placeholder="Street" />
              <Input name="location.city" value={fields.location.city} onChange={handleChange} placeholder="City" />
              <Input name="location.state" value={fields.location.state} onChange={handleChange} placeholder="State" />
              <Input name="location.zipcode" value={fields.location.zipcode} onChange={handleChange} placeholder="Zipcode" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Details & Amenities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                <Input type="number" name="beds" value={fields.beds} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                <Input type="number" name="baths" value={fields.baths} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                <Input type="number" name="square_feet" value={fields.square_feet} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl">
              {AMENITIES_LIST.map((amenity) => (
                <label key={amenity} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    value={amenity}
                    checked={fields.amenities?.includes(amenity)}
                    onChange={handleAmenitiesChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Rates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nightly</label>
                <Input type="number" name="rates.nightly" value={fields.rates.nightly} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Weekly</label>
                <Input type="number" name="rates.weekly" value={fields.rates.weekly} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monthly</label>
                <Input type="number" name="rates.monthly" value={fields.rates.monthly} onChange={handleChange} />
              </div>
            </div>
          </section>

        </CardBody>
      </Card>
    </div>
  );
}
