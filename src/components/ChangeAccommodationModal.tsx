//ChangeAccommodationModal

import React, { useEffect, useMemo, useState } from 'react';
import { StayOption, RoomOption } from '../types';
import { currencySymbol } from '../currency';
import { API_BASE } from '../api';

// StayAPI rejects check_in dates in the past (HTTP 400 INVALID_DATES).
// This can happen when the user opens "Change Accommodation" on a trip
// whose original dates are now behind today. Clamp checkin to today and
// preserve the original trip length (minimum 1 night) as defense-in-depth
// alongside the backend's own clamping in tools.py.
function clampStayDates(
  checkin: string,
  checkout: string,
): { checkin: string; checkout: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let ci = new Date(checkin + 'T00:00:00');
  let co = new Date(checkout + 'T00:00:00');
  if (isNaN(ci.getTime())) ci = today;
  if (isNaN(co.getTime())) co = new Date(ci.getTime() + 86400000);

  const originalNights = Math.round(
    (co.getTime() - ci.getTime()) / 86400000,
  );

  if (ci < today) {
    ci = today;
    co = new Date(ci.getTime() + Math.max(originalNights, 1) * 86400000);
  }
  if (co <= ci) {
    co = new Date(ci.getTime() + 86400000);
  }

  return { checkin: fmt(ci), checkout: fmt(co) };
}

interface ChangeAccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called with the hotel AND the specific room the user picked — not
  // necessarily stay.selected_room, if they expanded room options and chose
  // a different one.
  onSelectStay: (stay: StayOption, room: RoomOption) => void;
  // Search context the backend needs to actually query StayAPI. Wire these
  // up from your trip state (the same dest/checkin/checkout the itinerary
  // was generated with). destId is nullable because it's only known once
  // the initial itinerary has come back with at least one hotel.
  destId: string | null;
  checkin: string;
  checkout: string;
  adults?: number;
  rooms?: number;
  childrenCount?: number;
}

