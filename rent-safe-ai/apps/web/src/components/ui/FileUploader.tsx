'use client';

import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from './StatusBadge';

interface FileUploaderProps {
  propertyId: string;
  targetType: 'DOCUMENT' | 'MEDIA';
  accept: string;
  maxSizeMB: number;
  onFinalized: (record: { id: string; quarantineStatus: string }) => void;
  label?: string;
  className?: string;
}

export function FileUploader({
  propertyId,
  targetType,
  accept,
  maxSizeMB,
  onFinalized,
  label = 'Upload File',
  className = '',
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setProgress(0);

    // Client-side validation
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    const ext = file.name.split('.').pop() || '';
    const mimeType = file.type || 'application/octet-stream';

    setUploading(true);
    try {
      // Step 1: Request presigned URL
      setProgress(10);
      const { uploadUrl, objectKey } = await apiClient.post<{
        uploadUrl: string;
        objectKey: string;
      }>('/storage/upload-request', {
        propertyId,
        targetType,
        extension: ext,
        mimeType,
        size: file.size,
      });

      // Step 2: Upload to S3-compatible storage (MinIO)
      setProgress(30);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      // Step 3: Finalize in backend
      setProgress(70);
      const checksum = await computeSHA256(file);
      const result = await apiClient.post<{ success: boolean; id: string }>('/storage/finalize', {
        propertyId,
        targetType,
        objectKey,
        checksum,
        mimeType,
      });

      setProgress(100);
      onFinalized({ id: result.id, quarantineStatus: 'PENDING_SCAN' });

      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          aria-label={label}
        />
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          isLoading={uploading}
        >
          {uploading ? `Uploading ${progress}%` : 'Choose File'}
        </Button>
        <span className="text-sm text-gray-500">Max {maxSizeMB}MB</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
