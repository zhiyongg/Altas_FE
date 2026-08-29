import React, { useState, useRef, useEffect } from 'react';
import { popularAirports, Airport } from '../data/airports';

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: string;
}

export const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAirports = popularAirports.filter((airport) => {
    const searchTerm = inputValue.toLowerCase();
    return (
      airport.city.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm) ||
      airport.code.toLowerCase().includes(searchTerm) ||
      airport.country.toLowerCase().includes(searchTerm)
    );
  });

  const handleSelect = (airport: Airport) => {
    const formatted = `${airport.city}, ${airport.country} (${airport.code})`;
    setInputValue(formatted);
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-[18px] text-[#0058be]">{icon}</span>
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required
        className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl pl-11 pr-4 py-3 text-sm text-[#191c1d] focus:bg-white focus:ring-2 focus:ring-[#0058be] outline-none transition-all font-medium"
      />
      
      {isOpen && inputValue.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-[#e1e3e4] max-h-64 overflow-y-auto custom-scrollbar">
          {filteredAirports.length > 0 ? (
            filteredAirports.map((airport) => (
              <div
                key={airport.code}
                onClick={() => handleSelect(airport)}
                className="px-4 py-3 hover:bg-[#f3f4f5] cursor-pointer flex items-center justify-between border-b border-[#f3f4f5] last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#191c1d]">
                    {airport.city}, {airport.country}
                  </span>
                  <span className="text-xs text-[#727785]">{airport.name}</span>
                </div>
                <div className="bg-[#d8e2ff] text-[#001a42] px-2 py-0.5 rounded text-xs font-bold">
                  {airport.code}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-[#727785]">No airports found. Press enter to use custom location.</div>
          )}
        </div>
      )}
    </div>
  );
};
