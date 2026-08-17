'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient, ApiError } from '@/lib/api-client';
import { storeTokens } from '@/lib/auth';
import { SandboxBanner } from '@/components/ui/SandboxBanner';

function OtpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!phone) {
      router.push('/login');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phone, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const result = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; role: string };
      }>('/auth/otp/verify', { phone, code }, { skipAuthRefresh: true });

      storeTokens(result.accessToken, result.refreshToken, result.user.role as any);

      // Redirect based on role
      if (result.user.role === 'OWNER') {
        router.push('/owner/dashboard');
      } else if (result.user.role === 'REVIEWER' || result.user.role === 'ADMIN') {
        router.push('/reviewer/dashboard');
      } else {
        router.push('/access-denied');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          if (err.message.includes('exceeded')) {
            setError('Maximum attempts exceeded. Please request a new OTP.');
          } else if (err.message.includes('expired')) {
            setError('OTP has expired. Please request a new one.');
          } else {
            setError('Invalid OTP code. Please check and try again.');
          }
        } else {
          setError(err.message || 'Verification failed');
        }
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/otp/request', { phone }, { skipAuthRefresh: true });
      setCanResend(false);
      setCountdown(60);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
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
            <h1 className="text-3xl font-bold text-gray-900">Verify OTP</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter the 6-digit code sent to {phone}
            </p>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Verification Code</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                    required
                    autoFocus
                    aria-label="6-digit verification code"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <Button type="submit" isLoading={loading} className="w-full">
                  Verify & Sign In
                </Button>

                <div className="text-center">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Resend available in {countdown}s
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to phone entry
                </button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OtpPageContent />
    </Suspense>
  );
}
