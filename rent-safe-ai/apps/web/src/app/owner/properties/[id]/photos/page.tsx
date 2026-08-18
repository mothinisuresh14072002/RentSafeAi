'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient, ApiError } from '@/lib/api-client';
import { UploadCloud, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
}

const SortablePhoto = ({ photo, onRemove }: { photo: PhotoFile; onRemove: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-xl overflow-hidden border-2 bg-white ${
        isDragging ? 'border-indigo-500 shadow-xl' : 'border-gray-200'
      }`}
    >
      <div className="aspect-video relative">
        <img
          src={photo.preview}
          alt="Upload preview"
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div 
            {...attributes} 
            {...listeners}
            className="p-2 bg-white/20 hover:bg-white/40 rounded-full cursor-grab active:cursor-grabbing backdrop-blur-sm text-white"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <button
            onClick={() => onRemove(photo.id)}
            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full cursor-pointer text-white backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PropertyPhotosPage() {
  const { id } = useParams();
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file)
      }));
      setPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemove = (photoId: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== photoId);
      // Clean up object URLs to prevent memory leaks
      const removed = prev.find(p => p.id === photoId);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      setError('Please select at least one photo.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('images', photo.file);
      });
      // Optionally append order info
      formData.append('order', JSON.stringify(photos.map(p => p.id)));

      // In a real app, this sends to our StorageController
      await apiClient.post(`/properties/${id}/photos`, formData, {
        headers: {
          // 'Content-Type': 'multipart/form-data' is omitted so fetch sets boundary automatically
        }
      });
      
      router.push(`/owner/listings/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Property Photos</h1>
        <p className="mt-2 text-gray-600">Great photos help your property stand out. Drag to reorder.</p>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Upload Dropzone */}
          <div className="mb-8 border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 hover:border-indigo-400 transition-colors cursor-pointer relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="mx-auto h-12 w-12 text-indigo-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Click or drag photos here</h3>
            <p className="mt-1 text-sm text-gray-500">Up to 10 photos, max 5MB each (JPG, PNG, WEBP)</p>
          </div>

          {/* Draggable Grid */}
          {photos.length > 0 && (
            <div className="mb-8">
              <h4 className="font-medium text-gray-900 mb-4">Selected Photos ({photos.length})</h4>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={photos.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <SortablePhoto key={photo.id} photo={photo} onRemove={handleRemove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button 
              onClick={handleUpload} 
              isLoading={isUploading}
              disabled={photos.length === 0}
            >
              Upload & Continue
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
