import React, { useState, useRef, useEffect } from 'react';
import {
  Trip,
  TimelineItem,
  ChatMessage,
  FlightOption,
  StayOption,
  RoomOption,
  ActivityOption,
  NavTab,
} from './types';
import { recalculateSchedule } from './utils/recalculateSchedule';
import { recalculateRoute } from './utils/routeApi';
import { timeToMinutes } from './utils/time';
import { currencySymbol } from './currency';
import {
  initialTokyoTrip as mockTokyoTrip,
  initialChatMessages,
} from './data/mockTripData';
import { TopNavBar } from './components/TopNavBar';
import { SubPlannerBar } from './components/SubPlannerBar';
import { AICoPilot } from './components/AICoPilot';
import { TimelineView } from './components/TimelineView';
import { MapView } from './components/MapView';
import { FinalizePayView } from './components/FinalizePayView';
import { TripGenerationPage } from './components/TripGenerationPage';
import { ChangeFlightModal } from './components/ChangeFlightModal';
import { AddActivityModal } from './components/AddActivityModal';
import { ChangeAccommodationModal } from './components/ChangeAccommodationModal';
import { EditActivityModal } from './components/EditActivityModal';
import { NewTripModal } from './components/NewTripModal';
import { ArchiveView } from './components/ArchiveView';
import { ExploreView } from './components/ExploreView';

const API_BASE_URL = 'http://127.0.0.1:8000';

// agent.py's Flight.dep_time/arr_time (used for apiData.flights, the initial
// generated flights) sometimes comes back as a full ISO datetime
// ("2026-09-24T23:50:00") rather than a plain "HH:MM" like flights.py's
// FlightOption uses. Every place we display or sort by these values wants
// just the clock time, so normalize once at the point they're read.
const toHHMM = (raw?: string | null, fallback = '00:00'): string => {
  if (!raw) return fallback;
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
};

// Maps the backend's schedule-entry "kind" field onto the frontend's
// TimelineItem['type'] union. Widened beyond meal/hotel/flight so activities
// added with a specific category (dining/culture/nature/shopping/nightlife —
// see categoryToType in handleAddActivity) round-trip with that category
// intact instead of collapsing to generic "activity" the next time the
// itinerary reloads from /api/chat or /api/itinerary/item. Any kind not
// listed here (e.g. the planner's own "attraction") still falls back to
// 'activity', matching the old behavior.
const KIND_TO_TYPE: Record<string, TimelineItem['type']> = {
  meal: 'dining',
  flight: 'flight',
  dining: 'dining',
  culture: 'culture',
  nature: 'nature',
  shopping: 'shopping',
  nightlife: 'nightlife',
  activity: 'activity',
};

const formatActivityDetails = (
  rating?: number | string | null,
  duration?: number | string | null,
) => {
  const ratingText = rating != null ? `Rating: ${rating} ⭐` : null;
  const durationText =
    duration == null || duration === ''
      ? null
      : typeof duration === 'number'
        ? `${duration} mins`
        : String(duration).trim();

  if (ratingText && durationText) return `${ratingText} • Duration: ${durationText}`;
  if (ratingText) return ratingText;
  if (durationText) return `Duration: ${durationText}`;
  return undefined;
};

const normalizeChatItinerary = (payload: any): any | null => {
  if (!payload) return null;

  if (Array.isArray(payload)) return { days: payload };
  if (payload.days) return payload;
  if (payload.daily_itinerary) {
    const daily = payload.daily_itinerary;
    if (Array.isArray(daily)) return { days: daily };
    if (daily.days) return daily;
  }
  if (payload.itinerary) return normalizeChatItinerary(payload.itinerary);
  if (payload.trip && payload.trip.itinerary) return normalizeChatItinerary(payload.trip.itinerary);
  if (payload.trip && payload.trip.days) return payload.trip;

  return null;
};

const mapChatItineraryToTrip = (itinerary: any, currentTrip: Trip): Trip => {
  const normalized = normalizeChatItinerary(itinerary) || { days: [] };
  const itineraryDays = Array.isArray(normalized.days) ? normalized.days : [];

  return {
    ...currentTrip,
    title: normalized.title || normalized.trip_overview?.title || currentTrip.title,
    destination: normalized.destination || currentTrip.destination,
    dates: normalized.dates || currentTrip.dates,
    travelersCount: normalized.travelers_count ?? normalized.travelersCount ?? currentTrip.travelersCount,
    budget: normalized.budget ?? currentTrip.budget,
    vibes: normalized.vibes || currentTrip.vibes,
    days: itineraryDays.map((day: any, dayIndex: number) => {
      
      // 1. Map the new schedule from the chat response
      let newItems = (day.schedule || []).map((entry: any, itemIndex: number): TimelineItem => ({
        id: `chat-${day.day ?? dayIndex}-${itemIndex}-${Date.now()}`,
        time: entry.time || '12:00',
        // Ensure the new "hotel_checkin" kind maps properly to the frontend's hotel type
        type: entry.kind === 'meal' ? 'dining' : (entry.kind === 'hotel' || entry.kind === 'hotel_checkin') ? 'hotel' : entry.kind === 'flight' ? 'flight' : 'activity',
        tag: entry.kind ? String(entry.kind).charAt(0).toUpperCase() + String(entry.kind).slice(1) : 'Activity',
        title: entry.name || entry.location?.name || 'Planned activity',
        subtitle: entry.location?.address || entry.location?.name || '',
        rating: entry.rating ?? undefined,
        reviewsCount: entry.reviews_count ?? entry.reviewsCount ?? undefined,
        details: formatActivityDetails(
          entry.rating,
          entry.duration_min ?? entry.duration_minutes ?? entry.duration ?? entry.estimated_duration,
        ),
        mapCoords: entry.location
          ? { x: 0, y: 0, lat: entry.location.latitude, lng: entry.location.longitude }
          : undefined,
        transitToNext: entry.transit_to_next
          ? {
              type:
                entry.transit_to_next.mode === 'walk' ? 'walk'
                  : entry.transit_to_next.mode === 'train' || entry.transit_to_next.mode === 'subway' ? 'train'
                  : entry.transit_to_next.mode === 'drive' || entry.transit_to_next.mode === 'car' ? 'drive'
                  : entry.transit_to_next.mode === 'taxi' ? 'taxi'
                  : 'bus',
              description: entry.transit_to_next.description || '',
            }
          : undefined,
      }));

      // ── FIX: Preserve & Re-inject Flights and Hotel Metadata ──
      const existingDay = currentTrip.days[dayIndex];
      if (existingDay) {
        // Re-inject flights from the previous state back into the new timeline
        const existingFlights = existingDay.items.filter(item => item.type === 'flight');
        existingFlights.forEach(flight => {
          if (flight.flightDetails?.direction === 'return') {
            newItems.push(flight);
          } else {
            newItems.unshift(flight);
          }
        });

        // Copy over the rich hotelDetails (pricing, room type) so the new hotel nodes don't lose their data
        const existingHotelMetadata = existingDay.items.find(item => item.hotelDetails)?.hotelDetails;
        if (existingHotelMetadata) {
          newItems.forEach(item => {
            if (item.type === 'hotel') {
              item.hotelDetails = existingHotelMetadata;
            }
          });
        }
      }

      // Sort items chronologically by their HH:MM time string to ensure injected flights fit in perfectly
      newItems.sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)));

      return {
        dayNumber: Number(day.day ?? dayIndex) + 1,
        dateLabel: `Day ${Number(day.day ?? dayIndex) + 1} • ${day.date || ''}`,
        items: newItems,
      };
    }),
  };
};


