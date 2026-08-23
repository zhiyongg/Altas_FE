import React from 'react';
import { Trip } from '../types';

interface ArchiveViewProps {
  archivedTrips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  archivedTrips,
  onSelectTrip,
  onDeleteTrip,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] custom-scrollbar px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#e1e3e4] pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#191c1d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-[#0058be]">archive</span>
              Archived Plans
            </h1>
            <p className="text-sm text-[#727785] mt-1">
              View and restore itineraries you've saved to the archive.
            </p>
          </div>
        </div>

        {archivedTrips.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#e1e3e4] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] flex flex-col items-center max-w-xl mx-auto mt-8">
            <div className="w-16 h-16 rounded-full bg-[#f3f4f5] flex items-center justify-center text-[#727785] mb-4">
              <span className="material-symbols-outlined text-[32px]">folder_open</span>
            </div>
            <h3 className="text-lg font-bold text-[#191c1d] mb-1">No archived plans</h3>
            <p className="text-sm text-[#727785] max-w-sm mb-6">
              When you click the back arrow from an itinerary workspace, it will automatically be saved here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {archivedTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#0058be] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold bg-[#d8e2ff] text-[#001a42] px-3 py-1 rounded-full">
                      {trip.days.length} Days Planned
                    </span>
                    <span className="text-sm font-bold text-[#0058be]">
                      {trip.costs.currency}{trip.costs.usdEstimate.toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#191c1d] mb-1">
                    {trip.title}
                  </h3>
                  <p className="text-sm text-[#727785] flex items-center gap-1 mb-3">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {trip.destination}
                  </p>
                  <p className="text-xs text-[#727785] flex items-center gap-1 mb-4">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {trip.dates} | {trip.travelersCount} {trip.travelersCount === 1 ? 'Traveler' : 'Travelers'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {trip.vibes.map((vibe) => (
                      <span
                        key={vibe}
                        className="text-[10px] bg-[#f3f4f5] text-[#424754] px-2.5 py-1 rounded-full font-medium"
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#f3f4f5] pt-4">
                  <button
                    onClick={() => onDeleteTrip(trip.id)}
                    className="p-2 text-[#ba1a1a] hover:bg-[#ffebeb] rounded-full transition-colors flex items-center justify-center cursor-pointer"
                    title="Delete permanently"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>

                  <button
                    onClick={() => onSelectTrip(trip)}
                    className="px-5 py-2.5 bg-[#0058be] hover:bg-[#2170e4] text-white font-semibold text-xs rounded-full shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Restore & Open</span>
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
