'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, ApiError } from '@/lib/api-client';
import { SandboxBanner } from '@/components/ui/SandboxBanner';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePhone = (ph: string): boolean => {
    const digits = ph.replace(/\D/g, '');
    return digits.length === 10 && /^[6-9]/.test(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalized = phone.replace(/\D/g, '');
    if (!validatePhone(normalized)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    const fullPhone = `+91${normalized}`;
    setLoading(true);

    try {
      await apiClient.post('/auth/otp/request', { phone: fullPhone }, { skipAuthRefresh: true });
      router.push(`/login/otp?phone=${encodeURIComponent(fullPhone)}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many requests. Please wait a minute before trying again.');
        } else {
          setError(err.message || 'Failed to send OTP. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SandboxBanner />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">RentSafe AI</h1>
            <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Phone Number Login</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      disabled={loading}
                      required
                      aria-label="10-digit mobile number"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <Button type="submit" isLoading={loading} className="w-full">
                  Send OTP
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  We'll send a 6-digit code to verify your number
                </p>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
