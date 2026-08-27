import React, { useState } from 'react';
import { Trip, TravelVibe } from '../types';
import { DateRangePicker } from './DateRangePicker';

interface TripGenerationPageProps {
  onGenerateTrip: (tripData: Partial<Trip>) => void;
  onSelectExistingTrip: (trip: Trip) => void;
  currentTrip: Trip;
}

export const TripGenerationPage: React.FC<TripGenerationPageProps> = ({
  onGenerateTrip,
  onSelectExistingTrip,
  currentTrip,
}) => {
  const [destination, setDestination] = useState('Tokyo, Japan');
  const [departure, setDeparture] = useState('Singapore');
  const [dates, setDates] = useState('Oct 10 - Oct 15, 2025');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [infants, setInfants] = useState(0);
  const [budget, setBudget] = useState(2500);
  const [selectedVibes, setSelectedVibes] = useState<TravelVibe[]>(['moderate']);
  const [specialRequests, setSpecialRequests] = useState('Arriving in afternoon, prefer boutique hotels and artisanal coffee & ramen.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [budgetTouched, setBudgetTouched] = useState(false);
  const budgetError = budgetTouched && budget < 100;

  const availableVibes: TravelVibe[] = [
    'relaxed',
    'moderate',
    'packed'
  ];

  const popularDestinations = [
    { name: 'Tokyo, Japan', dates: 'Oct 10 - Oct 15, 2025', budget: 2500, vibes: ['packed'] as TravelVibe[], img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
    { name: 'Kyoto, Japan', dates: 'Nov 12 - Nov 18, 2025', budget: 2200, vibes: ['relaxed'] as TravelVibe[], img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
    { name: 'Seoul, South Korea', dates: 'Sep 20 - Sep 26, 2025', budget: 1900, vibes: ['moderate'] as TravelVibe[], img: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=600&q=80' },
    { name: 'Paris, France', dates: 'Dec 05 - Dec 11, 2025', budget: 3200, vibes: ['moderate'] as TravelVibe[], img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80' },
  ];

  const toggleVibe = (vibe: TravelVibe) => {
    setSelectedVibes([vibe]); // Enforce single selection for pacing style
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetTouched(true);
    if (budget < 100) return;
    setIsGenerating(true);

    const travelersCount = adults + children + infants;
    onGenerateTrip({
      destination,
      dates,
      travelersCount,
      budget,
      vibes: selectedVibes,
      specialRequests,
    });
    setIsGenerating(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] custom-scrollbar">
      {/* Hero Section with Generator Card */}
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d8e2ff] text-[#001a42] text-xs font-semibold mb-3">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>AI-Powered Itinerary Creator</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#191c1d] mb-3">
            Where to next?
          </h1>
          <p className="text-sm md:text-base text-[#424754]">
            Tell us your dream destination, vibe, and travel crew. AetherPlan AI will instantly craft your smart timeline, bookings, and transit routes.
          </p>
        </div>

        {/* Generator Form Box */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] border border-[#e1e3e4] mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#d8e2ff]/40 to-transparent pointer-events-none rounded-bl-full"></div>

          <form onSubmit={handleGenerate} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Departure */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0058be]">flight_takeoff</span>
                  Departure
                </label>
                <input
                  type="text"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  placeholder="e.g. Singapore"
                  required
                  className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-3 text-sm text-[#191c1d] focus:bg-white focus:ring-2 focus:ring-[#0058be] outline-none transition-all font-medium"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0058be]">location_on</span>
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  required
                  className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-3 text-sm text-[#191c1d] focus:bg-white focus:ring-2 focus:ring-[#0058be] outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Travel Dates & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Travel Dates */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0058be]">calendar_today</span>
                  Travel Dates
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dates}
                    onClick={() => setIsCalendarOpen(true)}
                    onChange={(e) => setDates(e.target.value)}
                    placeholder="e.g. Oct 10 - Oct 15, 2025"
                    required
                    className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl pl-4 pr-11 py-3 text-sm text-[#191c1d] focus:bg-white focus:ring-2 focus:ring-[#0058be] outline-none transition-all font-medium cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0058be] hover:bg-[#d8e2ff]/50 p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                    title="Select dates on calendar"
                  >
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </button>
                </div>

                {/* Calendar Dropdown Popover */}
                {isCalendarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:bg-transparent"
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

              {/* Budget */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0058be]">payments</span>
                  Estimated Budget PER PAX (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#727785]">$</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    onBlur={() => setBudgetTouched(true)}
                    placeholder="e.g. 2500"
                    required
                    className={`w-full bg-[#f8f9fa] border rounded-2xl pl-8 pr-4 py-3 text-sm text-[#191c1d] focus:bg-white focus:ring-2 outline-none transition-all font-medium ${
                      budgetError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-[#e1e3e4] focus:ring-[#0058be]'
                    }`}
                  />
                </div>
                {budgetError ? (
                  <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    Budget must be at least USD $100
                  </p>
                ) : (
                  <p className="text-[11px] text-[#727785] mt-1.5">Minimum USD $100</p>
                )}
              </div>
            </div>

            {/* Travelers */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#0058be]">group</span>
                Travelers
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Adults */}
                <div className="flex items-center gap-3 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-2.5">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-[#191c1d]">Adults</span>
                    <span className="block text-[11px] text-[#727785]">12+ years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-6 text-center font-bold text-[#191c1d] text-sm">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(adults + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center gap-3 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-2.5">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-[#191c1d]">Children</span>
                    <span className="block text-[11px] text-[#727785]">2 – 11 years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-6 text-center font-bold text-[#191c1d] text-sm">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(children + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center gap-3 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-2.5">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-[#191c1d]">Infants</span>
                    <span className="block text-[11px] text-[#727785]">Under 2 years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInfants(Math.max(0, infants - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-6 text-center font-bold text-[#191c1d] text-sm">{infants}</span>
                    <button
                      type="button"
                      onClick={() => setInfants(infants + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-[#e1e3e4] flex items-center justify-center text-[#424754] hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Vibes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#0058be]">tune</span>
                Trip Vibe & Style
              </label>
              <div className="flex flex-wrap gap-2">
                {availableVibes.map((vibe) => {
                  const isSelected = selectedVibes.includes(vibe);
                  return (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => toggleVibe(vibe)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0058be] text-white shadow-xs font-semibold'
                          : 'bg-[#f3f4f5] text-[#424754] hover:bg-[#e7e8e9]'
                      }`}
                    >
                      {vibe}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Preferences */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#727785] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#0058be]">edit_note</span>
                Special Requests or Preferences (Optional)
              </label>
              <input
                type="text"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Flight arrives at 2:30 PM, love Michelin ramen and craft coffee..."
                className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl px-4 py-2.5 text-sm text-[#191c1d] focus:bg-white focus:ring-2 focus:ring-[#0058be] outline-none transition-all"
              />
            </div>

            {/* Generate Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e4]">
              <div className="flex items-center gap-2 text-xs text-[#727785]">
                <span className="material-symbols-outlined text-[#006c49] text-[18px]">verified</span>
                <span>Includes auto-optimized maps, flights, and stay options</span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                id="generate-itinerary-btn"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    <span>Crafting Itinerary...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    <span>Generate Itinerary</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Current Active Trip Banner / Quick Resume
        <div className="mb-10 bg-gradient-to-r from-[#0058be] to-[#2170e4] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs uppercase tracking-wider text-[#d8e2ff] font-semibold flex items-center justify-center md:justify-start gap-1">
              <span className="material-symbols-outlined text-[16px]">bookmark</span>
              Active Itinerary in Workspace
            </span>
            <h3 className="text-xl font-bold">{currentTrip.title} • {currentTrip.destination}</h3>
            <p className="text-xs text-white/80">
              {currentTrip.dates} • {currentTrip.travelersCount} Travelers • {currentTrip.days.length} Days Planned
            </p>
          </div>

          <button
            onClick={() => onSelectExistingTrip(currentTrip)}
            id="open-current-itinerary-btn"
            className="px-6 py-3 rounded-full bg-white text-[#0058be] font-bold text-xs hover:bg-[#f8f9fa] shadow-sm transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>Open Itinerary Workspace</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div> */}

        {/* Recommended Inspiration & Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#191c1d]">Featured Destinations</h2>
            <span className="text-xs text-[#727785]">Select one to instantly customize</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularDestinations.map((dest) => (
              <div
                key={dest.name}
                onClick={() => {
                  setDestination(dest.name);
                  setDates(dest.dates);
                  setBudget(dest.budget);
                  setSelectedVibes(dest.vibes);
                }}
                className="group relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-white cursor-pointer hover:shadow-md transition-all hover:border-[#0058be]"
              >
                <div className="h-36 w-full overflow-hidden relative">
                  <img
                    src={dest.img}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-2.5 left-3 text-white font-bold text-sm drop-shadow-sm">
                    {dest.name}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#727785] mb-2">{dest.dates}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {dest.vibes.map((v) => (
                      <span key={v} className="text-[10px] bg-[#f3f4f5] text-[#424754] px-2 py-0.5 rounded-full">
                        {v}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#f3f4f5]">
                    <span className="font-semibold text-[#0058be]">${dest.budget} est.</span>
                    <span className="text-[11px] font-medium text-[#727785] group-hover:text-[#0058be] flex items-center gap-0.5">
                      Select
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
