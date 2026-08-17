'use client';

import React from 'react';

type StatusType =
  | 'PublishStatus'
  | 'OwnerState'
  | 'VerificationStatus'
  | 'ReviewState'
  | 'PaymentStatus'
  | 'ViewingStatus'
  | 'AgreementStatus'
  | 'SignalSeverity'
  | 'ReportStatus'
  | 'QuarantineStatus';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

const colorMap: Record<string, string> = {
  // Green (verified/success)
  VERIFIED: 'bg-green-100 text-green-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  APPROVED: 'bg-green-100 text-green-800',
  CAPTURED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CLEARED: 'bg-green-100 text-green-800',
  SIGNED: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  RESOLVED: 'bg-green-100 text-green-800',

  // Yellow (in-progress/warning)
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  KYC_REVIEW: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  AUTHORIZED: 'bg-yellow-100 text-yellow-800',
  PENDING_SCAN: 'bg-yellow-100 text-yellow-800',
  PROFILE_PENDING: 'bg-yellow-100 text-yellow-800',
  KYC_PENDING: 'bg-yellow-100 text-yellow-800',
  OWNER_KYC_PENDING: 'bg-yellow-100 text-yellow-800',
  PROPERTY_EVIDENCE_PENDING: 'bg-yellow-100 text-yellow-800',
  PROPOSED: 'bg-yellow-100 text-yellow-800',
  INVESTIGATING: 'bg-yellow-100 text-yellow-800',
  OPEN: 'bg-yellow-100 text-yellow-800',

  // Red (rejected/failed/critical)
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  INFECTED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-red-100 text-red-800',
  DISPUTED: 'bg-red-100 text-red-800',

  // Orange (changes-requested/high)
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-orange-100 text-orange-800',
  RESCHEDULED: 'bg-orange-100 text-orange-800',

  // Blue (draft/info)
  DRAFT: 'bg-blue-100 text-blue-800',
  RENTED: 'bg-blue-100 text-blue-800',
  UPLOADED: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',

  // Gray (archived/inactive/low)
  ARCHIVED: 'bg-gray-100 text-gray-800',
  REVOKED: 'bg-gray-100 text-gray-800',
  LOW: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DISMISSED: 'bg-gray-100 text-gray-800',
  INACTIVE: 'bg-gray-100 text-gray-800',

  // Purple (refund states)
  REFUND_PENDING: 'bg-purple-100 text-purple-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export function StatusBadge({ status, type, className = '' }: StatusBadgeProps) {
  const color = colorMap[status] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
      aria-label={`Status: ${status}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
