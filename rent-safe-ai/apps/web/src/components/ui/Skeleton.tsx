'use client';

import React from 'react';

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded h-4 ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4 ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <SkeletonRow className="w-1/3" />
      <SkeletonRow className="w-full" />
      <SkeletonRow className="w-2/3" />
    </div>
  );
}
