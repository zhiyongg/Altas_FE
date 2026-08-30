import React, { useState, useMemo } from 'react';

interface DateRangePickerProps {
  value: string;
  onChange: (formattedRange: string, startDate: Date, endDate: Date) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Utility to parse standard trip date strings like "Oct 10 - Oct 15, 2025" or "Nov 12 - Nov 18, 2025"
export function parseDateRange(rangeStr: string): { start: Date; end: Date } {
  try {
    if (!rangeStr) {
      const now = new Date();
      const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      return { start: now, end: future };
    }

    // Try standard formats like "Oct 10 - Oct 15, 2025" or "Oct 10, 2025 - Oct 15, 2025" or "2025-10-10 - 2025-10-15"
    const parts = rangeStr.split('-').map((s) => s.trim());
    if (parts.length >= 2) {
      let startStr = parts[0];
      let endStr = parts[1];

      // If year is only in the second part (e.g. "Oct 10" and "Oct 15, 2025")
      const yearMatch = endStr.match(/\b(20\d\d)\b/) || rangeStr.match(/\b(20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

      if (!startStr.match(/\b(20\d\d)\b/)) {
        startStr = `${startStr}, ${year}`;
      }
      if (!endStr.match(/\b(20\d\d)\b/)) {
        endStr = `${endStr}, ${year}`;
      }

      const parsedStart = new Date(startStr);
      const parsedEnd = new Date(endStr);

      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        return { start: parsedStart, end: parsedEnd };
      }
    }
  } catch (err) {
    console.warn('Could not parse date range:', rangeStr, err);
  }

  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() + 14);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultEnd.getDate() + 5);
  return { start: defaultStart, end: defaultEnd };
}