export const App: React.FC = () => {
  const emptyTrip: Trip = {
    id: '',
    title: '',
    destination: '',
    dates: '',
    travelersCount: 0,
    budget: 0,
    vibes: [],
    costs: {
      activities: 0,
      accommodation: 0,
      flights: 0,
      currency: 'USD',
      usdEstimate: 0,
    },
    members: [],
    days: [],
  };

  const [trip, setTrip] = useState<Trip>(emptyTrip);
  const [activeTab, setActiveTab] = useState<NavTab>('trips');
  const [isMapView, setIsMapView] = useState<boolean>(false);
  const [activeView, setActiveView] = useState <
    'landing' | 'workspace' | 'finalize_pay' | 'archive' | 'explore'
  >('landing');
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [hasGeneratedItinerary, setHasGeneratedItinerary] =
    useState<boolean>(false);
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([]);

  // Modals state
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] =
    useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);

  // Search context for the "Change Accommodation" modal — the same
  // dest/dates the itinerary was generated with. destId is null until the
  // first successful generation gives us a hotel to read it from.
  const [hotelSearchParams, setHotelSearchParams] = useState<{
    destId: string | null;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
    children: number;
  }>({
    destId: null,
    checkin: '',
    checkout: '',
    adults: 2,
    rooms: 1,
    children: 0,
  });

  const [flightSearchParams, setFlightSearchParams] = useState<{
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string;
    adults: number;
    childrenCount: number;
    infants: number;
  }>({
    origin: '',
    destination: '',
    departDate: '',
    returnDate: '',
    adults: 2,
    childrenCount: 0,
    infants: 0,
  });

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [chatSessionId, setChatSessionId] = useState('testing');

  // Debounced transit refinement state (drag-and-drop reordering)
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refineSeqRef = useRef<number>(0);

  // Clear any pending refinement debounce timer on unmount
  useEffect(() => {
    return () => {
      if (refineTimerRef.current) clearTimeout(refineTimerRef.current);
    };
  }, []);

  // Switching trips invalidates any refinement pending for the previous trip
  useEffect(() => {
    if (refineTimerRef.current) {
      clearTimeout(refineTimerRef.current);
      refineTimerRef.current = null;
    }
  }, [trip.id]);

  // Handle Tab changes
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'trips') {
      setActiveView('landing');
    } else if (tab === 'dashboard' || tab === 'assistant') {
      setActiveView('workspace');
    } else if (tab === 'explore') {
      setActiveView('explore');
    } else if (tab === 'archive') {
      setActiveView('archive');
    }
  };

  // Toggle Map / Workspace
  const handleToggleMapView = (isMap: boolean) => {
    setIsMapView(isMap);
    setActiveView('workspace');
  };

  // Best-effort "where in the trip is the user currently looking" coords,
  // used to bias/rank Add Activity search results and compute distance
  // labels. Falls back through: active day's first located stop -> any
  // day's first located stop -> undefined (search still works, just
  // without proximity ranking).
  const getActivitySearchOrigin = (): { lat?: number; lng?: number } => {
    const findCoords = (day: (typeof trip.days)[number] | undefined) =>
      day?.items.find((it) => it.mapCoords?.lat != null && it.mapCoords?.lng != null)?.mapCoords;

    const coords = findCoords(trip.days[activeDayIndex]) ?? trip.days.map(findCoords).find(Boolean);
    return { lat: coords?.lat, lng: coords?.lng };
  };

  // Switch Flight
  const handleSelectFlight = async (flight: FlightOption) => {
    setTrip((prev) => {
      const newFlightPricePerPax = flight.price;
      const newFlightsTotal = newFlightPricePerPax * prev.travelersCount;
      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type !== 'flight') return item;
          const isReturn = item.flightDetails?.direction === 'return';
          return {
            ...item,
            title: isReturn ? `Return via ${flight.airline}` : `Arrival via ${flight.airline}`,
            subtitle: `${flight.flight_number} • ${flight.departure.airport_code} to ${flight.arrival.airport_code}`,
            time: isReturn ? flight.departure.time : flight.arrival.time,
            bookingRef: `${(flight.airline_code || flight.flight_number).slice(0, 2)}-${Math.floor(1000 + Math.random() * 9000)}`,
            terminal: 'T1',
            flightDetails: item.flightDetails
              ? {
                  ...item.flightDetails,
                  price: newFlightPricePerPax,
                  carrier: flight.airline,
                  flightNumber: flight.flight_number,
                  depAirport: flight.departure.airport_code,
                  arrAirport: flight.arrival.airport_code,
                  arrTime: flight.arrival.time,
                  depTime: flight.departure.time,
                  currency: flight.currency || item.flightDetails.currency || 'USD',
                }
              : undefined,
          };
        }),
      }));
      return {
        ...prev,
        days: updatedDays,
        costs: { ...prev.costs, flights: newFlightsTotal, usdEstimate: prev.costs.accommodation + newFlightsTotal },
      };
    });
    // Add confirmation to chat
    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Updated your flight to ${flight.airline} (${flight.flight_number}) arriving at ${flight.arrival.time}. Recalculated your total budget!`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsFlightModalOpen(false);
  };

  // Switch Accommodation
  //
  // BUG FIX: ChangeAccommodationModal now calls onSelectStay(stay, room) —
  // passing the SPECIFIC room the user picked, which can differ from
  // stay.selected_room if they expanded "View room options" and chose a
  // different one. This used to only accept `stay` and always priced off
  // stay.selected_room, silently ignoring the room the user actually chose.
  const handleSelectAccommodation = (stay: StayOption, room: RoomOption) => {
    const locationLabel = [stay.address, stay.city].filter(Boolean).join(', ') || stay.name;

    setTrip((prev) => {
      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type !== 'hotel') return item;
          // Preserve which boundary this card represents — don't relabel a
          // checkout card as "Check-in" just because we're updating the stay.
          const isCheckout = item.tag === 'Hotel Check-out';
          return {
            ...item,
            title: `${isCheckout ? 'Check-out' : 'Check-in'}: ${stay.name}`,
            subtitle: locationLabel,
            image: stay.image_url ?? item.image,
            hotelDetails: item.hotelDetails
              ? {
                  ...item.hotelDetails,
                  name: stay.name,
                  address: locationLabel,
                  roomType: room.room_name,
                  pricePerNight: room.price_per_night,
                  totalPrice: room.total_price,
                  currency: room.currency,
                }
              : item.hotelDetails,
          };
        }),
      }));

      const newAccomTotal = room.total_price;
      return {
        ...prev,
        days: updatedDays,
        costs: { ...prev.costs, accommodation: newAccomTotal, usdEstimate: newAccomTotal + prev.costs.flights },
      };
    });

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Upgraded your stay to ${stay.name} (${locationLabel}) — ${room.room_name}. Total accommodation updated to ${currencySymbol(room.currency)}${room.total_price.toLocaleString()}.`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsAccommodationModalOpen(false);
  };

  // Shared by handleReorderItems and handleAddActivity: given a day's items
