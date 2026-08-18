import Image from 'next/image';
import Link from 'next/link';
import { Bed, Bath, Square, Banknote, MapPin } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';

export interface PropertyCardProps {
  property: {
    id: string;
    name: string;
    type: string;
    beds: number;
    baths: number;
    square_feet: number;
    images: string[];
    rates: {
      nightly?: number;
      weekly?: number;
      monthly?: number;
    };
    location: {
      city: string;
      state: string;
    };
  };
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const getRateDisplay = () => {
    const { rates } = property;

    if (rates.monthly) {
      return `₹${rates.monthly.toLocaleString()}/mo`;
    } else if (rates.weekly) {
      return `₹${rates.weekly.toLocaleString()}/wk`;
    } else if (rates.nightly) {
      return `₹${rates.nightly.toLocaleString()}/night`;
    }
    return 'Contact for pricing';
  };

  return (
    <Card className="relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={property.images[0] || '/images/property-placeholder.jpg'}
          alt={property.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-indigo-600 font-bold">
          {getRateDisplay()}
        </div>
      </div>
      
      <CardBody className="p-5">
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">{property.type}</span>
          <h3 className="text-xl font-bold text-gray-900 mt-1 truncate">{property.name}</h3>
        </div>

        <div className="flex justify-between items-center mb-6 text-gray-600 text-sm">
          <div className="flex items-center gap-1.5">
            <Bed className="w-4 h-4 text-gray-400" /> 
            <span className="font-medium">{property.beds} <span className="hidden sm:inline text-gray-500 font-normal">Beds</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{property.baths} <span className="hidden sm:inline text-gray-500 font-normal">Baths</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Square className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{property.square_feet} <span className="hidden sm:inline text-gray-500 font-normal">sqft</span></span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5 text-xs font-medium text-emerald-700 bg-emerald-50 p-3 rounded-lg">
          {property.rates.nightly && (
            <div className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Nightly</div>
          )}
          {property.rates.weekly && (
            <div className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Weekly</div>
          )}
          {property.rates.monthly && (
            <div className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Monthly</div>
          )}
        </div>

        <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="text-sm truncate max-w-[180px]">
              {property.location.city}, {property.location.state}
            </span>
          </div>
          <Link
            href={`/owner/properties/${property.id}`}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-center text-sm font-medium transition-colors shadow-sm shadow-indigo-200"
          >
            Details
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default PropertyCard;