export function formatDateRange(start: Date, end: Date): string {
  const startMonth = MONTH_SHORT[start.getMonth()];
  const startDay = start.getDate();
  const startYear = start.getFullYear();

  const endMonth = MONTH_SHORT[end.getMonth()];
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const initialDates = useMemo(() => parseDateRange(value), [value]);
  const [startDate, setStartDate] = useState<Date | null>(initialDates.start);
  const [endDate, setEndDate] = useState<Date | null>(initialDates.end);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [presetError, setPresetError] = useState(false);

  // Month navigation: view month based on start date or current date
  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date(initialDates.start);
    d.setDate(1);
    return d;
  });

  const nextViewMonth = useMemo(() => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + 1);
    return next;
  }, [viewDate]);

  const handlePrevMonth = () => {
    const prev = new Date(viewDate);
    prev.setMonth(prev.getMonth() - 1);
    // Don't allow navigating to months entirely before the current month
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (prev < currentMonthStart) return;
    setViewDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + 1);
    setViewDate(next);
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isBetween = (d: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    const time = d.getTime();
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return time > startTime && time < endTime;
  };

  const isPastDate = (date: Date) => {
    return date.getTime() < today.getTime();
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;
    setPresetError(false);
    if (!startDate || (startDate && endDate)) {
      // Starting new selection
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date.getTime() < startDate.getTime()) {
        // Clicked a date before start date, make this the new start
        setStartDate(date);
      } else {
        // Complete the range
        setEndDate(date);
        const formatted = formatDateRange(startDate, date);
        onChange(formatted, startDate, date);
      }
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      const formatted = formatDateRange(startDate, endDate);
      onChange(formatted, startDate, endDate);
    } else if (startDate && !endDate) {
      // Default to 4 days if only start date selected
      const autoEnd = new Date(startDate);
      autoEnd.setDate(autoEnd.getDate() + 4);
      const formatted = formatDateRange(startDate, autoEnd);
      onChange(formatted, startDate, autoEnd);
    }
    if (onClose) onClose();
  };

  const applyPreset = (days: number) => {
    if (!startDate) {
      setPresetError(true);
      return;
    }
    setPresetError(false);
    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1);

    setEndDate(end);
    setViewDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

    const formatted = formatDateRange(startDate, end);
    onChange(formatted, startDate, end);
  };

  // Helper to render a month calendar grid
  const renderMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Blank spaces for days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = isPastDate(date);
      const isStart = isSameDay(date, startDate);
      const isEnd = isSameDay(date, endDate);
      const effectiveEnd = endDate || (startDate && hoverDate && hoverDate > startDate ? hoverDate : null);
      const inRange = isBetween(date, startDate, effectiveEnd);

      let dayClasses = "h-9 w-9 text-xs flex items-center justify-center font-medium transition-all relative z-10 ";

      if (isPast) {
        dayClasses += "text-[#c8cbcf] cursor-not-allowed ";
      } else if (isStart && isEnd) {
        dayClasses += "bg-[#0058be] text-white rounded-full font-bold shadow-xs cursor-pointer ";
      } else if (isStart) {
        dayClasses += "bg-[#0058be] text-white rounded-l-full font-bold shadow-xs cursor-pointer ";
      } else if (isEnd) {
        dayClasses += "bg-[#0058be] text-white rounded-r-full font-bold shadow-xs cursor-pointer ";
      } else if (inRange) {
        dayClasses += "text-[#001a42] font-semibold cursor-pointer ";
      } else {
        dayClasses += "text-[#191c1d] hover:bg-[#e7e8e9] rounded-full cursor-pointer ";
      }

      days.push(
        <div
          key={`day-${d}`}
          className="relative flex items-center justify-center h-9 w-9"
          onMouseEnter={() => {
            if (startDate && !endDate && !isPast) {
              setHoverDate(date);
            }
          }}
        >
          {/* Background range highlight pill */}
          {inRange && (
            <div className="absolute inset-0 bg-[#d8e2ff]/60 -mx-1" />
          )}
          {isStart && effectiveEnd && !isEnd && (
            <div className="absolute top-0 bottom-0 right-0 left-1/2 bg-[#d8e2ff]/60" />
          )}
          {isEnd && startDate && !isStart && (
            <div className="absolute top-0 bottom-0 left-0 right-1/2 bg-[#d8e2ff]/60" />
          )}

          <button
            type="button"
            onClick={() => handleDateClick(date)}
            disabled={isPast}
            className={dayClasses}
          >
            {d}
          </button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-[280px]">
        <div className="text-center font-bold text-sm text-[#191c1d] mb-3">
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAY_NAMES.map((dn) => (
            <span key={dn} className="text-[11px] font-semibold text-[#727785]">
              {dn}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 justify-items-center">
          {days}
        </div>
      </div>
    );
  };

  const rangeDuration = useMemo(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays + 1} days (${diffDays} nights)`;
    }
    return 'Select return date';
  }, [startDate, endDate]);

  return (
    <div className="bg-white rounded-3xl border border-[#e1e3e4] shadow-2xl p-5 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150 z-50">
      {/* Header controls & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e1e3e4]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0058be] text-[22px]">date_range</span>
          <div>
            <h4 className="font-bold text-sm text-[#191c1d]">Select Travel Dates</h4>
            <p className="text-xs text-[#727785]">
              {startDate && endDate ? (
                <span className="text-[#0058be] font-semibold">
                  {formatDateRange(startDate, endDate)} • {rangeDuration}
                </span>
              ) : (
                'Choose your departure and return dates'
              )}
            </p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset(4)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#f3f4f5] hover:bg-[#d8e2ff] text-[#424754] font-medium transition-colors cursor-pointer"
            >
              Long Weekend (4D)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#f3f4f5] hover:bg-[#d8e2ff] text-[#424754] font-medium transition-colors cursor-pointer"
            >
              1 Week (7D)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#f3f4f5] hover:bg-[#d8e2ff] text-[#424754] font-medium transition-colors cursor-pointer"
            >
              2 Weeks (14D)
            </button>
          </div>
          {presetError && (
            <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Select a start date first
            </p>
          )}
        </div>
      </div>

      {/* Month Navigation & Two Months Grid */}
      <div className="relative py-4">
        {/* Navigation arrows */}
        <div className="flex justify-between items-center px-1 mb-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={(() => {
              const prev = new Date(viewDate);
              prev.setMonth(prev.getMonth() - 1);
              const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              return prev < currentMonthStart;
            })()}
            className="p-1.5 rounded-full hover:bg-[#f3f4f5] text-[#424754] hover:text-[#191c1d] transition-colors flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="Previous Month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <span className="text-xs text-[#727785] hidden md:inline-block font-medium">
            Click departure date, then click return date
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-full hover:bg-[#f3f4f5] text-[#424754] hover:text-[#191c1d] transition-colors flex items-center justify-center cursor-pointer"
            title="Next Month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
          {renderMonth(viewDate)}
          <div className="hidden md:block">
            {renderMonth(nextViewMonth)}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[#e1e3e4]">
        <button
          type="button"
          onClick={() => {
            setStartDate(null);
            setEndDate(null);
            setPresetError(false);
            setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
          }}
          className="text-xs font-semibold text-[#727785] hover:text-red-500 transition-colors cursor-pointer"
        >
          Clear Dates
        </button>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#424754] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0058be] text-white hover:bg-[#2170e4] transition-colors cursor-pointer shadow-sm"
          >
            Confirm Dates
          </button>
        </div>
      </div>
    </div>
  );
};
