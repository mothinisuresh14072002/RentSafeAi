'use client';

import React from 'react';
import Link from 'next/link';

interface UnverifiedField {
  field: string;
  link: string;
  description: string;
}

interface ReVerificationWarningProps {
  fields: UnverifiedField[];
  className?: string;
}

export function ReVerificationWarning({ fields, className = '' }: ReVerificationWarningProps) {
  if (fields.length === 0) return null;

  return (
    <div
      className={`bg-amber-50 border-l-4 border-amber-500 p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Re-verification Required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p className="mb-2">
              The following fields need verification before your listings can be published:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {fields.map(({ field, link, description }) => (
                <li key={field}>
                  <Link href={link} className="underline hover:text-amber-900 font-medium">
                    {field}
                  </Link>
                  {description && ` — ${description}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
