'use client';

import React, { useState, useEffect } from 'react';

interface AuditReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
  onValidChange: (valid: boolean) => void;
  label?: string;
  placeholder?: string;
  minLength?: number;
  className?: string;
}

export function AuditReasonField({
  value,
  onChange,
  isValid,
  onValidChange,
  label = 'Reason (Required)',
  placeholder = 'Enter a detailed reason for this action...',
  minLength = 10,
  className = '',
}: AuditReasonFieldProps) {
  useEffect(() => {
    const valid = value.trim().length >= minLength;
    if (valid !== isValid) onValidChange(valid);
  }, [value, minLength, isValid, onValidChange]);

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <span className="text-red-500 ml-1">*</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
          value.length > 0 && !isValid
            ? 'border-red-300 text-red-900'
            : 'border-gray-300'
        }`}
        aria-label={label}
        aria-required="true"
        aria-invalid={value.length > 0 && !isValid}
      />
      {value.length > 0 && !isValid && (
        <p className="mt-1 text-sm text-red-600">
          Minimum {minLength} characters required
        </p>
      )}
      {isValid && (
        <p className="mt-1 text-sm text-green-600">✓ Reason provided</p>
      )}
    </div>
  );
}
