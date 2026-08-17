'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            RentSafe <span className="text-indigo-600">AI</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Secure rental verification platform for Chennai
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardBody className="p-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Property Owner</h2>
              <p className="text-gray-600">
                Register your property, complete verification, and connect with verified tenants
              </p>
              <Link href="/login">
                <Button className="w-full mt-4">Owner Portal →</Button>
              </Link>
            </CardBody>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardBody className="p-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-slate-100">
                <svg className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Reviewer</h2>
              <p className="text-gray-600">
                Internal secure zone for verification staff and administrators
              </p>
              <Link href="/login">
                <Button variant="secondary" className="w-full mt-4">
                  Reviewer Portal →
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            © 2026 RentSafe AI · Chennai, India
          </p>
        </div>
      </div>
    </div>
  );
}
