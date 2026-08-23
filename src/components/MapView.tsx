import React, { useState } from 'react';
import { Trip, TimelineItem } from '../types';

interface MapViewProps {
  trip: Trip;
  activeDayIndex: number;
  onOpenAddActivity: () => void;
  onItemClick?: (item: TimelineItem) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  trip,
  activeDayIndex,
  onOpenAddActivity,
  onItemClick,
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string>('item-map-5');
  const [zoomLevel, setZoomLevel] = useState<number>(12);

  // Map items specifically calibrated for Tokyo interactive map overlay
  const mapItems: (TimelineItem & { pinNumber: number; pinPos: { top: string; left: string } })[] = [
    {
      id: 'item-map-1',
      time: '08:00',
      type: 'dining',
      tag: 'Morning',
      title: 'Tsukiji Outer Market',
      subtitle: 'Fresh seafood breakfast and street food stalls.',
      pinNumber: 1,
      pinPos: { top: '75%', left: '72%' },
      transitToNext: { type: 'subway', description: 'Subway' },
    },
    {
      id: 'item-map-2',
      time: '14:30',
      type: 'flight',
      tag: 'Flight',
      title: 'Arrival at Narita (NRT)',
      subtitle: 'Flight NH123 • Terminal 1',
      pinNumber: 2,
      pinPos: { top: '15%', left: '84%' },
      transitToNext: { type: 'bus', description: 'Bus' },
    },
    {
      id: 'item-map-3',
      time: '15:00',
      type: 'shopping',
      tag: 'Shopping',
      title: 'Harajuku Takeshita Street',
      subtitle: 'Explore trendy boutiques and unique street snacks.',
      pinNumber: 3,
      pinPos: { top: '56%', left: '34%' },
      transitToNext: { type: 'walk', description: 'Walk' },
    },
    {
      id: 'item-map-4',
      time: '16:00',
      type: 'hotel',
      tag: 'Hotel',
      title: 'Check-in: Keio Plaza Hotel',
      subtitle: 'Shinjuku City. Confirmation: #KP8829',
      pinNumber: 4,
      pinPos: { top: '48%', left: '46%' },
      transitToNext: { type: 'subway', description: 'Subway' },
    },
    {
      id: 'item-map-5',
      time: '17:30',
      type: 'culture',
      tag: 'Culture',
      title: 'Meiji Jingu Shrine',
      subtitle: 'Explore the forested grounds before sunset.',
      pinNumber: 5,
      pinPos: { top: '58%', left: '64%' },
      transitToNext: { type: 'walk', description: 'Walk' },
    },
    {
      id: 'item-map-6',
      time: '18:30',
      type: 'dining',
      tag: 'Dinner',
      title: 'Omoide Yokocho (Dinner)',
      subtitle: 'Iconic narrow alleyway packed with tiny yakitori stalls.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRup3AoSQ6Lqw4UKD2_WSll_Ajf41JwoLcFS5HwpZ5kpQos_YbZVIFqWFKG2_7dKxm1WpPfbAIStCWCF-jMRSaqwSUTmvnz_8AJV8cScaMlTEhiCk0W0sxTFuW1-XlNsKixgfXfKv2WBnNbZzdt46GC4bFnGq7c0g_3ssVvIz9_R98WFUAgZu3yC4Q8zXTVj502X1L7NK_KUKYvW2LYForkje363yQ7MrwPpsVC4ulQzjaZCvWpVQ_',
      pinNumber: 6,
      pinPos: { top: '78%', left: '78%' },
    },
  ];

  const activeItem = mapItems.find((i) => i.id === selectedPinId) || mapItems[4];

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[1600px] mx-auto p-4 md:p-8 gap-6 h-[calc(100vh-120px)]">
      {/* Left Side: Itinerary (40%) */}
      <section className="w-full md:w-[42%] lg:w-[38%] flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden h-full border border-[#e1e3e4]">
        {/* Header */}
        <div className="p-4 border-b border-[#e7e8e9] flex justify-between items-center bg-[#f8f9fa]">
          <div>
            <h2 className="font-medium text-xl text-[#191c1d]">{trip.destination.split(',')[0]} Trip</h2>
            <p className="text-xs font-medium text-[#424754] mt-0.5">
              {trip.days[activeDayIndex]?.dateLabel || 'Day 1 • Oct 10'}
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

