import React from 'react';
import { Trip } from '../types';

interface SubPlannerBarProps {
  trip: Trip;
  isMapView: boolean;
  onToggleMapView: (isMap: boolean) => void;
  onEditTripDetails?: () => void;
  onBack?: () => void;
  isGenerating?: boolean;
}

export const SubPlannerBar: React.FC<SubPlannerBarProps> = ({
  trip,
  isMapView,
  onToggleMapView,
  onEditTripDetails,
  onBack,
  isGenerating = false,
}) => {
  return (
    <div className="sticky top-16 z-40 bg-[#f3f4f5] border-b border-[#e1e3e4] px-4 md:px-12 py-3.5 flex flex-wrap justify-between items-center w-full gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-[#424754] hover:text-[#0058be] hover:bg-[#e7e8e9] rounded-full transition-colors flex items-center justify-center cursor-pointer"
            title="Back to Trip Generator / All Trips"
            id="subplanner-back-arrow-btn"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
        )}
        <span className="material-symbols-outlined text-[#727785] text-[22px]">location_on</span>
        <h1 className="font-medium text-lg md:text-xl text-[#191c1d] flex flex-wrap items-center gap-1.5">
          <span>{trip.destination}</span>
          <span className="text-[#727785] text-sm md:text-base font-normal">
            | {trip.dates} | {trip.travelersCount} Travelers
          </span>
        </h1>
        {onEditTripDetails && (
          <button
            onClick={onEditTripDetails}
            className="p-1 text-[#727785] hover:text-[#0058be] hover:bg-[#e7e8e9] rounded-full transition-colors"
            title="Edit Destination & Dates"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs md:text-sm font-medium text-[#424754]">Map View</span>
        
        {/* Toggle Switch */}
        <button
          role="switch"
          aria-checked={isMapView}
          onClick={() => !isGenerating && onToggleMapView(!isMapView)}
          disabled={isGenerating}
          title={isGenerating ? "Map view will be available once itinerary generation is complete" : "Toggle Map View"}
          className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
            isGenerating 
              ? 'bg-[#e1e3e4] opacity-50 cursor-not-allowed'
              : isMapView 
                ? 'bg-[#0058be] cursor-pointer' 
                : 'bg-[#e1e3e4] cursor-pointer'
          }`}
        >
          <div
            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
              isMapView ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
