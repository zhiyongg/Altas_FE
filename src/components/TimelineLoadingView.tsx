import React, { useState, useEffect } from 'react';

interface TimelineLoadingViewProps {
  destination?: string;
}

export const TimelineLoadingView: React.FC<TimelineLoadingViewProps> = ({
  destination = 'Destination',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Connecting to AI Planner Engine', icon: 'smart_toy', desc: 'Analyzing destination constraints and vibes...' },
    { title: 'Fetching Real-time Flight & Stay Options', icon: 'flight_takeoff', desc: 'Searching Atlas flights and verified hotels...' },
    { title: 'Optimizing Route & Transit Schedules', icon: 'route', desc: 'Calculating travel times and place ratings...' },
    { title: 'Finalizing Your Smart Timeline', icon: 'auto_awesome', desc: 'Assembling cost breakdown and day-by-day itinerary...' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex-1 bg-[#f8f9fa] p-4 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col items-center">
      {/* Header Banner */}
      <div className="max-w-3xl w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d8e2ff] text-[#001a42] text-xs font-semibold mb-3 shadow-xs animate-pulse">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          <span>AI Live Generation in Progress</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#191c1d] tracking-tight">
          Crafting your itinerary for <span className="text-[#0058be]">{destination}</span>
        </h2>
        <p className="text-xs md:text-sm text-[#727785] mt-1">
          Our AI agent is querying real-time flight rates, stay availabilities, and local places...
        </p>
      </div>

      {/* Progress Step Bar */}
      <div className="max-w-3xl w-full bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
                  isActive
                    ? 'border-[#0058be] bg-[#d8e2ff]/20 shadow-xs'
                    : isDone
                    ? 'border-[#6cf8bb] bg-[#6cf8bb]/10'
                    : 'border-[#e1e3e4] opacity-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 font-bold text-sm ${
                    isDone
                      ? 'bg-[#006c49] text-white'
                      : isActive
                      ? 'bg-[#0058be] text-white animate-bounce'
                      : 'bg-[#f3f4f5] text-[#727785]'
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#191c1d] leading-snug">{step.title}</h4>
                <p className="text-[10px] text-[#727785] mt-1 hidden md:block">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skeleton Loading Timeline */}
      <div className="max-w-3xl w-full relative space-y-6">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[#e1e3e4] -z-0 rounded-full"></div>

        {[1, 2, 3].map((itemIndex) => (
          <div key={itemIndex} className="relative pl-14 animate-pulse">
            <div className="absolute left-0 top-3 w-12 h-12 bg-[#e1e3e4] rounded-full border-4 border-[#f8f9fa]"></div>
            <div className="bg-white rounded-2xl p-5 border border-[#e1e3e4] space-y-3">
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 bg-[#e1e3e4] rounded-full"></div>
                <div className="w-16 h-5 bg-[#e1e3e4] rounded-full"></div>
              </div>
              <div className="w-3/4 h-6 bg-[#e1e3e4] rounded-lg"></div>
              <div className="w-1/2 h-4 bg-[#f3f4f5] rounded-md"></div>
              <div className="w-full h-12 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