                    {item.image && (
                      <div className="mt-2.5 h-24 w-full rounded-lg overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {item.id === 'item-map-5' && (
                      <div className="mt-2 flex gap-1.5">
                        <span className="px-2 py-0.5 bg-[#f3f4f5] text-[#424754] rounded-full text-[11px]">
                          Sightseeing
                        </span>
                        <span className="px-2 py-0.5 bg-[#f3f4f5] text-[#424754] rounded-full text-[11px]">
                          Nature
                        </span>
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
      <section className="w-full md:w-[58%] lg:w-[62%] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden relative border border-[#e1e3e4] h-[400px] md:h-full">
        {/* Map Background Canvas */}
        <div
          className="absolute inset-0 w-full h-full bg-[#f4f7f6]"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA3k95lLjqVVFuNeLZntPT6zvj_JZZGMJr2LXclnegOYfq6-FCGGHe5_ztM7MNfdmaO6k4cN9g2-BMAZhjIzJrGpa2S81Itllvh2PykGLMKx-p44ylglmQ0sYmPNQrp96hc4phqArRkBXaT0K6f2NEfyosuD74T-_GNmK_IUa2VVQA3pBK0nFbaQgSHRinmr_tWCRoCge-uFKI-unh2DUffBIjfq8rIOxmIMwZsh-AoV1aGSGPJAcpX')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'contrast(102%) brightness(98%)',
          }}
        ></div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
          <button
            onClick={() => alert('Centered on current itinerary location.')}
            className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-[#424754] hover:text-[#0058be] transition-colors cursor-pointer"
            title="My Location"
          >
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
          <div className="flex flex-col bg-white rounded-full shadow-md overflow-hidden">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 1, 18))}
              className="w-9 h-9 flex items-center justify-center text-[#424754] hover:text-[#0058be] transition-colors border-b border-[#e7e8e9] cursor-pointer"
              title="Zoom in"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 1, 8))}
              className="w-9 h-9 flex items-center justify-center text-[#424754] hover:text-[#0058be] transition-colors cursor-pointer"
              title="Zoom out"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
        </div>

        {/* SVG Dashed Route Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 1000 800">
          <path
            d="M 720 600 C 780 400, 840 200, 840 120 C 680 280, 340 380, 340 450 C 340 520, 460 480, 640 480 C 700 520, 780 700, 780 620"
            fill="transparent"
            stroke="#0058be"
            strokeWidth="3"
            strokeDasharray="6, 6"
            strokeLinecap="round"
            className="opacity-70"
          />
        </svg>

        {/* Numbered Pins */}
        {mapItems.map((item) => {
          const isSelected = selectedPinId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedPinId(item.id)}
              className="absolute transform -translate-x-1/2 -translate-y-full group cursor-pointer z-20"
              style={{ top: item.pinPos.top, left: item.pinPos.left }}
            >
              {/* Pin circle */}
              <div
                className={`rounded-full flex items-center justify-center transition-transform shadow-md border-2 border-white ${
                  isSelected
                    ? 'w-10 h-10 bg-[#0058be] text-white scale-110 z-30 ring-4 ring-[#0058be]/20'
                    : 'w-8 h-8 bg-[#f3f4f5] text-[#424754] hover:scale-110 hover:bg-[#d8e2ff]'
                }`}
              >
                <span className="text-xs font-bold">{item.pinNumber}</span>
              </div>

              {/* Pin arrow tip */}
              <div
                className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mx-auto -mt-[1px] ${
                  isSelected ? 'border-t-[#0058be]' : 'border-t-[#f3f4f5]'
                }`}
              ></div>

              {/* Tooltip Card for Selected Pin */}
              {isSelected && (
                <div className="bg-white rounded-xl p-3 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[210px] shadow-lg border border-[#e1e3e4] z-40 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#0058be]">{item.time}</span>
                    <span className="text-[10px] bg-[#d8e2ff] text-[#001a42] px-1.5 py-0.5 rounded font-semibold">
                      {item.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#191c1d] leading-tight line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-[#727785] mt-0.5 line-clamp-1">{item.subtitle}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Map Scale Bar */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs rounded-lg py-1.5 px-3 shadow-md border border-[#e7e8e9] flex items-center gap-2 z-30">
          <span className="text-[11px] font-semibold text-[#424754]">1km</span>
          <div className="w-16 h-[2px] bg-[#727785] relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-2 bg-[#727785]"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-2 bg-[#727785]"></div>
          </div>
          <span className="text-[10px] text-[#727785]">Zoom: {zoomLevel}x</span>
        </div>
      </section>
    </div>
  );
};
