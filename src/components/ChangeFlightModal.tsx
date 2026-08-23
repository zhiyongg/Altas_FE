import React, { useState } from 'react';
import { FlightOption } from '../types';
import { flightOptionsList } from '../data/mockTripData';

interface ChangeFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFlight: (flight: FlightOption) => void;
}

export const ChangeFlightModal: React.FC<ChangeFlightModalProps> = ({
  isOpen,
  onClose,
  onSelectFlight,
}) => {
  const [selectedStops, setSelectedStops] = useState<string>('all');
  const [selectedAirline, setSelectedAirline] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'best' | 'price' | 'duration'>('best');

  if (!isOpen) return null;

  const filteredFlights = flightOptionsList.filter((flight) => {
    if (selectedAirline !== 'all' && !flight.airline.toLowerCase().includes(selectedAirline.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#2e3132]/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden relative border border-[#e1e3e4]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-[#e1e3e4] bg-white z-10 sticky top-0">
          <h2 className="font-semibold text-xl md:text-2xl text-[#191c1d]">Change Flight</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Sticky Filter Bar */}
        <div className="px-6 md:px-8 py-3 bg-[#f8f9fa] sticky top-[73px] z-10 border-b border-[#e1e3e4] flex gap-2.5 overflow-x-auto no-scrollbar items-center">
          <button
            onClick={() => setSelectedStops(selectedStops === 'all' ? 'direct' : 'all')}
            className={`px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              selectedStops !== 'all'
                ? 'bg-[#0058be] text-white border-[#0058be]'
                : 'bg-white border-[#c2c6d6] text-[#424754] hover:bg-[#f3f4f5]'
            }`}
          >
            Stops: {selectedStops === 'all' ? 'Any' : 'Direct'}
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
          </button>

          <button
            onClick={() => {
              const next = selectedAirline === 'all' ? 'singapore' : selectedAirline === 'singapore' ? 'qatar' : 'all';
              setSelectedAirline(next);
            }}
            className={`px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              selectedAirline !== 'all'
                ? 'bg-[#0058be] text-white border-[#0058be]'
                : 'bg-white border-[#c2c6d6] text-[#424754] hover:bg-[#f3f4f5]'
            }`}
          >
            Airlines: {selectedAirline === 'all' ? 'All' : selectedAirline.toUpperCase()}
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
          </button>

          <button className="px-4 py-2 rounded-full bg-white border border-[#c2c6d6] text-xs font-semibold text-[#424754] flex items-center gap-1 hover:bg-[#f3f4f5] transition-colors whitespace-nowrap cursor-pointer">
            Class: Economy
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
          </button>

          <button
            onClick={() => setSortBy(sortBy === 'best' ? 'price' : 'best')}
            className="px-4 py-2 rounded-full bg-white border border-[#c2c6d6] text-xs font-semibold text-[#424754] flex items-center gap-1 hover:bg-[#f3f4f5] transition-colors whitespace-nowrap ml-auto cursor-pointer"
          >
            Sort by: {sortBy === 'best' ? 'Best' : 'Cheapest'}
            <span className="material-symbols-outlined text-[16px]">sort</span>
          </button>
        </div>

        {/* Flight Results List */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-4 bg-[#f3f4f5] custom-scrollbar">
          {filteredFlights.map((flight) => (
            <div
              key={flight.id}
              className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] transition-all group flex flex-col md:flex-row gap-4 md:items-center justify-between border border-[#e1e3e4]"
            >
              {/* Airline Info */}
              <div className="flex items-center gap-3.5 w-full md:w-52 shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#f3f4f5] flex items-center justify-center overflow-hidden border border-[#e1e3e4]">
                  <img src={flight.airlineLogo} alt={flight.airline} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#191c1d]">{flight.airline}</div>
                  <div className="text-xs text-[#727785]">{flight.from} • {flight.flightCode}</div>
                </div>
              </div>

              {/* Flight Times & Route */}
              <div className="flex-1 flex items-center justify-between px-2 md:px-6">
                <div className="text-center">
                  <div className="font-bold text-lg md:text-xl text-[#191c1d]">{flight.departTime}</div>
                  <div className="text-xs text-[#727785]">{flight.date}</div>
                  <div className="text-[11px] text-[#727785]">Departure</div>
                </div>

                <div className="flex-1 flex flex-col items-center px-4 relative">
                  <div className="text-[11px] font-medium text-[#727785] mb-1">{flight.duration}</div>
                  <div className="w-full flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-[#c2c6d6] bg-white z-10"></div>
                    <div className="flex-1 h-[2px] bg-[#c2c6d6] relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-[#727785] whitespace-nowrap rounded-full border border-[#e1e3e4]">
                        {flight.layover}
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-[#c2c6d6] bg-white z-10"></div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-bold text-lg md:text-xl text-[#191c1d]">{flight.arriveTime}</div>
                  <div className="text-xs text-[#727785]">{flight.date}</div>
                  <div className="text-[11px] text-[#727785]">Arrival</div>
                </div>
              </div>

              {/* Action & Price Area */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-2 w-full md:w-36 shrink-0 border-t md:border-t-0 md:border-l border-[#e1e3e4] pt-3 md:pt-0 md:pl-6">
                <div className="font-bold text-lg md:text-xl text-[#191c1d]">
                  ${flight.price.toFixed(2)}
                </div>
                <button
                  onClick={() => onSelectFlight(flight)}
                  className="px-5 py-2 bg-[#0058be] text-white rounded-full text-xs font-semibold hover:bg-[#004395] transition-colors flex justify-center items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                >
                  Select
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              {/* Tags / Features */}
              <div className="w-full flex flex-wrap gap-2 pt-2 md:pt-0 border-t border-[#f3f4f5] md:border-t-0">
                {flight.nonRefundable && (
                  <span className="px-2.5 py-0.5 bg-[#edeeef] text-[#727785] rounded-full text-[11px] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">block</span> Non-refundable
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-[#ffdcc6] text-[#723600] rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">event_seat</span>
                  {flight.seatsLeft} Seat{flight.seatsLeft > 1 ? 's' : ''} Available
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
