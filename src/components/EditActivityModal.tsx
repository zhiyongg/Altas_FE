//EditActivityModal.tsx
//only limit to activity, cant change for flight and hotel

import React, { useState, useEffect } from 'react';
import { TimelineItem, TransitInfo } from '../types';

interface EditActivityModalProps {
  isOpen: boolean;
  item: TimelineItem | null;
  onClose: () => void;
  onSave: (item: TimelineItem) => void;
}

// This list was declared but never used, while the <select> below hardcoded a
// *different* set of options that omitted 'nature' — so opening a park/garden
// item and saving it silently reclassified it as dining (the first option).
// One list now drives both.
const EDITABLE_TYPES: { value: TimelineItem['type']; label: string }[] = [
  { value: 'dining', label: 'Dining / Food' },
  { value: 'culture', label: 'Culture / Sightseeing' },
  { value: 'nature', label: 'Parks / Nature' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'activity', label: 'General Activity' },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Keyword sniffing is only a last resort: if the item already had structured
// transit data we keep its mode (and duration/distance) rather than flattening
// every leg to walk-or-train, which is what the old inline ternary did — it
// turned a 25-minute taxi ride into a "train" with no duration attached.
const inferTransitType = (
  description: string,
  previous?: TransitInfo,
): TransitInfo['type'] => {
  const text = description.toLowerCase();
  if (text.includes('walk')) return 'walk';
  if (text.includes('taxi') || text.includes('car') || text.includes('drive')) return 'taxi';
  if (text.includes('bus')) return 'bus';
  if (text.includes('subway') || text.includes('metro')) return 'subway';
  if (text.includes('train') || text.includes('rail')) return 'train';
  return previous?.type ?? 'train';
};

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [tag, setTag] = useState('Activity');
  const [type, setType] = useState<TimelineItem['type']>('activity');
  const [details, setDetails] = useState('');
  const [transitDesc, setTransitDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSubtitle(item.subtitle);
      setTime(item.time);
      setTag(item.tag);
      setType(item.type);
      setDetails(item.details || '');
      setTransitDesc(item.transitToNext?.description || '');
      setImageUrl(item.image || '');
    } else {
      setTitle('');
      setSubtitle('');
      setTime('12:00');
      setTag('Activity');
      setType('activity');
      setDetails('');
      setTransitDesc('');
      setImageUrl('');
    }
    setTimeError(null);
  }, [item, isOpen]);

  if (!isOpen) return null;

  // Flights and hotels carry structured booking data (flightDetails,
  // hotelDetails, terminal, bookingRef, nights) that this form has no
  // fields for. Editing them here used to silently drop that data on
  // save — so for those types we show a notice instead of the form
  // rather than let a "quick edit" corrupt the booking.
  const isRestrictedType = item != null && (item.type === 'flight' || item.type === 'hotel');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // The time field is free text, so "9", "9pm" or "25:00" used to be accepted
    // verbatim — then timeToMinutes() couldn't parse it and the item jumped to
    // the top of the day (and the backend rejected the edit).
    const normalizedTime = time.trim();
    if (!HHMM.test(normalizedTime)) {
      setTimeError('Use 24-hour HH:MM, e.g. 14:30.');
      return;
    }
    setTimeError(null);

    const trimmedTransit = transitDesc.trim();

    // Spread the original item first so fields this form doesn't expose
    // (mapCoords, price, rating, terminal, bookingRef, nights) survive the edit
    // instead of being dropped.
    const updated: TimelineItem = {
      ...(item ?? ({} as TimelineItem)),
      id: item?.id || `item-custom-${Date.now()}`,
      time: normalizedTime,
      type,
      tag,
      title: title.trim(),
      subtitle: subtitle.trim(),
      details: details.trim() || undefined,
      image: imageUrl.trim() || undefined,
      transitToNext: trimmedTransit
        ? {
            ...item?.transitToNext,
            type: inferTransitType(trimmedTransit, item?.transitToNext),
            description: trimmedTransit,
          }
        : undefined,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e3132]/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-[#e1e3e4]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#e1e3e4] bg-[#f8f9fa]">
          <h3 className="font-semibold text-lg text-[#191c1d]">
            {item ? 'Edit Timeline Item' : 'New Timeline Event'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#e7e8e9] text-[#727785] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {isRestrictedType ? (
          <div className="p-6 space-y-4 text-sm text-[#191c1d]">
            <p className="text-[#727785]">
              {item?.type === 'flight' ? 'Flights' : 'Hotel stays'} carry booking details
              (confirmation numbers, room/fare info) this editor can't safely change. Use
              "Change {item?.type === 'flight' ? 'Flight' : 'Accommodation'}" from the timeline instead.
            </p>
            <div className="flex justify-end pt-3 border-t border-[#e1e3e4]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#424754] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-[#191c1d]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#727785] mb-1">Time (24h)</label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    if (timeError) setTimeError(null);
                  }}
                  placeholder="14:30"
                  className={`w-full bg-[#f8f9fa] border rounded-xl px-3.5 py-2 text-sm focus:ring-2 outline-none ${
                    timeError
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]'
                      : 'border-[#e1e3e4] focus:ring-[#0058be]'
                  }`}
                  required
                />
                {timeError && (
                  <p className="mt-1 text-[11px] text-[#ba1a1a]">{timeError}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#727785] mb-1">Category Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TimelineItem['type'])}
                  className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
                >
                  {EDITABLE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1">Tag Label (e.g. Morning, Dinner)</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Afternoon, Cafe, Dinner..."
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Roppongi Hills Observation Deck"
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1">Subtitle / Summary</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Panoramic skyline views of Tokyo Tower"
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1">Notes / Booking Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Optional notes or reservation instructions..."
                rows={2}
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1">Transit Connector Description</label>
              <input
                type="text"
                value={transitDesc}
                onChange={(e) => setTransitDesc(e.target.value)}
                placeholder="e.g. Subway --- 15 mins ---> Shibuya Station"
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e1e3e4]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#424754] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0058be] text-white hover:bg-[#2170e4] transition-colors cursor-pointer shadow-xs"
              >
                Save Event
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};