// A hotel's selectable rooms: selected_room (the auto-picked cheapest) plus
// whatever else came back in available_rooms. Rooms with no room_name are
// zeroed placeholders (backend couldn't get per-room pricing) — filtered out
// since there's nothing meaningful to show or select.
function getSelectableRooms(stay: StayOption): RoomOption[] {
  // available_rooms is absent on hotels the backend hasn't priced yet, and
  // spreading `undefined` throws; selected_room can be missing for the same
  // reason.
  const all = [stay.selected_room, ...(stay.available_rooms ?? [])].filter(
    Boolean,
  ) as RoomOption[];
  const seen = new Set<string>();
  return all.filter((r) => {
    if (!r.room_name) return false;
    const key = `${r.room_name}-${r.price_per_night}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface RoomOptionRowProps {
  room: RoomOption;
  onSelect: () => void;
}

const RoomOptionRow: React.FC<RoomOptionRowProps> = ({ room, onSelect }) => (
  <div className="flex items-center justify-between gap-3 bg-white border border-[#e1e3e4] rounded-xl px-3.5 py-2.5">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#191c1d] truncate">
        {room.room_name}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {room.breakfast_included && (
          <span className="text-[10px] font-medium bg-[#e6f4ea] text-[#006c49] px-2 py-0.5 rounded-full">
            Breakfast included
          </span>
        )}
        {room.is_refundable && (
          <span className="text-[10px] font-medium bg-[#d8e2ff] text-[#001a42] px-2 py-0.5 rounded-full">
            Free cancellation
          </span>
        )}
        {!room.is_refundable && (
          <span className="text-[10px] font-medium bg-[#f3f4f5] text-[#727785] px-2 py-0.5 rounded-full">
            Non-refundable
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <div className="text-right">
        <p className="text-sm font-bold text-[#191c1d]">
          {currencySymbol(room.currency)}
          {room.price_per_night.toFixed(2)}
        </p>
        <p className="text-[10px] text-[#727785]">/ night</p>
      </div>
      <button
        onClick={onSelect}
        className="bg-[#0058be] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors shadow-2xs active:scale-95 cursor-pointer shrink-0"
      >
        Select
      </button>
    </div>
  </div>
);

export const ChangeAccommodationModal: React.FC<ChangeAccommodationModalProps> = ({
  isOpen,
  onClose,
  onSelectStay,
  destId,
  checkin,
  checkout,
  adults = 2,
  rooms = 1,
  childrenCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'featured'>(
    'featured',
  );
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>(
    {},
  );

  const [stays, setStays] = useState<StayOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // hotel_id -> is a /hotel/{id}/prices lookup in flight for this card
  const [pricingIds, setPricingIds] = useState<Record<string, boolean>>({});

  // Defense-in-depth: clamp past dates before they ever leave the browser.
  // The backend also clamps in tools.py, but doing it here avoids a round-trip
  // with bad data and keeps the request body inspectable in devtools.
  const safeDates = useMemo(
    () => clampStayDates(checkin, checkout),
    [checkin, checkout],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!destId) {
      setError(
        'No hotel search details available for this trip yet — try regenerating the itinerary.',
      );
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE}/hotel/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        dest_id: destId,
        checkin: safeDates.checkin,
        checkout: safeDates.checkout,
        adults,
        rooms,
        children: childrenCount, // backend field is still named "children"
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Hotel search failed (${res.status})`);
        return res.json();
      })
      // `data.hotels` is missing whenever the backend answers with an error or
      // a differently-shaped body, and the later `.filter(...)` on undefined
      // crashed the modal instead of surfacing anything.
      .then((data: { hotels?: StayOption[] }) => setStays(data.hotels ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError')
          setError(err.message ?? 'Failed to load hotels');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isOpen, destId, checkin, checkout, adults, rooms, childrenCount]);

  // Called when a card without a real price is shown/interacted with —
  // fetches just that one hotel's pricing instead of eagerly pricing every
  // result up front (see price_lookup_limit on the backend).
  const fetchPriceFor = (stay: StayOption) => {
    if (pricingIds[stay.hotel_id]) return;
    setPricingIds((prev) => ({ ...prev, [stay.hotel_id]: true }));

    fetch(`${API_BASE}/hotel/${stay.hotel_id}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin: safeDates.checkin, checkout: safeDates.checkout, adults, rooms }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('No rates available for this hotel');
        return res.json();
      })
      .then(
        (data: {
          selected_room: RoomOption;
          available_rooms: RoomOption[];
        }) => {
          setStays((prev) =>
            prev.map((s) =>
              s.hotel_id === stay.hotel_id
                ? {
                    ...s,
                    selected_room: data.selected_room,
                    available_rooms: data.available_rooms,
                  }
                : s,
            ),
          );
        },
      )
      .catch(() => {
        // Leave the card as-is on failure — "See rates" stays clickable to retry.
      })
      .finally(() => {
        setPricingIds((prev) => ({ ...prev, [stay.hotel_id]: false }));
      });
  };

  if (!isOpen) return null;

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRooms = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRooms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const priceOf = (stay: StayOption) => stay.selected_room?.price_per_night ?? 0;

  const filteredStays = stays
    .filter((stay) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const location = [stay.address, stay.city].filter(Boolean).join(', ');
        return (
          (stay.name || '').toLowerCase().includes(q) ||
          location.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price') {
        // Unpriced hotels carry price_per_night === 0, so a plain ascending
        // sort floated every "See rates" card to the top of a "cheapest first"
        // list. Keep them last instead.
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa <= 0 && pb <= 0) return 0;
        if (pa <= 0) return 1;
        if (pb <= 0) return -1;
        return pa - pb;
      }
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const featuredStays = filteredStays.filter((s) => s.is_sponsored);
  const regularStays = filteredStays.filter((s) => !s.is_sponsored);

  const locationLabel = (stay: StayOption) =>
    [stay.address, stay.city].filter(Boolean).join(', ') || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#2e3132]/35 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative border border-[#e1e3e4]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-[#e1e3e4] shrink-0 bg-white">
          <h2 className="font-semibold text-xl md:text-2xl text-[#191c1d]">
            Change Accommodation
          </h2>
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
              onClick={() =>
                setSortBy(sortBy === 'price' ? 'featured' : 'price')
              }
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xs transition-colors border cursor-pointer ${
                sortBy === 'price'
                  ? 'bg-[#0058be] text-white border-[#0058be]'
                  : 'bg-white text-[#191c1d] border-[#c2c6d6] hover:bg-[#f8f9fa]'
              }`}
            >
              Price
              <span className="material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </button>
            <button
              onClick={() =>
                setSortBy(sortBy === 'rating' ? 'featured' : 'rating')
              }
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xs transition-colors border cursor-pointer ${
                sortBy === 'rating'
                  ? 'bg-[#0058be] text-white border-[#0058be]'
                  : 'bg-white text-[#191c1d] border-[#c2c6d6] hover:bg-[#f8f9fa]'
              }`}
            >
              Rating
              <span className="material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 md:p-8 space-y-8 bg-[#f8f9fa] custom-scrollbar">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-[#727785] text-sm">
              Loading hotels...
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center py-16 text-[#ba1a1a] text-sm">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Featured Stays Section */}
              {featuredStays.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-lg text-[#191c1d]">
                      Featured Stays
                    </h3>
                    <span className="bg-[#b75b00]/10 text-[#924700] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      AD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {featuredStays.map((stay) => {
                      const selectableRooms = getSelectableRooms(stay);
                      const hasMultipleRooms = selectableRooms.length > 1;
                      const isExpanded = !!expandedRooms[stay.hotel_id];
                      const hasPrice = priceOf(stay) > 0;
                      const isPricing = !!pricingIds[stay.hotel_id];

                      return (
                        <div
                          key={stay.hotel_id}
                          className="bg-white rounded-3xl overflow-hidden group relative shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 border border-[#ffdcc6]/60 flex flex-col"
                        >
                          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 text-[#924700] shadow-xs">
                            <span className="material-symbols-outlined text-[13px]">
                              auto_awesome
                            </span>{' '}
                            Sponsored
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
                                <span className="material-symbols-outlined fill text-[#924700] text-[14px]">
                                  star
                                </span>
                                <span className="text-xs font-bold text-[#191c1d]">
                                  {stay.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-5 flex flex-col flex-1 justify-between">
                            <div>
                              <h4 className="font-semibold text-base leading-snug text-[#191c1d] mb-1">
                                {stay.name}
                              </h4>
                              {stay.star_rating != null && (
                                <div className="inline-flex items-center text-[#e5a900] bg-[#fff8e1] px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5">
                                  <span>{stay.star_rating}★ Hotel</span>
                                </div>
                              )}
                              <p className="text-xs text-[#727785] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">
                                  location_on
                                </span>
                                {locationLabel(stay)}
                              </p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-[#f3f4f5]">
                              {hasPrice ? (
                                <div className="flex items-end justify-between">
                                  <div>
                                    <p className="text-[11px] text-[#727785]">
                                      Per night
                                    </p>
                                    <p className="font-bold text-base text-[#191c1d]">
                                      {currencySymbol(
                                        stay.selected_room?.currency || 'USD',
                                      )}
                                      {priceOf(stay).toFixed(2)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      onSelectStay(stay, stay.selected_room)
                                    }
                                    className="bg-[#0058be] text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors shadow-xs active:scale-95 cursor-pointer"
                                  >
                                    Select
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => fetchPriceFor(stay)}
                                  disabled={isPricing}
                                  className="w-full bg-[#f3f4f5] text-[#0058be] hover:bg-[#d8e2ff] transition-colors px-4 py-2 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                                >
                                  {isPricing ? 'Checking rates…' : 'See rates'}
                                </button>
                              )}

                              {hasMultipleRooms && (
                                <>
                                  <button
                                    onClick={(e) =>
                                      toggleRooms(stay.hotel_id, e)
                                    }
                                    className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#0058be] hover:text-[#2170e4] cursor-pointer"
                                  >
                                    {isExpanded
                                      ? 'Hide room options'
                                      : `View ${selectableRooms.length} room options`}
                                    <span className="material-symbols-outlined text-[14px]">
                                      {isExpanded
                                        ? 'expand_less'
                                        : 'expand_more'}
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-2.5 space-y-2 animate-in fade-in duration-200">
                                      {selectableRooms.map((room, idx) => (
                                        <RoomOptionRow
                                          key={`${room.room_name}-${idx}`}
                                          room={room}
                                          onSelect={() =>
                                            onSelectStay(stay, room)
                                          }
                                        />
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* All Options Section */}
              <section>
                <h3 className="font-semibold text-lg text-[#191c1d] mb-4">
                  All Options
                </h3>
                {/* Previously the list just rendered empty, so a search with no
                    matches (or a backend that returned zero hotels) looked like
                    a broken modal. */}
                {filteredStays.length === 0 ? (
                  <p className="py-10 text-center text-sm text-[#727785]">
                    {searchQuery.trim()
                      ? `No stays match “${searchQuery.trim()}”.`
                      : 'No stays were found for these dates.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                  {regularStays.map((stay) => {
                    const selectableRooms = getSelectableRooms(stay);
                    const hasMultipleRooms = selectableRooms.length > 1;
                    const isExpanded = !!expandedRooms[stay.hotel_id];
                    const hasPrice = priceOf(stay) > 0;
                    const isPricing = !!pricingIds[stay.hotel_id];

                    return (
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
                                <span className="material-symbols-outlined text-[15px]">
                                  location_on
                                </span>
                                {locationLabel(stay)}
                              </p>
                              {(stay.star_rating != null ||
                                stay.rating != null) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {stay.star_rating != null && (
                                    <div className="flex items-center text-[#e5a900] bg-[#fff8e1] px-2 py-0.5 rounded-full text-[10px] font-bold">
                                      <span>{stay.star_rating}★ Hotel</span>
                                    </div>
                                  )}
                                  {stay.rating != null && (
                                    <div className="flex items-center gap-1.5 bg-[#f3f4f5] w-fit px-2.5 py-1 rounded-md">
                                      <span className="material-symbols-outlined fill text-[#191c1d] text-[14px]">
                                        star
                                      </span>
                                      <span className="text-xs font-bold text-[#191c1d]">
                                        {stay.rating.toFixed(1)}
                                      </span>
                                      {stay.review_count != null && (
                                        <span className="text-xs text-[#727785]">
                                          ({stay.review_count.toLocaleString()}{' '}
                                          reviews)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={(e) => toggleFav(stay.hotel_id, e)}
                              className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
                            >
                              <span
                                className={`material-symbols-outlined text-[20px] ${favorites[stay.hotel_id] ? 'fill text-[#ba1a1a]' : ''}`}
                              >
                                favorite
                              </span>
                            </button>
                          </div>

                          <div className="mt-4 border-t border-[#f3f4f5] pt-3">
                            {hasPrice ? (
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-[11px] text-[#727785]">
                                    Per night
                                  </p>
                                  <p className="font-bold text-lg text-[#191c1d]">
                                    {currencySymbol(
                                      stay.selected_room?.currency || 'USD',
                                    )}
                                    {priceOf(stay).toFixed(2)}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    onSelectStay(stay, stay.selected_room)
                                  }
                                  className="bg-[#f3f4f5] text-[#0058be] hover:bg-[#0058be] hover:text-white px-6 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer active:scale-95"
                                >
                                  Select
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => fetchPriceFor(stay)}
                                disabled={isPricing}
                                className="w-full bg-[#f3f4f5] text-[#0058be] hover:bg-[#d8e2ff] transition-colors px-4 py-2 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                              >
                                {isPricing ? 'Checking rates…' : 'See rates'}
                              </button>
                            )}

                            {hasMultipleRooms && (
                              <>
                                <button
                                  onClick={(e) => toggleRooms(stay.hotel_id, e)}
                                  className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#0058be] hover:text-[#2170e4] cursor-pointer"
                                >
                                  {isExpanded
                                    ? 'Hide room options'
                                    : `View ${selectableRooms.length} room options`}
                                  <span className="material-symbols-outlined text-[14px]">
                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="mt-2.5 space-y-2 animate-in fade-in duration-200">
                                    {selectableRooms.map((room, idx) => (
                                      <RoomOptionRow
                                        key={`${room.room_name}-${idx}`}
                                        room={room}
                                        onSelect={() =>
                                          onSelectStay(stay, room)
                                        }
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};