// (already time-sorted), fetches real transit legs between consecutive
// stops with coordinates and returns the day's items with transitToNext
// filled in from routing data. Returns null if routing is unavailable.
  const computeRefinedTransit = async (items: TimelineItem[]): Promise<TimelineItem[] | null> => {
    const waypoints = items
      .filter((it) => it.mapCoords?.lat != null && it.mapCoords?.lng != null)
      .map((it) => ({ id: it.id, lat: it.mapCoords!.lat!, lng: it.mapCoords!.lng! }));
    if (waypoints.length < 2) return null;

    const legs = await recalculateRoute(waypoints);
    if (!legs) return null;

    return items.map((item, idx) => {
      const next = items[idx + 1];
      if (!next) return item;
      const leg = legs.find((l) => l.fromId === item.id && l.toId === next.id);
      if (!leg) return item;

      const mins = Math.max(1, Math.round(leg.durationMinutes));
      const meters = Math.round(leg.distanceMeters);
      const isWalk = leg.mode === 'walk';
      return {
        ...item,
        transitToNext: {
          type: leg.mode,
          description: isWalk
            ? `Walk --- ${meters}m (${mins} mins) ---> ${next.title}`
            : `Transit --- ${mins} mins ---> ${next.title}`,
          duration: `${mins} mins`,
          distance: meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`,
        },
      };
    });
  };

  // Add Activity to current day — now searches and persists via the real
  // backend (Google Places through /activity/search for the picker,
  // /api/itinerary/item to save the chosen item) instead of only updating
  // local state with a hardcoded mock cost bump.
  // Add Activity to current day — now persists via the same
  // /api/itinerary/item endpoint used for edit/delete, instead of only
  // updating local state with a hardcoded mock cost bump.
  const handleAddActivity = async (activity: ActivityOption) => {
    const hasCoords = activity.latitude != null && activity.longitude != null;

    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      time: '19:30',
      type: activity.category === 'Dining' ? 'dining' : activity.category === 'Nature' ? 'culture' : 'activity',
      tag: activity.category,
      title: activity.title,
      subtitle: activity.description,
      image: activity.image,
      details: `Rating: ${activity.rating} ⭐ (${activity.reviewsCount} reviews) • Distance: ${activity.distance}`,
      mapCoords: hasCoords ? { x: 0, y: 0, lat: activity.latitude!, lng: activity.longitude! } : undefined,
      // Placeholder — overwritten below by computeRefinedTransit whenever
      // we actually have coordinates to route between.
      transitToNext: { type: 'walk', description: `Walk --- 500m (6 mins) ---> ${activity.title}` },
    };

    const dayNumber = activeDayIndex + 1;
    let persisted = false;
    let resultingDayItems: TimelineItem[] | null = null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/itinerary/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: chatSessionId,
          day_number: dayNumber,
          item: {
            id: newItem.id,
            time: newItem.time,
            kind: newItem.type === 'dining' ? 'meal' : newItem.type,
            name: newItem.title,
            notes: newItem.details,
            // Backend stores this verbatim with no geocoding of its own —
            // if we don't send real coordinates here, they're gone for good.
            location: hasCoords
              ? { latitude: activity.latitude, longitude: activity.longitude, name: activity.title }
              : undefined,
          },
        }),
      });
      if (!response.ok) throw new Error(`Failed to add activity (${response.status})`);
      const data = await response.json();
      if (data.itinerary?.daily_itinerary?.days) {
        setTrip((prev) => {
          const next = mapChatItineraryToTrip(data.itinerary.daily_itinerary, prev);
          resultingDayItems = next.days[activeDayIndex]?.items ?? null;
          return { ...next, costs: { ...next.costs, activities: prev.costs.activities + 6000 } };
        });
        persisted = true;
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    }

    if (!persisted) {
      setTrip((prev) => {
        const updatedDays = prev.days.map((day, idx) =>
          idx === activeDayIndex ? { ...day, items: [...day.items, newItem] } : day,
        );
        resultingDayItems = updatedDays[activeDayIndex]?.items ?? null;
        return { ...prev, days: updatedDays, costs: { ...prev.costs, activities: prev.costs.activities + 6000 } };
      });
    }

    if (resultingDayItems) {
      const refined = await computeRefinedTransit(resultingDayItems);
      if (refined) {
        setTrip((prev) => {
          const day = prev.days[activeDayIndex];
          if (!day) return prev;
          const stillSame = day.items.map((it) => it.id).join('|') === resultingDayItems!.map((it) => it.id).join('|');
          if (!stillSame) return prev;
          const updatedDays = prev.days.map((d, idx) => (idx !== activeDayIndex ? d : { ...d, items: refined }));
          return { ...prev, days: updatedDays };
        });
      }
    }

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Added "${activity.title}" to ${trip.days[activeDayIndex]?.dateLabel ?? 'your itinerary'}. Optimal transit route mapped.`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsActivityModalOpen(false);
  };

  // Edit / Save Timeline Item
  const handleSaveEditedItem = async (savedItem: TimelineItem) => {
    const dayNumber = activeDayIndex + 1;
    try {
      const response = await fetch(`${API_BASE_URL}/api/itinerary/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: chatSessionId,
          day_number: dayNumber,
          item: {
            id: savedItem.id,
            time: savedItem.time,
            kind: savedItem.type === 'dining' ? 'meal' : savedItem.type,
            name: savedItem.title,
            notes: savedItem.details,
            location: savedItem.mapCoords
              ? {
                  latitude: savedItem.mapCoords.lat,
                  longitude: savedItem.mapCoords.lng,
                  name: savedItem.subtitle,
                }
              : undefined,
          },
        }),
      });
      if (!response.ok) throw new Error(`Failed to save item (${response.status})`);
      const data = await response.json();
      if (data.itinerary?.daily_itinerary?.days) {
        setTrip((prev) => mapChatItineraryToTrip(data.itinerary.daily_itinerary, prev));
      }
    } catch (error) {
      console.error('Error saving itinerary item:', error);
      // optimistic local fallback so the UI doesn't feel broken if the API is down
      setTrip((prev) => {
        const updatedDays = prev.days.map((day, idx) => {
          if (idx !== activeDayIndex) return day;
          const exists = day.items.some((it) => it.id === savedItem.id);
          const newItems = exists
            ? day.items.map((it) => (it.id === savedItem.id ? savedItem : it))
            : [...day.items, savedItem];
          newItems.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
          return { ...day, items: newItems };
        });
        return { ...prev, days: updatedDays };
      });
    } finally {
      setIsEditItemModalOpen(false);
      setEditingItem(null);
    }
  };

  // Reorder items in the active day (drag-and-drop)

// Reorder items in the active day (drag-and-drop)
  const handleReorderItems = (newItems: TimelineItem[]) => {
    const currentDayItems = trip.days[activeDayIndex]?.items;
    if (!currentDayItems) return;

    // Optimistic client-side recalculation of times & transit
    const recalculated = recalculateSchedule(currentDayItems, newItems);
    setTrip((prev) => {
      const updatedDays = prev.days.map((day, idx) =>
        idx !== activeDayIndex ? day : { ...day, items: recalculated }
      );
      return { ...prev, days: updatedDays };
    });

    // Debounced backend refinement of transit durations with real routing data
    if (refineTimerRef.current) clearTimeout(refineTimerRef.current);
    const dayIndex = activeDayIndex;
    const orderSignature = recalculated.map((it) => it.id).join('|');

    refineTimerRef.current = setTimeout(async () => {
      const seq = ++refineSeqRef.current;
      const refined = await computeRefinedTransit(recalculated);
      if (!refined) {
        console.warn('Transit refinement unavailable; keeping optimistic estimates.');
        return;
      }
      // Ignore stale responses (a newer refinement request was issued since)
      if (seq !== refineSeqRef.current) return;

      setTrip((prev) => {
        const day = prev.days[dayIndex];
        if (!day) return prev;
        // Ignore if the day's item order changed since the request was made
        if (day.items.map((it) => it.id).join('|') !== orderSignature) return prev;

        const updatedDays = prev.days.map((d, idx) => (idx !== dayIndex ? d : { ...d, items: refined }));
        return { ...prev, days: updatedDays };
      });
    }, 800);
  };

  // Delete item
const handleDeleteItem = async (itemId: string) => {
  const day = trip.days[activeDayIndex];
  const itemToDelete = day?.items.find((it) => it.id === itemId);
  if (!itemToDelete) return;

  // Flights/hotels aren't part of chat.py's Place model — nothing to call.
  if (itemToDelete.type === 'flight' || itemToDelete.type === 'hotel') {
    console.warn('Flight/hotel items cannot be deleted via the itinerary chat layer.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/itinerary/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: chatSessionId,
        action: 'REMOVE_PLACE',
        params: {
          place_name: itemToDelete.title,
          day: activeDayIndex, // chat.py days are 0-indexed already
        },
      }),
    });
    if (!response.ok) throw new Error(`Failed to delete item (${response.status})`);
    const data = await response.json();
    if (data.itinerary?.daily_itinerary?.days) {
      setTrip((prev) => mapChatItineraryToTrip(data.itinerary.daily_itinerary, prev));
    }
  } catch (error) {
    console.error('Error deleting itinerary item:', error);
    // Local-only fallback: remove from view even if the API call failed.
    // Will be overwritten by the server's version on next sync.
    setTrip((prev) => {
      const updatedDays = prev.days.map((d, idx) =>
        idx !== activeDayIndex
          ? d
          : { ...d, items: d.items.filter((it) => it.id !== itemId) },
      );
      return { ...prev, days: updatedDays };
    });
  }
};

  // AI Chat & Intent Processing
  const handleSendMessage = async (userText: string) => {
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setIsAIGenerating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: chatSessionId,
          trip_config: { session_id: chatSessionId },
        }),
      });

      if (!response.ok) throw new Error(`Chat API error: ${response.status}`);
      const data = await response.json();

      const updatedItinerary = normalizeChatItinerary(data);
      if (updatedItinerary) {
        setTrip((prev) => {
          const refreshed = mapChatItineraryToTrip(updatedItinerary, prev);
          return {
            ...refreshed,
            days: refreshed.days.length > 0 ? refreshed.days : prev.days,
          };
        });
        setHasGeneratedItinerary(true);
        setActiveDayIndex(0);
        setActiveView('workspace');
      }

      /*
      const aiMsgObj: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: 'Just now',
        suggestionPills: suggestions.length > 0 ? suggestions : undefined,
      };

      setChatMessages((prev) => [...prev, aiMsgObj]);
      */
      setChatMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response || 'I updated your itinerary.',
        timestamp: 'Just now',
      }]);
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatMessages((prev) => [...prev, {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        text: 'I could not reach the itinerary chat service. Make sure testing_api.py is running on port 8000.',
        timestamp: 'Just now',
      }]);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Create new trip
  const handleCreateNewTrip = async (newTripData: Partial<Trip>) => {
    setIsAIGenerating(true);
    setActiveView('workspace');
    const nextSessionId = `trip-${Date.now()}`;
    setChatSessionId(nextSessionId);
    setTrip({
      ...emptyTrip,
      destination: newTripData.destination || 'Kota Kinabalu, Malaysia',
      title: `${(newTripData.destination || 'Kota Kinabalu, Malaysia').split(',')[0]} Trip`,
      dates: newTripData.dates || 'Oct 22 - Oct 25, 2026',
      travelersCount: newTripData.travelersCount || 4,
    });

    try {
      const destination = newTripData.destination || 'Kota Kinabalu, Malaysia';
      const dates = newTripData.dates || 'Oct 22 - Oct 25, 2026';
      const budget = newTripData.budget || 2400;
      const travelersCount = newTripData.travelersCount || 4;
      const vibes = newTripData.vibes ? newTripData.vibes.join(', ') : '';
      const userRequest = `Plan a trip to ${destination}. Dates: ${dates}. Budget: $${budget} per pax. Travelers: ${travelersCount}. Vibes: ${vibes}.`;
      const customMessages = newTripData.specialRequests || "Please make sure to add an activity to visit a cafe to unwind after the flight on day 1.";
      
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_request: userRequest,
          custom_messages: customMessages,
          trip_config: {
            session_id: nextSessionId,
          },
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const apiData = await response.json();

      // Extract Hotel & Flight Information from API Data
      const primaryHotel =
        apiData.hotels && apiData.hotels.length > 0 ? apiData.hotels[0] : null;
      const hotelDetails = primaryHotel
        ? {
            name: primaryHotel.name,
            address: primaryHotel.address || primaryHotel.city || destination,
            city: primaryHotel.city || destination.split(',')[0],
            starRating: primaryHotel.star_rating || 4,
            roomType: primaryHotel.selected_room?.room_name || 'Deluxe Room',
            checkIn: primaryHotel.stay_schedule?.check_in_time || '15:00',
            checkOut: primaryHotel.stay_schedule?.check_out_time || '11:00',
            totalNights:
              primaryHotel.stay_schedule?.total_nights ||
              (apiData.daily_itinerary?.length || 3) - 1,
            pricePerNight: primaryHotel.selected_room?.price_per_night || 120,
            totalPrice: primaryHotel.selected_room?.total_price || 360,
            currency: primaryHotel.selected_room?.currency || 'USD',
          }
        : {
            name: `${destination.split(',')[0]} Grand Hotel & Resort`,
            address: `Central City District, ${destination}`,
            city: destination.split(',')[0],
            starRating: 4,
            roomType: 'Deluxe City View Room',
            checkIn: '15:00',
            checkOut: '11:00',
            totalNights: 3,
            pricePerNight: 140,
            totalPrice: 420,
            currency: 'USD',
          };

      // Capture the search context this hotel came from, so "Change
      // Accommodation" can re-search the same destination/dates later.
      // destId stays null if the agent didn't return one (e.g. it fell
      // back to a placeholder hotel) — the modal handles that gracefully.
      const newHotelSearchParams = {
        destId: primaryHotel?.dest_id ?? null,
        checkin: primaryHotel?.stay_schedule?.check_in_date || '',
        checkout: primaryHotel?.stay_schedule?.check_out_date || '',
        adults: travelersCount,
        // Assumes 2 travelers per room — adjust if your booking flow allows
        // the user to choose room count directly.
        rooms: Math.max(1, Math.ceil(travelersCount / 2)),
        children: 0,
      };
      setHotelSearchParams(newHotelSearchParams);

      const outboundFlightData = apiData.flights
        ? apiData.flights.find((f: any) => f.direction === 'outbound') ||
          apiData.flights[0]
        : null;
      const returnFlightData = apiData.flights
        ? apiData.flights.find((f: any) => f.direction === 'return') ||
          apiData.flights[1]
        : null;

      const outboundDetails = outboundFlightData
        ? {
            direction: 'outbound',
            carrier: outboundFlightData.carrier || 'Aether Air',
            flightNumber: outboundFlightData.flight_number || 'AA 801',
            depAirport: outboundFlightData.dep_airport || 'ORIGIN',
            arrAirport:
              outboundFlightData.arr_airport ||
              destination.slice(0, 3).toUpperCase(),
            depTime: toHHMM(outboundFlightData.dep_time, '08:30'),
            arrTime: toHHMM(outboundFlightData.arr_time, '11:45'),
            cabin: outboundFlightData.cabin || 'Economy',
            price: outboundFlightData.price?.total || 250,
            currency: outboundFlightData.price?.currency || 'USD',
          }
        : {
            direction: 'outbound',
            carrier: 'Aether Air',
            flightNumber: 'AA 801',
            depAirport: 'KUL',
            arrAirport: destination.slice(0, 3).toUpperCase(),
            depTime: '08:30',
            arrTime: '11:45',
            cabin: 'Economy Standard',
            price: 250,
            currency: 'USD',
          };

      const returnDetails = returnFlightData
        ? {
            direction: 'return',
            carrier: returnFlightData.carrier || 'Aether Air',
            flightNumber: returnFlightData.flight_number || 'AA 802',
            depAirport:
              returnFlightData.dep_airport ||
              destination.slice(0, 3).toUpperCase(),
            arrAirport: returnFlightData.arr_airport || 'ORIGIN',
            depTime: toHHMM(returnFlightData.dep_time, '17:30'),
            arrTime: toHHMM(returnFlightData.arr_time, '20:45'),
            cabin: returnFlightData.cabin || 'Economy',
            price: returnFlightData.price?.total || 250,
            currency: returnFlightData.price?.currency || 'USD',
          }
        : {
            direction: 'return',
            carrier: 'Aether Air',
            flightNumber: 'AA 802',
            depAirport: destination.slice(0, 3).toUpperCase(),
            arrAirport: 'KUL',
            depTime: '17:30',
            arrTime: '20:45',
            cabin: 'Economy Standard',
            price: 250,
            currency: 'USD',
          };

      
      const rawDailyItinerary =
        apiData.daily_itinerary?.days ||
        (Array.isArray(apiData.daily_itinerary) ? apiData.daily_itinerary : []);
      const totalDays = rawDailyItinerary.length || 3;

      const formattedDays = rawDailyItinerary.map(
        (day: any, dayIdx: number) => {
          const isFirstDay = dayIdx === 0;
          const isLastDay = dayIdx === totalDays - 1;
          // Drop the planner's generic "Return to Hotel" rest beat when it
          // falls outside the actual stay window — before the guest has
          // checked in on arrival day, or after they've already checked out
          // on departure day. The real check-in/check-out moments are
          // covered by the synthesized hotelDetails cards below instead.
          const schedule = (day.schedule || []).filter((item: any) => {
            const isReturnToHotel = item.kind === 'hotel' && String(item.name || '').includes('Return to Hotel');
            if (isReturnToHotel && isFirstDay && item.time < hotelDetails.checkIn) return false;
            if (isReturnToHotel && isLastDay && item.time > hotelDetails.checkOut) return false;
            return true;
          });
          const items = schedule.map((item: any, index: number) => {
            let itemType: 'activity' | 'hotel' | 'dining' | 'flight' = 'activity';
            if (item.kind === 'meal') itemType = 'dining';
            if (
              item.kind === 'flight' ||
              item.name.toLowerCase().includes('flight') ||
              item.name.toLowerCase().includes('arrival')
            )
              itemType = 'flight';
            // kind 'hotel' ("Return to Hotel") and 'hotel_checkin' (mid-day early
            // arrival check-in) are real itinerary beats, but never the rich
            // booking card — that's reserved for the two synthesized boundary
            // cards below. Falls through to plain 'activity'.

            return {
              id: `item-${day.day || dayIdx}-${index}`,
              time: item.time,
              type: itemType,
              tag:
                item.kind === 'hotel' ? 'Rest'
                : item.kind === 'hotel_checkin' ? 'Hotel Check-in'
                : item.kind ? item.kind.charAt(0).toUpperCase() + item.kind.slice(1)
                : 'Activity',
              title: item.name,
              subtitle: item.location?.name || 'Location confirmed',
              details: item.rating ? `Rating: ${item.rating} ⭐ • Duration: ${item.duration_min || 60} mins` : undefined,
              mapCoords: item.location
                ? { x: 0, y: 0, lat: item.location.latitude, lng: item.location.longitude }
                : undefined,
              // Planner already computed real transit for every leg — surface it
              // immediately instead of only backfilling it via computeRefinedTransit
              // after a later add/reorder action.
              transitToNext: item.transit_to_next
                ? {
                    type: item.transit_to_next.mode === 'walk' ? 'walk' : item.transit_to_next.mode === 'train' ? 'train' : 'bus',
                    description: item.transit_to_next.description || '',
                  }
                : undefined,
              hotelDetails: itemType === 'hotel' ? hotelDetails : undefined,
              flightDetails:
                itemType === 'flight'
                  ? isLastDay
                    ? returnDetails
                    : outboundDetails
                  : undefined,
              transitToNext: item.transit_to_next
                ? {
                    type: item.transit_to_next.mode === 'walk' ? 'walk'
                        : item.transit_to_next.mode === 'train' ? 'train'
                        : item.transit_to_next.mode === 'taxi' ? 'taxi'
                        : 'subway',
                    description: item.transit_to_next.description || '',
                    duration: item.transit_to_next.duration,
                    distance: item.transit_to_next.distance,
                  }
                : undefined,
            };
          });

          // Ensure Day 1 has explicit Flight Arrival and Hotel Check-in items if not present
          if (isFirstDay) {
            const hasFlight = items.some((it: any) => it.type === 'flight');
            if (!hasFlight) {
              items.unshift({
                id: `item-flight-outbound-day${dayIdx + 1}`,
                time: outboundDetails.arrTime,
                type: 'flight',
                tag: 'Flight',
                title: `${outboundDetails.carrier} ${outboundDetails.flightNumber}`,
                subtitle: `${outboundDetails.depAirport} → ${outboundDetails.arrAirport}`,
                flightDetails: outboundDetails,
              });
            }

            items.push({
              id: `item-hotel-checkin-day${dayIdx + 1}`,
              time: hotelDetails.checkIn,
              type: 'hotel',
              tag: 'Hotel Check-in',
              title: `Check-in: ${hotelDetails.name}`,
              subtitle: hotelDetails.address,
              nights: hotelDetails.totalNights,
              hotelDetails,
            });
          }

          if (isLastDay) {
            items.push({
              id: `item-hotel-checkout-day${dayIdx + 1}`,
              time: hotelDetails.checkOut,
              type: 'hotel',
              tag: 'Hotel Check-out',
              title: `Check-out: ${hotelDetails.name}`,
              subtitle: hotelDetails.address,
              hotelDetails,
            });

            const hasReturnFlight = items.some(
              (it: any) => it.type === 'flight' && it.flightDetails?.direction === 'return',
            );
            if (!hasReturnFlight) {
              items.push({
                id: `item-flight-return-day${dayIdx + 1}`,
                time: returnDetails.depTime,
                type: 'flight',
                tag: 'Flight',
                title: `${returnDetails.carrier} ${returnDetails.flightNumber}`,
                subtitle: `${returnDetails.depAirport} → ${returnDetails.arrAirport}`,
                flightDetails: returnDetails,
              });
            }
          }

          // Sort all items chronologically by their HH:MM time string
          items.sort((a: any, b: any) => a.time.localeCompare(b.time));

          return {
            dayNumber: dayIdx + 1,
            dateLabel: `Day ${dayIdx + 1} • ${day.date}`,
            items: items,
          };
        },
      );

      const newFlightSearchParams = {
        origin: outboundDetails.depAirport,
        destination: outboundDetails.arrAirport,
        departDate:
          apiData.trip_overview?.start_date ||
          rawDailyItinerary[0]?.date ||
          '',
        returnDate:
          apiData.trip_overview?.end_date ||
          rawDailyItinerary[rawDailyItinerary.length - 1]?.date ||
          '',
        adults: travelersCount,
        childrenCount: 0,
        infants: 0,
      };
      setFlightSearchParams(newFlightSearchParams);

      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        title:
          apiData.trip_overview?.title || `${destination.split(',')[0]} Trip`,
        destination: destination,
        dates: dates,
        travelersCount: travelersCount,
        budget: budget,
        vibes: newTripData.vibes ?? [],
        costs: {
          activities:
            (apiData.cost_breakdown?.activities || 350) * travelersCount,
          accommodation:
            hotelDetails.totalPrice ||
            apiData.cost_breakdown?.food_dining ||
            400,
          flights:
            (outboundDetails.price + returnDetails.price) * travelersCount,
          currency: apiData.cost_breakdown?.currency || 'USD',
          // Estimated total = hotel + flights only (activities excluded from total)
          usdEstimate:
            (hotelDetails.totalPrice ||
              apiData.cost_breakdown?.food_dining ||
              400) +
            (outboundDetails.price + returnDetails.price) * travelersCount,
        },
        members: Array.from({ length: travelersCount }).map((_, i) => ({
          id: `member-${i}`,
          name: i === 0 ? 'You' : `Traveler ${i + 1}`,
          avatar: `https://i.pravatar.cc/150?u=${i}`,
          shareAmount: Math.round(budget / travelersCount),
          hasPaid: i !== 0,
          isCurrentUser: i === 0,
        })),
        days: formattedDays,
      };

      setTrip(newTrip);
      setActiveDayIndex(0);
      setHasGeneratedItinerary(true);
      setActiveTab('dashboard');
      setActiveView('workspace');
      setIsAIGenerating(false);

      setChatMessages([
        {
          id: 'msg-start',
          sender: 'ai',
          text: `Welcome to your customized trip plan for ${newTrip.destination}! I've generated an itinerary with verified flights (${outboundDetails.carrier} ${outboundDetails.flightNumber}) and hotel booking (${hotelDetails.name}).`,
          timestamp: 'Just now',
          suggestionPills: [
            'Summarize the generated itinerary',
            'When is my hotel check-out time?',
          ],
        },
      ]);
    } catch (error) {
      console.error('Error generating trip:', error);
      setIsAIGenerating(false);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          sender: 'ai',
          text: `Sorry, I encountered an error while planning your trip. Please make sure the Python API is running on port 8000!`,
          timestamp: 'Just now',
        },
      ]);
    }
  };

  // Restore straight back into Finalize & Pay after returning from Stripe.
  // Redirecting to Stripe's hosted checkout is a full page navigation away
  // from this app, which wipes ALL in-memory React state on the way back —
  // not just `trip`. This used to only restore `trip`, leaving
  // `hotelSearchParams` reset to its default { destId: null, ... }, which
  // is exactly why "Change Accommodation" started failing with "No hotel
  // search details available" right after a payment redirect: the restored
  // trip looked fine, but the separate hotelSearchParams state it depends
  // on had silently gone back to null. FinalizePayView now saves both
  // pieces together before redirecting to Stripe (see its handlePay) — this
  // restores both back into state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('session_id')) return;

    const saved = sessionStorage.getItem('pendingPaymentTrip');
    if (!saved) return;

    try {
      const parsed: {
        trip: Trip;
        hotelSearchParams?: typeof hotelSearchParams;
      } = JSON.parse(saved);
      setTrip(parsed.trip);
      if (parsed.hotelSearchParams) {
        setHotelSearchParams(parsed.hotelSearchParams);
      }
      setHasGeneratedItinerary(true);
      setActiveTab('dashboard');
      setActiveView('finalize_pay');
    } catch {
      // Corrupt/stale sessionStorage value — ignore and let the app fall
      // through to whatever view it would normally show.
    } finally {
      sessionStorage.removeItem('pendingPaymentTrip');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#191c1d] font-sans antialiased selection:bg-[#d8e2ff] selection:text-[#001a42]">
      {/* Top Main Navigation Bar */}
      <TopNavBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenNewTrip={() => setIsNewTripModalOpen(true)}
        onOpenFinalizePay={() => setActiveView('finalize_pay')}
      />

      {/* Sub Header (Destination, Travelers, Map switch) */}
      {activeView === 'workspace' && (
        <SubPlannerBar
          trip={trip}
          isMapView={isMapView}
          isGenerating={isAIGenerating}
          onToggleMapView={handleToggleMapView}
          onEditTripDetails={() => setIsNewTripModalOpen(true)}
          onBack={() => {
            // Save current trip to archive
            setArchivedTrips((prev) => {
              if (prev.some((t) => t.id === trip.id)) return prev;
              return [...prev, trip];
            });
            setHasGeneratedItinerary(false);
            setActiveTab('trips');
            setActiveView('landing');
          }}
        />
      )}

      {/* Primary Workspace Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeView === 'landing' ? (
          <TripGenerationPage
            currentTrip={trip}
            onGenerateTrip={handleCreateNewTrip}
            onSelectExistingTrip={(selectedTrip) => {
              setTrip(selectedTrip);
              setHasGeneratedItinerary(true);
              setActiveTab('dashboard');
              setActiveView('workspace');
            }}
          />
        ) : activeView === 'explore' ? (
          <ExploreView 
            onSelectTrip={(selectedTrip) => {
              setTrip(selectedTrip);
              setHasGeneratedItinerary(true);
              setActiveTab('dashboard');
              setActiveView('workspace');
            }} 
          />
        ) : activeView === 'archive' ? (
          <ArchiveView
            archivedTrips={archivedTrips}
            onSelectTrip={(selectedTrip) => {
              setTrip(selectedTrip);
              setHasGeneratedItinerary(true);
              setActiveTab('dashboard');
              setActiveView('workspace');
            }}
            onDeleteTrip={(tripId) => {
              setArchivedTrips((prev) => prev.filter((t) => t.id !== tripId));
            }}
          />
        ) : activeView === 'finalize_pay' ? (
          <FinalizePayView
            trip={trip}
            hotelSearchParams={hotelSearchParams}
            onBack={() => setActiveView('workspace')}
          />
        ) : isMapView ? (
          <MapView
            trip={trip}
            activeDayIndex={activeDayIndex}
            onOpenAddActivity={() => setIsActivityModalOpen(true)}
            onItemClick={(item) => {
              setEditingItem(item);
              setIsEditItemModalOpen(true);
            }}
          />
        ) : (
          <div className="flex flex-col md:flex-row w-full h-[calc(100vh-120px)] overflow-hidden">
            {/* Left AI Co-Pilot Column */}
            <AICoPilot
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onApplySuggestion={(sugg) => handleSendMessage(sugg)}
              isGenerating={isAIGenerating}
            />

            {/* Right Itinerary Timeline Column */}
            <TimelineView
              trip={trip}
              activeDayIndex={activeDayIndex}
              onSelectDay={(idx) => setActiveDayIndex(idx)}
              onOpenAddActivity={() => setIsActivityModalOpen(true)}
              onOpenChangeFlight={() => setIsFlightModalOpen(true)}
              onOpenChangeHotel={() => setIsAccommodationModalOpen(true)}
              onEditItem={(item) => {
                setEditingItem(item);
                setIsEditItemModalOpen(true);
              }}
              onDeleteItem={handleDeleteItem}
              onReorderItems={handleReorderItems}
              onProceedToSplitPay={() => setActiveView('finalize_pay')}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ChangeFlightModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        onSelectFlight={handleSelectFlight}
        origin={flightSearchParams.origin}
        destination={flightSearchParams.destination}
        departDate={flightSearchParams.departDate}
        returnDate={flightSearchParams.returnDate}
        adults={flightSearchParams.adults}
        childrenCount={flightSearchParams.childrenCount}
        infants={flightSearchParams.infants}
      />

      <AddActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onAddActivity={handleAddActivity}
        originLat={getActivitySearchOrigin().lat}
        originLng={getActivitySearchOrigin().lng}
      />

      <ChangeAccommodationModal
        isOpen={isAccommodationModalOpen}
        onClose={() => setIsAccommodationModalOpen(false)}
        onSelectStay={handleSelectAccommodation}
        destId={hotelSearchParams.destId}
        checkin={hotelSearchParams.checkin}
        checkout={hotelSearchParams.checkout}
        adults={hotelSearchParams.adults}
        rooms={hotelSearchParams.rooms}
        childrenCount={hotelSearchParams.children}
      />

      <EditActivityModal
        isOpen={isEditItemModalOpen}
        item={editingItem}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEditedItem}
      />

      <NewTripModal
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        onCreateTrip={handleCreateNewTrip}
      />
    </div>
  );
};

export default App;