'use client';

import React from 'react';
import Image from 'next/image';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css';

interface PropertyImagesProps {
  images: string[];
}

const PropertyImages: React.FC<PropertyImagesProps> = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <Gallery>
      <section className="bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="container mx-auto">
          {images.length === 1 ? (
            <Item
              original={images[0]}
              thumbnail={images[0]}
              width="1200"
              height="800"
            >
              {({ ref, open }) => (
                <div 
                  ref={ref as React.LegacyRef<HTMLDivElement>} 
                  onClick={open}
                  className="cursor-pointer overflow-hidden rounded-xl group relative"
                >
                  <Image
                    src={images[0]}
                    alt="Property"
                    className="object-cover h-[400px] w-full transition-transform duration-500 group-hover:scale-105"
                    width={1200}
                    height={800}
                    priority={true}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              )}
            </Item>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`${
                    images.length === 3 && index === 2
                      ? 'sm:col-span-2'
                      : 'col-span-1'
                  }`}
                >
                  <Item
                    original={image}
                    thumbnail={image}
                    width="1200"
                    height="800"
                  >
                    {({ ref, open }) => (
                      <div 
                        ref={ref as React.LegacyRef<HTMLDivElement>}
                        onClick={open}
                        className="cursor-pointer overflow-hidden rounded-xl group relative h-[300px] sm:h-[400px]"
                      >
                        <Image
                          src={image}
                          alt={`Property image ${index + 1}`}
                          className="object-cover h-full w-full transition-transform duration-500 group-hover:scale-105"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={index < 2}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    )}
                  </Item>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Gallery>
  );
};

export default PropertyImages;
