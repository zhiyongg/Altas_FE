import React, { useEffect, useState } from 'react';
import { StayOption } from '../types';
import { currencySymbol } from '../currency';

// Point this at wherever your FastAPI backend actually runs. In dev that's
// typically a different port than Vite (see the "running both" note at the
// bottom of this file), so this can't be a relative path unless you add a
// Vite proxy for it.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface ChangeAccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStay: (stay: StayOption) => void;
  // Search context the backend needs to actually query StayAPI. Wire these
  // up from your trip state (the same dest/checkin/checkout the itinerary
  // was generated with).
  destId: string;
  checkin: string;
  checkout: string;
  adults?: number;
  rooms?: number;
  children?: number;
}

export const ChangeAccommodationModal: React.FC<ChangeAccommodationModalProps> = ({
  isOpen,
  onClose,
  onSelectStay,
  destId,
  checkin,
  checkout,
  adults = 2,
  rooms = 1,
  children = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'featured'>('featured');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [stays, setStays] = useState<StayOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE}/hotel/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        dest_id: destId,
        checkin,
        checkout,
        adults,
        rooms,
        children,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Hotel search failed (${res.status})`);
        return res.json();
      })
      .then((data: { hotels: StayOption[] }) => setStays(data.hotels))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message ?? 'Failed to load hotels');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isOpen, destId, checkin, checkout, adults, rooms, children]);

  if (!isOpen) return null;

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredStays = stays
    .filter((stay) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const location = [stay.address, stay.city].filter(Boolean).join(', ');
        return stay.name.toLowerCase().includes(q) || location.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price') return a.selected_room.price_per_night - b.selected_room.price_per_night;
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const featuredStays = filteredStays.filter((s) => s.is_sponsored);
  const regularStays = filteredStays.filter((s) => !s.is_sponsored);

  const locationLabel = (stay: StayOption) => [stay.address, stay.city].filter(Boolean).join(', ') || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#2e3132]/35 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative border border-[#e1e3e4]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-[#e1e3e4] shrink-0 bg-white">
          <h2 className="font-semibold text-xl md:text-2xl text-[#191c1d]">Change Accommodation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        {/* Sticky Toolbar */}
        <div className="bg-[#f3f4f5] px-6 md:px-8 py-3.5 border-b border-[#e1e3e4] sticky top-0 z-20 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727785]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hotels, neighborhoods..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#e1e3e4] rounded-full text-sm text-[#191c1d] placeholder:text-[#727785] focus:ring-2 focus:ring-[#0058be] focus:border-transparent outline-none shadow-2xs"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setSortBy(sortBy === 'price' ? 'featured' : 'price')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xs transition-colors border cursor-pointer ${
                sortBy === 'price'
                  ? 'bg-[#0058be] text-white border-[#0058be]'
                  : 'bg-white text-[#191c1d] border-[#c2c6d6] hover:bg-[#f8f9fa]'
              }`}
            >
              Price
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'rating' ? 'featured' : 'rating')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xs transition-colors border cursor-pointer ${
                sortBy === 'rating'
                  ? 'bg-[#0058be] text-white border-[#0058be]'
                  : 'bg-white text-[#191c1d] border-[#c2c6d6] hover:bg-[#f8f9fa]'
              }`}
            >
              Rating
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 md:p-8 space-y-8 bg-[#f8f9fa] custom-scrollbar">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-[#727785] text-sm">Loading hotels...</div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center py-16 text-[#ba1a1a] text-sm">{error}</div>
          )}

          {!isLoading && !error && (
            <>
              {/* Featured Stays Section */}
              {featuredStays.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-lg text-[#191c1d]">Featured Stays</h3>
                    <span className="bg-[#b75b00]/10 text-[#924700] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      AD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {featuredStays.map((stay) => (
                      <div
                        key={stay.hotel_id}
                        className="bg-white rounded-3xl overflow-hidden group relative shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 border border-[#ffdcc6]/60 flex flex-col"
                      >
                        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 text-[#924700] shadow-xs">
                          <span className="material-symbols-outlined text-[13px]">auto_awesome</span> Sponsored
                        </div>

                        <div className="relative h-48 overflow-hidden bg-[#f3f4f5]">
                          {stay.image_url && (
                            <img
                              src={stay.image_url}
                              alt={stay.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                          {stay.rating != null && (
                            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                              <span className="material-symbols-outlined fill text-[#924700] text-[14px]">star</span>
                              <span className="text-xs font-bold text-[#191c1d]">{stay.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        <div className="p-5 flex flex-col flex-1 justify-between">
                          <div>
                            <h4 className="font-semibold text-base leading-snug text-[#191c1d] mb-1">
                              {stay.name}
                            </h4>
                            <p className="text-xs text-[#727785] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">location_on</span>
                              {locationLabel(stay)}
                            </p>
                          </div>

                          <div className="mt-5 flex items-end justify-between pt-3 border-t border-[#f3f4f5]">
                            <div>
                              <p className="text-[11px] text-[#727785]">Per night</p>
                              <p className="font-bold text-base text-[#191c1d]">
                                {currencySymbol(stay.selected_room.currency)}
                                {stay.selected_room.price_per_night.toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => onSelectStay(stay)}
                              className="bg-[#0058be] text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors shadow-xs active:scale-95 cursor-pointer"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* All Options Section */}
              <section>
                <h3 className="font-semibold text-lg text-[#191c1d] mb-4">All Options</h3>
                <div className="flex flex-col gap-4">
                  {regularStays.map((stay) => (
                    <div
                      key={stay.hotel_id}
                      className="bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row group hover:shadow-md transition-all border border-[#e1e3e4]"
                    >
                      <div className="relative w-full md:w-64 h-48 md:h-auto overflow-hidden shrink-0 bg-[#f3f4f5]">
                        {stay.image_url && (
                          <img
                            src={stay.image_url}
                            alt={stay.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                      </div>

                      <div className="p-5 flex flex-col justify-between w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-base md:text-lg text-[#191c1d] mb-1">
                              {stay.name}
                            </h4>
                            <p className="text-xs text-[#727785] flex items-center gap-1 mb-2.5">
                              <span className="material-symbols-outlined text-[15px]">location_on</span>
                              {locationLabel(stay)}
                            </p>
                            {stay.rating != null && (
                              <div className="flex items-center gap-1.5 bg-[#f3f4f5] w-fit px-2.5 py-1 rounded-md">
                                <span className="material-symbols-outlined fill text-[#191c1d] text-[14px]">star</span>
                                <span className="text-xs font-bold text-[#191c1d]">{stay.rating.toFixed(1)}</span>
                                {stay.review_count != null && (
                                  <span className="text-xs text-[#727785]">({stay.review_count.toLocaleString()} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => toggleFav(stay.hotel_id, e)}
                            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
                          >
                            <span className={`material-symbols-outlined text-[20px] ${favorites[stay.hotel_id] ? 'fill text-[#ba1a1a]' : ''}`}>
                              favorite
                            </span>
                          </button>
                        </div>

                        <div className="mt-4 flex items-end justify-between border-t border-[#f3f4f5] pt-3">
                          <div>
                            <p className="text-[11px] text-[#727785]">Per night</p>
                            <p className="font-bold text-lg text-[#191c1d]">
                              {currencySymbol(stay.selected_room.currency)}
                              {stay.selected_room.price_per_night.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => onSelectStay(stay)}
                            className="bg-[#f3f4f5] text-[#0058be] hover:bg-[#0058be] hover:text-white px-6 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer active:scale-95"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
