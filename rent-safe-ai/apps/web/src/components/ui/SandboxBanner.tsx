'use client';

import React from 'react';

export function SandboxBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`sticky top-0 z-40 bg-yellow-50 border-b-2 border-yellow-300 px-4 py-2 text-center ${className}`}
      role="alert"
    >
      <p className="text-sm font-medium text-yellow-800">
        ⚠️ Sandbox / Test Mode — No real data or money is involved
      </p>
    </div>
  );
}
