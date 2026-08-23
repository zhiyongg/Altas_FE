import React, { useState } from 'react';
import { Trip, TimelineItem } from '../types';

interface TimelineViewProps {
  trip: Trip;
  activeDayIndex: number;
  onSelectDay: (index: number) => void;
  onOpenAddActivity: () => void;
  onOpenChangeFlight: () => void;
  onOpenChangeHotel: () => void;
  onEditItem: (item: TimelineItem) => void;
  onDeleteItem: (itemId: string) => void;
  onProceedToSplitPay: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  trip,
  activeDayIndex,
  onSelectDay,
  onOpenAddActivity,
  onOpenChangeFlight,
  onOpenChangeHotel,
  onEditItem,
  onDeleteItem,
  onProceedToSplitPay,
}) => {
  const [expandedTransits, setExpandedTransits] = useState<Record<string, boolean>>({});

  const toggleTransit = (itemId: string) => {
    setExpandedTransits((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const currentDay = trip.days[activeDayIndex] || trip.days[0];

  const getCategoryIcon = (type: string, tag: string) => {
    switch (type) {
      case 'flight':
        return 'flight_land';
      case 'hotel':
        return 'hotel';
      case 'dining':
        return 'local_dining';
      case 'nightlife':
        return 'nightlife';
      case 'culture':
        return 'park';
      case 'shopping':
        return 'shopping_bag';
      case 'activity':
        return 'local_activity';
      default:
        if (tag.toLowerCase().includes('market')) return 'storefront';
        return 'location_on';
    }
  };

  return (
    <section className="flex-1 bg-[#f8f9fa] p-4 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar">
      {/* Date Pills */}
      <div className="flex overflow-x-auto gap-2.5 pb-3 mb-8 no-scrollbar max-w-3xl mx-auto">
        {trip.days.map((day, idx) => (
          <button
            key={day.dayNumber}
            onClick={() => onSelectDay(idx)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeDayIndex === idx
                ? 'bg-[#2170e4] text-white shadow-sm font-semibold'
                : 'bg-[#f3f4f5] text-[#191c1d] hover:bg-[#e1e3e4]'
            }`}
          >
            {day.dateLabel}
          </button>
        ))}
      </div>

      {/* Timeline Max Container */}
      <div className="relative max-w-3xl mx-auto">
        {/* Continuous Vertical Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-[#e1e3e4] -z-0 rounded-full"></div>

        {/* Timeline Events for Current Day */}
        <div className="space-y-6">
          {currentDay.items.map((item) => {
            const iconName = getCategoryIcon(item.type, item.tag);
            const isTransitExpanded = !!expandedTransits[item.id];

            return (
              <div key={item.id} className="relative pl-14 group">
                {/* Round Category Icon on Timeline */}
                <div className="absolute left-0 top-3 w-12 h-12 bg-[#f3f4f5] rounded-full flex items-center justify-center border-4 border-[#f8f9fa] text-[#727785] group-hover:text-[#0058be] group-hover:border-[#d8e2ff] transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] z-10">
                  <span className="material-symbols-outlined text-[22px]">{iconName}</span>
                </div>

                {/* Event Card */}
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] group-hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all border border-[#f3f4f5] hover:border-[#adc6ff]/40 flex gap-3 items-start relative">
                  <span
                    className="material-symbols-outlined text-[#c2c6d6] mt-1 cursor-grab hover:text-[#727785] transition-colors"
                    title="Drag to reorder"
                  >
                    drag_indicator
                  </span>

                  <div className="flex-grow w-full">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-[#f3f4f5] text-[#727785] rounded-full text-xs font-semibold mb-1.5">
                          {item.tag}
                        </span>
                        <h3 className="font-medium text-lg md:text-xl text-[#191c1d] leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-sm text-[#727785] mt-0.5">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg md:text-xl text-[#0058be] font-bold tracking-tight">
                          {item.time}
                        </span>
                        <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditItem(item)}
                            className="text-[#727785] hover:text-[#0058be] hover:bg-[#f3f4f5] p-1.5 rounded-full transition-colors"
                            title="Edit activity"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="text-[#727785] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 p-1.5 rounded-full transition-colors"
                            title="Remove activity"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Rich Details if available */}
                    {item.details && (
                      <p className="text-xs text-[#424754] bg-[#f8f9fa] p-2.5 rounded-xl mt-2 border border-[#edeeef]">
                        {item.details}
                      </p>
                    )}

                    {/* Image Embed if available (e.g. Omoide Yokocho) */}
                    {item.image && (
                      <div className="mt-3.5 h-36 rounded-xl overflow-hidden shadow-xs relative group/img">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-white text-xs font-medium drop-shadow-sm">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Special Action Buttons for Flights & Hotels */}
                    {item.type === 'flight' && (
                      <div className="mt-3 pt-3 border-t border-[#f3f4f5] flex flex-wrap gap-2">
                        <button
                          onClick={onOpenChangeFlight}
                          className="bg-[#d8e2ff] text-[#001a42] px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#adc6ff] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                          Change Flight
                        </button>
                        <span className="text-xs text-[#727785] flex items-center px-2">
                          Terminal: {item.terminal || 'T2'} • Ref: {item.bookingRef || 'JL-001'}
                        </span>
                      </div>
                    )}

                    {item.type === 'hotel' && (
                      <div className="mt-3 pt-3 border-t border-[#f3f4f5] flex flex-wrap gap-2">
                        <button
                          onClick={onOpenChangeHotel}
                          className="bg-[#d8e2ff] text-[#001a42] px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#adc6ff] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                          Change Hotel
                        </button>
                        <button
                          onClick={() => alert(`Showing map location for ${item.title}`)}
                          className="bg-[#f3f4f5] text-[#0058be] px-3 py-1 rounded-full text-xs font-medium hover:bg-[#e1e3e4] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">map</span> View Map
                        </button>
                        <button
                          onClick={() => alert(`Keio Plaza Hotel: Shinjuku City, Tokyo. 5 Nights Confirmed.`)}
                          className="bg-[#f3f4f5] text-[#0058be] px-3 py-1 rounded-full text-xs font-medium hover:bg-[#e1e3e4] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span> Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transit Detail Connector */}
                {item.transitToNext && (
                  <div className="relative my-3 pt-1 pb-1">
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => toggleTransit(item.id)}
                        className="flex items-center gap-2 text-[#727785] text-xs font-medium bg-[#f3f4f5] hover:bg-[#e7e8e9] hover:text-[#191c1d] px-3.5 py-1.5 rounded-full transition-all cursor-pointer w-fit shadow-2xs group/btn"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#0058be]">
                          {item.transitToNext.type === 'subway'
                            ? 'train'
                            : item.transitToNext.type === 'train'
                            ? 'train'
                            : item.transitToNext.type === 'walk'
                            ? 'directions_walk'
                            : 'directions_bus'}
                        </span>
                        <span>{item.transitToNext.description}</span>
                        <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-y-0.5 transition-transform">
                          {isTransitExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isTransitExpanded && (
                        <div className="bg-white p-3 rounded-xl border border-[#e1e3e4] shadow-xs text-xs text-[#424754] space-y-1.5 animate-in fade-in duration-200">
                          <div className="flex justify-between font-medium">
                            <span className="text-[#0058be]">Route Navigation</span>
                            <span className="text-[#006c49]">Optimal Route</span>
                          </div>
                          <p>
                            • Board from departure platform with IC Card (Suica / Pasmo).
                          </p>
                          <p>
                            • Transfer time: Approx. 4 mins. Frequency: Every 5-8 mins.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Activity Button */}
        <div className="relative pl-14 my-8">
          <button
            onClick={onOpenAddActivity}
            className="w-full py-4 border-2 border-dashed border-[#c2c6d6] rounded-2xl text-[#727785] hover:text-[#0058be] hover:border-[#0058be] hover:bg-[#d8e2ff]/10 transition-all text-sm font-semibold flex items-center justify-center gap-2 bg-white cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add Activity
          </button>
        </div>

        {/* Cost Summary Box (Matching Screen 1 bottom card) */}
        <div className="relative pl-14 mb-12">
          <div className="bg-[#f3f4f5] rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-[#e1e3e4]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#727785] font-medium text-sm">Estimated Total Cost</span>
              <div className="text-right">
                <span className="font-medium text-2xl text-[#191c1d]">
                  ¥{trip.costs.activities + trip.costs.accommodation}
                </span>
                <span className="text-sm font-normal text-[#727785] ml-2">
                  (${trip.costs.usdEstimate.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-[#e1e3e4]">
              <div className="flex justify-between text-xs text-[#727785]">
                <span>Activities & Dining</span>
                <span className="font-medium text-[#191c1d]">¥{trip.costs.activities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[#727785]">
                <span>Accommodation (5 Nights)</span>
                <span className="font-medium text-[#191c1d]">¥{trip.costs.accommodation.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[#727785]">
                <span>Flights (Estimate)</span>
                <span className="font-medium text-[#191c1d]">¥{trip.costs.flights.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onProceedToSplitPay}
              className="w-full mt-6 bg-[#0058be] text-white py-3.5 rounded-full font-bold shadow-md hover:bg-[#2170e4] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              Proceed to Split & Pay
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
