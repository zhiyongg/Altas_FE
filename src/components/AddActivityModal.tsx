//AddActivityModal.tsx

import React, { useEffect, useState } from 'react';
import { ActivityOption } from '../types';

const API_BASE = 'http://localhost:8000';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddActivity: (activity: ActivityOption) => void;
  // Bias search results toward the trip's current area (e.g. the hotel or
  // the active day's first located stop) and drive the "distance" labels.
  // Optional — search still works without it, just without proximity
  // ranking/meaningful distances.
  originLat?: number;
  originLng?: number;
}

// Each pill maps to a Places Text Search query hint appended to whatever
// the user typed — Google's Text Search has no structured "category" param
// (that's Nearby Search-only, which can't take free text), so category
// filtering happens by shaping the query itself rather than filtering
// results client-side afterward.
const CATEGORIES: { id: string; label: string; queryHint: string }[] = [
  { id: 'All', label: 'All', queryHint: '' },
  { id: 'Dining', label: '🍜 Food & Dining', queryHint: 'restaurants' },
  { id: 'Culture', label: '🏛️ Museums & Culture', queryHint: 'museums and cultural attractions' },
  { id: 'Nature', label: '🌳 Parks & Nature', queryHint: 'parks and nature spots' },
  { id: 'Shopping', label: '🛍️ Shopping', queryHint: 'shopping' },
  { id: 'Tickets', label: '🎟️ Tickets & Tours', queryHint: 'tours and ticketed attractions' },
];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onAddActivity,
  originLat,
  originLng,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const categoryHint = CATEGORIES.find((c) => c.id === selectedCategory)?.queryHint || '';
    const combinedQuery = [searchQuery.trim(), categoryHint].filter(Boolean).join(' ') || 'top things to do nearby';

    const controller = new AbortController();
    // Debounce so each keystroke in the search box doesn't fire a fresh
    // Places API call.
    const handle = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      fetch(`${API_BASE}/activity/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: combinedQuery,
          latitude: originLat ?? null,
          longitude: originLng ?? null,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Activity search failed (${res.status})`);
          return res.json();
        })
        .then((data: { activities: ActivityOption[] }) => setActivities(data.activities))
        .catch((err) => {
          if (err.name !== 'AbortError') setError(err.message ?? 'Failed to load activities');
        })
        .finally(() => setIsLoading(false));
    }, 350);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [isOpen, searchQuery, selectedCategory, originLat, originLng]);

  if (!isOpen) return null;

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Google Places has no "sponsored" concept — this will typically be
  // empty, and the Featured section below simply won't render, which is
  // correct behavior rather than a bug.
  const featured = activities.filter((a) => a.isSponsored);
  const organic = activities.filter((a) => !a.isSponsored);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#2e3132]/30 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative border border-[#e1e3e4]">
        {/* Header */}
        <header className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-[#e1e3e4] shrink-0 bg-white z-20">
          <h2 className="font-semibold text-xl md:text-2xl text-[#191c1d] m-0">Add or Change Activity</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-10 bg-[#f8f9fa] border-b border-[#e1e3e4] px-6 md:px-8 py-4 flex flex-col gap-3 shrink-0 shadow-2xs">
          {/* Search Row */}
          <div className="flex flex-col md:flex-row gap-3 items-center w-full">
            <div className="relative w-full md:flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727785]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attractions, restaurants, museums..."
                className="w-full bg-white border border-[#e1e3e4] focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 rounded-full py-2.5 pl-11 pr-4 text-sm text-[#191c1d] placeholder:text-[#727785] transition-all outline-none"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-1 w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#2170e4] text-white shadow-xs'
                    : 'bg-white hover:bg-[#e7e8e9] text-[#424754] border border-[#e1e3e4]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f3f4f5] custom-scrollbar space-y-8">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-[#727785] text-sm">
              Searching activities...
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center py-16 text-[#ba1a1a] text-sm">
              {error}
            </div>
          )}

          {!isLoading && !error && activities.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[#727785] text-sm">
              No results — try a different search or category.
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Section 1: Featured Experiences (Sponsored) */}
              {featured.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#924700]">stars</span>
                    <h3 className="font-semibold text-lg text-[#191c1d] m-0">Featured Experiences</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {featured.map((act) => (
                      <div
                        key={act.id}
                        className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all group flex flex-col relative border border-[#e1e3e4]"
                      >
                        <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-md text-[10px] font-bold text-[#191c1d] tracking-wider uppercase shadow-xs">
                          SPONSORED
                        </div>

                        <div className="w-full h-40 rounded-xl overflow-hidden mb-3.5 relative bg-[#f3f4f5]">
                          {act.image && (
                            <img
                              src={act.image}
                              alt={act.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                          <button
                            onClick={(e) => toggleFav(act.id, e)}
                            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 backdrop-blur-xs hover:bg-white text-[#424754] hover:text-[#ba1a1a] transition-colors shadow-xs cursor-pointer"
                          >
                            <span
                              className={`material-symbols-outlined text-[16px] ${
                                favorites[act.id] ? 'fill text-[#ba1a1a]' : ''
                              }`}
                            >
                              favorite
                            </span>
                          </button>
                        </div>

                        <div className="flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-[#727785]">
                              {act.categoryIcon} {act.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-[#924700] fill">star</span>
                              <span className="text-xs font-bold text-[#191c1d]">{act.rating}</span>
                              <span className="text-[11px] text-[#727785]">({act.reviewsCount ?? 0})</span>
                            </div>
                          </div>

                          <h4 className="font-semibold text-base text-[#191c1d] mb-1 group-hover:text-[#0058be] transition-colors">
                            {act.title}
                          </h4>
                          <p className="text-xs text-[#424754] line-clamp-2 mb-4 leading-relaxed">
                            {act.description}
                          </p>

                          <div className="mt-auto pt-3 flex items-center justify-between border-t border-[#f3f4f5]">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-[#727785]">{act.distance}</span>
                              <span className="text-xs font-bold text-[#191c1d]">{act.priceLabel}</span>
                            </div>
                            <button
                              onClick={() => onAddActivity(act)}
                              className="bg-[#0058be] hover:bg-[#2170e4] text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shadow-xs active:scale-95 cursor-pointer"
                            >
                              Add to Itinerary
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Results */}
              <div>
                <h3 className="font-semibold text-lg text-[#191c1d] mb-4">
                  {searchQuery.trim() ? 'Search Results' : 'Popular Nearby Spots'}
                </h3>
                <div className="flex flex-col gap-3.5">
                  {organic.map((act) => (
                    <div
                      key={act.id}
                      className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all flex flex-row gap-4 items-center group border border-[#e1e3e4]"
                    >
                      <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-[#f3f4f5] border border-[#e1e3e4]">
                        {act.image && (
                          <img
                            src={act.image}
                            alt={act.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm md:text-base text-[#191c1d] truncate group-hover:text-[#0058be] transition-colors">
                              {act.title}
                            </h4>
                            <p className="text-xs text-[#424754] truncate mt-0.5">{act.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="material-symbols-outlined text-[14px] text-[#924700] fill">star</span>
                            <span className="text-xs font-bold text-[#191c1d]">{act.rating}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-[#727785]">
                            <span className="bg-[#f3f4f5] px-2.5 py-0.5 rounded-full text-[#424754] font-medium">
                              {act.categoryIcon} {act.category}
                            </span>
                            <span>{act.distance}</span>
                            {act.priceLabel && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-[#191c1d]">{act.priceLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-3 border-l border-[#e1e3e4]">
                        <button
                          onClick={() => onAddActivity(act)}
                          className="bg-[#f8f9fa] hover:bg-[#0058be] hover:text-white text-[#0058be] px-4 py-2 rounded-full text-xs font-semibold transition-all border border-[#0058be]/20 active:scale-95 cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};