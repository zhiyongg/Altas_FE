import React, { useState } from 'react';
import { Trip } from '../types';
import { DateRangePicker } from './DateRangePicker';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (newTrip: Partial<Trip>) => void;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip,
}) => {
  const [destination, setDestination] = useState('Kyoto, Japan');
  const [dates, setDates] = useState('Nov 12 - Nov 18, 2025');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [travelersCount, setTravelersCount] = useState(4);
  const [budget, setBudget] = useState(2400);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTrip({
      destination,
      dates,
      travelersCount,
      budget,
    });
    onClose();
  };

  const destinationsQuick = [
    'Kyoto, Japan',
    'Seoul, South Korea',
    'Paris, France',
    'Reykjavik, Iceland',
    'Bangkok, Thailand',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e3132]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-[#e1e3e4]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#e1e3e4] bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0058be]">flight_takeoff</span>
            <h3 className="font-semibold text-lg text-[#191c1d]">Plan a New Trip</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#e7e8e9] text-[#727785] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-[#191c1d]">
          <div>
            <label className="block text-xs font-semibold text-[#727785] mb-1.5">Where to?</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Kyoto, Japan"
              className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {destinationsQuick.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDestination(d)}
                  className="text-[11px] bg-[#f3f4f5] hover:bg-[#d8e2ff] text-[#424754] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#727785]">Dates</label>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="text-[11px] text-[#0058be] font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                  <span>Calendar</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={dates}
                  onClick={() => setIsCalendarOpen(true)}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="Oct 10 - Oct 15, 2025"
                  className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl pl-3.5 pr-9 py-2.5 text-sm focus:ring-2 focus:ring-[#0058be] outline-none cursor-pointer"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0058be] hover:bg-[#d8e2ff]/50 p-1 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </button>
              </div>

              {isCalendarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={() => setIsCalendarOpen(false)}
                  />
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-[620px] shadow-2xl">
                    <DateRangePicker
                      value={dates}
                      onChange={(formatted) => {
                        setDates(formatted);
                      }}
                      onClose={() => setIsCalendarOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#727785] mb-1.5">Travelers</label>
              <input
                type="number"
                min="1"
                max="20"
                value={travelersCount}
                onChange={(e) => setTravelersCount(parseInt(e.target.value) || 1)}
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#727785] mb-1.5">Estimated Budget (USD)</label>
            <input
              type="number"
              step="50"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 1000)}
              className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0058be] outline-none"
            />
          </div>

          <div className="bg-[#f3f4f5] p-3.5 rounded-2xl flex items-start gap-2.5 border border-[#e1e3e4]">
            <span className="material-symbols-outlined text-[#0058be] text-[20px]">auto_awesome</span>
            <p className="text-xs text-[#424754] leading-relaxed">
              AetherPlan AI will automatically structure initial flights, top neighborhood stays, and timed daily itineraries for {destination}.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#e1e3e4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#727785] hover:bg-[#f3f4f5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#0058be] text-white hover:bg-[#2170e4] transition-colors cursor-pointer shadow-sm"
            >
              Generate Itinerary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
