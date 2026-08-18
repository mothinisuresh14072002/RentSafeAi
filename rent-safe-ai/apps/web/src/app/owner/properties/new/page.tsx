'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, ApiError } from '@/lib/api-client';

const PROPERTY_TYPES = [
  'Apartment', 'Condo', 'House', 'Cabin or Cottage', 'Room', 'Studio', 'Other'
];

const AMENITIES_LIST = [
  'Wifi', 'Full Kitchen', 'Washer & Dryer', 'Free Parking', 'Swimming Pool',
  'Hot Tub', '24/7 Security', 'Wheelchair Accessible', 'Elevator Access',
  'Dishwasher', 'Gym/Fitness Center', 'Air Conditioning', 'Balcony/Patio',
  'Smart TV', 'Coffee Maker'
];

export default function NewPropertyWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fields, setFields] = useState({
    type: 'Apartment',
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

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In a real app, this goes to our NestJS endpoint
      const response = await apiClient.post<{ id: string }>('/properties', fields);
      
      // Redirect to the photo upload page as per Phase 3 workflow
      router.push(`/owner/properties/${response.id}/photos`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create property.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
        <p className="mt-2 text-gray-600">Step {step} of 3</p>
        
        {/* Progress Bar */}
        <div className="mt-4 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            {/* STEP 1: Basics */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    name="type"
                    value={fields.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing Name</label>
                  <Input
                    name="name"
                    value={fields.name}
                    onChange={handleChange}
                    placeholder="e.g. Beautiful Apartment in Chennai"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={fields.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add a description..."
                    required
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                  <h3 className="font-medium text-gray-900">Location</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input name="location.street" value={fields.location.street} onChange={handleChange} placeholder="Street" required />
                    <Input name="location.city" value={fields.location.city} onChange={handleChange} placeholder="City" required />
                    <Input name="location.state" value={fields.location.state} onChange={handleChange} placeholder="State" required />
                    <Input name="location.zipcode" value={fields.location.zipcode} onChange={handleChange} placeholder="Zipcode" required />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Details & Amenities */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                    <Input type="number" name="beds" value={fields.beds} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                    <Input type="number" name="baths" value={fields.baths} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                    <Input type="number" name="square_feet" value={fields.square_feet} onChange={handleChange} required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AMENITIES_LIST.map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          value={amenity}
                          checked={fields.amenities.includes(amenity)}
                          onChange={handleAmenitiesChange}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                  <h3 className="font-medium text-gray-900">Rates (Optional)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nightly Rate</label>
                      <Input type="number" name="rates.nightly" value={fields.rates.nightly} onChange={handleChange} placeholder="₹0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Weekly Rate</label>
                      <Input type="number" name="rates.weekly" value={fields.rates.weekly} onChange={handleChange} placeholder="₹0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Monthly Rate</label>
                      <Input type="number" name="rates.monthly" value={fields.rates.monthly} onChange={handleChange} placeholder="₹0" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Contact & Review */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                  <h3 className="font-medium text-gray-900">Contact Information</h3>
                  <p className="text-sm text-gray-500 mb-4">How should interested renters contact you?</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <Input name="seller_info.name" value={fields.seller_info.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input type="email" name="seller_info.email" value={fields.seller_info.email} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <Input type="tel" name="seller_info.phone" value={fields.seller_info.phone} onChange={handleChange} required />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 text-indigo-800 rounded-lg text-sm border border-indigo-100">
                  <h4 className="font-bold mb-1">Almost done!</h4>
                  <p>In the next step, you'll be able to upload beautiful photos of your property.</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between pt-6 border-t border-gray-100">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <div /> // Spacer
              )}

              {step < 3 ? (
                <Button type="submit">
                  Continue
                </Button>
              ) : (
                <Button type="submit" isLoading={loading}>
                  Save & Continue to Photos
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
