import React, { useState } from 'react';
import { NavTab } from '../types';

interface TopNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewTrip: () => void;
  onOpenFinalizePay: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewTrip,
  onOpenFinalizePay,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-4 md:px-12 w-full h-16 bg-[#f8f9fa] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border-b border-[#e1e3e4]">
      {/* Brand & Main Nav Links */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onSelectTab('trips')}
          className="font-medium text-2xl text-[#0058be] tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#0058be] text-[28px]">flight_takeoff</span>
          <span>AetherPlan</span>
        </button>

        <div className="hidden md:flex gap-4 ml-6 items-center">
          <button
            onClick={() => onSelectTab('trips')}
            className={`py-1 px-3 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'trips'
                ? 'text-[#0058be] font-bold border-b-2 border-[#0058be] rounded-none'
                : 'text-[#727785] hover:bg-[#f3f4f5] hover:text-[#191c1d]'
            }`}
          >
            Trips
          </button>
          <button
            onClick={() => onSelectTab('explore')}
            className={`py-1 px-3 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'text-[#0058be] font-bold border-b-2 border-[#0058be] rounded-none'
                : 'text-[#727785] hover:bg-[#f3f4f5] hover:text-[#191c1d]'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onSelectTab('archive')}
            className={`py-1 px-3 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'archive'
                ? 'text-[#0058be] font-bold border-b-2 border-[#0058be] rounded-none'
                : 'text-[#727785] hover:bg-[#f3f4f5] hover:text-[#191c1d]'
            }`}
          >
            Archive
          </button>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowSettings(false);
            setShowUserMenu(false);
          }}
          className="p-2 text-[#424754] hover:bg-[#f3f4f5] rounded-full transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0058be] rounded-full"></span>
        </button>

        {showNotifications && (
          <div className="absolute right-12 top-14 w-80 bg-white rounded-2xl shadow-xl border border-[#e1e3e4] p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#edeeef]">
              <span className="font-semibold text-sm text-[#191c1d]">Notifications</span>
              <span className="text-xs text-[#0058be] cursor-pointer">Mark all as read</span>
            </div>
            <div className="py-2 space-y-2 text-xs">
              <div className="p-2 bg-[#f3f4f5] rounded-xl flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-[#006c49] text-[18px]">check_circle</span>
                <div>
                  <p className="font-medium text-[#191c1d]">Sarah settled her share ($625.00)</p>
                  <span className="text-[#727785] text-[10px]">10 mins ago</span>
                </div>
              </div>
              <div className="p-2 bg-[#f8f9fa] rounded-xl flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-[#0058be] text-[18px]">auto_awesome</span>
                <div>
                  <p className="font-medium text-[#191c1d]">AI updated Day 2 coffee recommendations</p>
                  <span className="text-[#727785] text-[10px]">1 hour ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setShowSettings(!showSettings);
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
          className="p-2 text-[#424754] hover:bg-[#f3f4f5] rounded-full transition-colors cursor-pointer"
          title="Settings"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>

        {showSettings && (
          <div className="absolute right-4 top-14 w-64 bg-white rounded-2xl shadow-xl border border-[#e1e3e4] p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
            <span className="font-semibold text-sm text-[#191c1d] block mb-2">Trip Preferences</span>
            <div className="space-y-2 text-xs text-[#424754]">
              <div className="flex items-center justify-between py-1">
                <span>Currency Display</span>
                <span className="font-semibold text-[#191c1d]">JPY (¥) / USD ($)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>AI Auto-Optimization</span>
                <span className="text-[#006c49] font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Transit Mode</span>
                <span className="text-[#191c1d]">Public + Walking</span>
              </div>
              <button
                onClick={onOpenFinalizePay}
                className="w-full mt-3 py-2 bg-[#0058be] text-white rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors"
              >
                Open Split & Payment
              </button>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div
          onClick={() => {
            setShowUserMenu(!showUserMenu);
            setShowNotifications(false);
            setShowSettings(false);
          }}
          className="w-9 h-9 rounded-full bg-[#e1e3e4] overflow-hidden ml-1 cursor-pointer border border-[#c2c6d6] hover:ring-2 hover:ring-[#0058be] transition-all"
        >
          <img
            alt="User profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBYzdDP9iddcWnURiKbGQdHNORYUClbd3KWkZsLJqPTY7Nmpwr4sab7HCaYAA4-_C8ogKUs4f16-s3-DLMTsc4wdOxQIsU4sOHRyQ1J7rF5DSOBt9ARFw8_dcA_oPJV104hAlcmQEhmvDIC9ps8PkC5o9m8mWCOq3dLixXnm7IGhuL00YkdkgE8AEhvRdPyAa_Ua4L4Wxsefq89-9XAHeh9tMDylyv4hDc5nDRKpilcCz4UsFOKQfH"
          />
        </div>

        {showUserMenu && (
          <div className="absolute right-0 top-14 w-60 bg-white rounded-2xl shadow-xl border border-[#e1e3e4] p-4 z-50">
            <div className="flex items-center gap-3 pb-3 border-b border-[#edeeef]">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  alt="User"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBYzdDP9iddcWnURiKbGQdHNORYUClbd3KWkZsLJqPTY7Nmpwr4sab7HCaYAA4-_C8ogKUs4f16-s3-DLMTsc4wdOxQIsU4sOHRyQ1J7rF5DSOBt9ARFw8_dcA_oPJV104hAlcmQEhmvDIC9ps8PkC5o9m8mWCOq3dLixXnm7IGhuL00YkdkgE8AEhvRdPyAa_Ua4L4Wxsefq89-9XAHeh9tMDylyv4hDc5nDRKpilcCz4UsFOKQfH"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-semibold text-xs text-[#191c1d]">Elena Vance</p>
                <p className="text-[11px] text-[#727785]">elena@voyager.co</p>
              </div>
            </div>
            <div className="pt-2 text-xs space-y-1">
              <button onClick={() => onSelectTab('trips')} className="w-full text-left py-1.5 px-2 hover:bg-[#f3f4f5] rounded-lg">My Saved Itineraries</button>
              <button onClick={onOpenFinalizePay} className="w-full text-left py-1.5 px-2 hover:bg-[#f3f4f5] rounded-lg">Group Expenses & Bills</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
