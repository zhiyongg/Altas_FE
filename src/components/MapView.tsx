import React, { useState, useEffect } from 'react';
import { Trip, TimelineItem } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet icon paths in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  trip: Trip;
  activeDayIndex: number;
  onOpenAddActivity: () => void;
  onItemClick?: (item: TimelineItem) => void;
}

// Helper component to auto-center bounds
const MapBoundsFitter: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, positions]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  trip,
  activeDayIndex,
  onOpenAddActivity,
  onItemClick,
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const activeDay = trip.days[activeDayIndex] || trip.days[0];
  const items = activeDay?.items || [];
  
  // Extract coordinates for the day's route
  const validCoordinates: [number, number][] = [];
  const mapItems = items.map((item, index) => {
    let lat = item.mapCoords?.lat;
    let lng = item.mapCoords?.lng;
    
    // Fallbacks if hotel/airport locations are embedded elsewhere
    if (!lat || !lng) {
      if (item.type === 'hotel' && item.hotelDetails) {
         // mock coords if missing in hotel details? The backend should provide them
      }
    }
    
    if (lat && lng) {
      validCoordinates.push([lat, lng]);
    }
    return { ...item, lat, lng, pinNumber: index + 1 };
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[1600px] mx-auto p-4 md:p-8 gap-6 h-[calc(100vh-120px)]">
      {/* Left Side: Itinerary (40%) */}
      <section className="w-full md:w-[42%] lg:w-[38%] flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden h-full border border-[#e1e3e4]">
        {/* Header */}
        <div className="p-4 border-b border-[#e7e8e9] flex justify-between items-center bg-[#f8f9fa]">
          <div>
            <h2 className="font-medium text-xl text-[#191c1d]">{trip.destination.split(',')[0]} Trip</h2>
            <p className="text-xs font-medium text-[#424754] mt-0.5">
              {activeDay?.dateLabel || 'Day 1'}
            </p>
          </div>
          <button
            onClick={onOpenAddActivity}
            className="w-9 h-9 bg-[#0058be]/10 rounded-full flex items-center justify-center text-[#0058be] hover:bg-[#0058be]/20 transition-colors cursor-pointer"
            title="Add activity"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar space-y-4">
          {mapItems.map((item, idx) => {
            const isSelected = selectedPinId === item.id;
            const isLast = idx === mapItems.length - 1;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedPinId(item.id);
                  if (onItemClick) onItemClick(item);
                }}
                className="flex gap-3 group cursor-pointer"
              >
                {/* Number node */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 border-2 transition-all ${
                      isSelected
                        ? 'bg-[#0058be] text-white border-white shadow-sm scale-110'
                        : 'bg-[#e7e8e9] text-[#424754] border-white group-hover:bg-[#adc6ff]'
                    }`}
                  >
                    {item.pinNumber}
                  </div>
                  {!isLast && <div className="w-px h-full bg-[#e7e8e9] mt-1"></div>}
                </div>

                {/* Card */}
                <div className="flex-1 pb-4">
                  <div
                    className={`rounded-xl p-3.5 transition-all border ${
                      isSelected
                        ? 'bg-white border-[#0058be] shadow-md relative overflow-hidden'
                        : 'bg-[#f8f9fa] border-transparent hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#0058be]"></div>
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-[#0058be]">{item.time}</span>
                      <span className="material-symbols-outlined text-[#424754] text-[18px]">
                        {item.type === 'flight'
                          ? 'flight_land'
                          : item.type === 'hotel'
                          ? 'hotel'
                          : item.type === 'shopping'
                          ? 'shopping_bag'
                          : item.type === 'culture'
                          ? 'park'
                          : 'restaurant'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#191c1d]">{item.title}</h3>
                    <p className="text-xs text-[#424754] mt-0.5">{item.subtitle}</p>
                    
                    {item.details && (
                      <p className="text-[11px] text-[#727785] mt-1 font-medium">{item.details}</p>
                    )}

                    {item.image && (
                      <div className="mt-2.5 h-24 w-full rounded-lg overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Transit Indicator */}
                  {item.transitToNext && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#f3f4f5] rounded-full text-[11px] text-[#424754]">
                        <span className="material-symbols-outlined text-[14px]">
                          {item.transitToNext.type === 'subway'
                            ? 'subway'
                            : item.transitToNext.type === 'bus'
                            ? 'directions_bus'
                            : 'directions_walk'}
                        </span>
                        <span>{item.transitToNext.description}</span>
                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                      </div>
                      <div className="h-px flex-1 bg-[#e7e8e9]"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Side: Interactive Map (60%) */}
      <section className="w-full md:w-[58%] lg:w-[62%] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden relative border border-[#e1e3e4] h-[400px] md:h-full z-0">
        
        {validCoordinates.length > 0 ? (
          <MapContainer 
            center={validCoordinates[0]} 
            zoom={12} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapBoundsFitter positions={validCoordinates} />
            
            {/* Draw the route line */}
            <Polyline 
              positions={validCoordinates} 
              color="#0058be" 
              weight={3} 
              dashArray="6, 6" 
              opacity={0.8}
            />

            {/* Render markers for each stop */}
            {mapItems.map(item => {
              if (item.lat && item.lng) {
                // Create custom div icon to match the previous UI style
                const customIcon = L.divIcon({
                  className: 'custom-map-pin',
                  html: `<div style="
                    width: 32px; 
                    height: 32px; 
                    background-color: ${selectedPinId === item.id ? '#0058be' : '#f3f4f5'}; 
                    color: ${selectedPinId === item.id ? 'white' : '#424754'};
                    border: 2px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: transform 0.2s;
                    transform: scale(${selectedPinId === item.id ? 1.1 : 1.0});
                  ">
                    ${item.pinNumber}
                  </div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                  popupAnchor: [0, -16]
                });

                return (
                  <Marker 
                    key={item.id} 
                    position={[item.lat, item.lng]} 
                    icon={customIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedPinId(item.id);
                        if (onItemClick) onItemClick(item);
                      }
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="min-w-[180px]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-[#0058be]">{item.time}</span>
                          <span className="text-[10px] bg-[#d8e2ff] text-[#001a42] px-1.5 py-0.5 rounded font-semibold">
                            {item.tag}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#191c1d] leading-tight mb-1">{item.title}</h4>
                        <p className="text-[11px] text-[#727785] line-clamp-2">{item.subtitle}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4f7f6]">
            <span className="material-symbols-outlined text-[48px] text-[#727785] opacity-50 mb-2">map</span>
            <p className="text-sm font-medium text-[#727785]">No location data available for this day.</p>
          </div>
        )}
      </section>
    </div>
  );
};
