import React from 'react';
import { Trip } from '../types';
import { featuredTrips } from '../data/featuredTrips';

interface ExploreViewProps {
  onSelectTrip: (trip: Trip) => void;
}

const tripImages: Record<string, string> = {
  'feat-tokyo': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  'feat-kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
  'feat-seoul': 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=600&q=80',
  'feat-paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
};

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectTrip }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] custom-scrollbar p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#191c1d] mb-2">Explore Destinations</h1>
          <p className="text-[#424754]">Discover our curated featured itineraries. Select one to instantly load it into your workspace.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTrips.map((trip) => {
            const img = tripImages[trip.id] || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80';
            
            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="group relative rounded-3xl overflow-hidden border border-[#e1e3e4] bg-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 duration-300"
              >
                <div className="h-48 w-full overflow-hidden relative">
                  <img
                    src={img}
                    alt={trip.destination}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl drop-shadow-md leading-tight">
                      {trip.title}
                    </h3>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-[#727785] mb-3">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>{trip.dates}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {trip.vibes.map((v) => (
                      <span key={v} className="text-[10px] uppercase tracking-wider font-semibold bg-[#f3f4f5] text-[#424754] px-2.5 py-1 rounded-full">
                        {v}
                      </span>
                    ))}
                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#e8f5e9] text-[#2e7d32] px-2.5 py-1 rounded-full">
                      {trip.days.length} Days
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-[#f3f4f5]">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#727785] uppercase tracking-wider">Est. Budget</span>
                      <span className="font-bold text-[#0058be]">${trip.budget}</span>
                    </div>
                    
                    <button className="w-8 h-8 rounded-full bg-[#f3f4f5] group-hover:bg-[#0058be] group-hover:text-white text-[#0058be] flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
