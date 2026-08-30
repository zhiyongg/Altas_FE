import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Trip,
  TimelineItem,
  TransitInfo,
  HotelDetails,
  FlightDetails,
  ChatMessage,
  FlightOption,
  StayOption,
  RoomOption,
  ActivityOption,
  NavTab,
} from './types';
import { recalculateSchedule, fillMissingTransit } from './utils/recalculateSchedule';
import { recalculateRoute } from './utils/routeApi';
import { timeToMinutes } from './utils/time';
import { tripTotal } from './utils/costs';
import { currencySymbol } from './currency';
import { API_BASE } from './api';
import { pruneRestBeats } from './utils/recalculateSchedule';
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

const API_BASE_URL = API_BASE;

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
  // "hotel_checkin" is the real booking moment -> rich, fixed hotel card.
  // Plain "hotel" is the planner's "Return to Hotel" rest beat, which must
  // stay a normal (draggable, non-anchor) item; mapping it to 'hotel' turned
  // every rest beat into a booking card with a "Change Hotel" button.
  hotel_checkin: 'hotel',
  hotel: 'activity',
};

// Backend transit modes -> TransitInfo['type']. Centralized because the three
// places that used to do this inline disagreed with each other, and one of them
// emitted 'drive', which isn't a member of the union at all.
const TRANSIT_MODE_TO_TYPE: Record<string, TransitInfo['type']> = {
  walk: 'walk',
  walking: 'walk',
  train: 'train',
  rail: 'train',
  subway: 'subway',
  metro: 'subway',
  bus: 'bus',
  transit: 'subway',
  taxi: 'taxi',
  drive: 'taxi',
  driving: 'taxi',
  car: 'taxi',
};

const toTransitInfo = (raw: any): TransitInfo | undefined => {
  if (!raw) return undefined;
  const mode = String(raw.mode ?? '').toLowerCase();
  return {
    type: TRANSIT_MODE_TO_TYPE[mode] ?? 'bus',
    description: raw.description || '',
    duration:
      raw.duration ??
      (raw.duration_min != null ? `${raw.duration_min} mins` : undefined),
    distance: raw.distance ?? undefined,
  };
};

// Chronological ordering for a day's items. String comparison was used before,
// which sorts "9:30" after "10:00" whenever the backend omits zero-padding.
const byTime = (a: TimelineItem, b: TimelineItem) =>
  timeToMinutes(a.time) - timeToMinutes(b.time);

// Add minutes to an "HH:MM" time, capped at 23:59 same-day (a genuine
// midnight-rollover arrival is a separate edge case from what this fixes).
const addMinutesCapped = (hhmm: string, mins: number): string => {
  const total = Math.min(23 * 60 + 59, timeToMinutes(hhmm) + mins);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// A hotel check-in card can't actually happen before the guest lands. If the
// arrival flight touches down after the property's nominal check-in time,
// the card's time becomes arrival + 1hr instead of the nominal time —
// otherwise a night arrival (e.g. 23:30) sorted the check-in card (default
// 15:00) BEFORE the flight that brings the guest into the city.
const earliestCheckInAfterArrival = (nominalCheckIn: string, arrTime: string): string => {
  const earliestPossible = addMinutesCapped(arrTime, 60);
  return timeToMinutes(earliestPossible) > timeToMinutes(nominalCheckIn)
    ? earliestPossible
    : nominalCheckIn;
};

// Activity picker categories -> TimelineItem type. The old inline ternary only
// understood "Dining" and mapped "Nature" to 'culture', silently dropping the
// Culture/Shopping/Tickets categories the modal offers.
const ACTIVITY_CATEGORY_TO_TYPE: Record<string, TimelineItem['type']> = {
  dining: 'dining',
  food: 'dining',
  restaurant: 'dining',
  culture: 'culture',
  museum: 'culture',
  nature: 'nature',
  park: 'nature',
  shopping: 'shopping',
  nightlife: 'nightlife',
  tickets: 'activity',
  tours: 'activity',
};

const activityTypeFor = (category?: string): TimelineItem['type'] =>
  ACTIVITY_CATEGORY_TO_TYPE[String(category ?? '').trim().toLowerCase()] ?? 'activity';

// "$$", "Free", "From RM 120" — pull out a usable number, or 0 when the label
// carries no real amount. Adding a flat 6,000 per activity (the old behavior)
// made the cost summary fiction.
const parsePriceLabel = (label?: string): number => {
  if (!label) return 0;
  const match = label.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

// Next sensible start time for an appended activity: 90 minutes after the
// day's last flexible stop, capped at 22:00. Hardcoding '19:30' meant every
// added activity collided with whatever already sat at that hour.
const nextFreeSlot = (items: TimelineItem[]): string => {
  const flexible = items.filter((it) => it.type !== 'flight' && it.type !== 'hotel');
  const source = flexible.length > 0 ? flexible : items;
  if (source.length === 0) return '10:00';
  const latest = Math.max(...source.map((it) => timeToMinutes(it.time)));
  const minutes = Math.min(latest + 90, 22 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
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

  // A server sync only carries the planner's own fields, so everything the
  // client owns (stable ids, images, prices, booking metadata) used to be
  // thrown away on every chat message / edit / delete. Index the current trip
  // by title so those extras survive. Stable ids matter especially: the old
  // `chat-...-${Date.now()}` ids changed on every sync, remounting every card
  // and resetting drag/expanded state.
  const previousByTitle = new Map<string, TimelineItem>();
  currentTrip.days.forEach((day) =>
    day.items.forEach((item) => {
      const key = item.title?.trim().toLowerCase();
      if (key && !previousByTitle.has(key)) previousByTitle.set(key, item);
    }),
  );

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
      const newItems: TimelineItem[] = (day.schedule || []).map(
        (entry: any, itemIndex: number): TimelineItem => {
          const title = entry.name || entry.location?.name || 'Planned activity';
          const previous = previousByTitle.get(title.trim().toLowerCase());
          const kind = entry.kind ? String(entry.kind) : '';
          const hasCoords = entry.location?.latitude != null && entry.location?.longitude != null;

          return {
            id: previous?.id ?? `chat-${dayIndex}-${itemIndex}`,
            time: toHHMM(entry.time, previous?.time ?? '12:00'),
            type: KIND_TO_TYPE[kind] ?? 'activity',
            tag:
              kind === 'hotel' ? 'Rest'
              : kind === 'hotel_checkin' ? 'Hotel Check-in'
              : kind ? kind.charAt(0).toUpperCase() + kind.slice(1)
              : previous?.tag ?? 'Activity',
            title,
            subtitle: entry.location?.address || entry.location?.name || previous?.subtitle || '',
            image: previous?.image,
            price: previous?.price,
            priceLabel: previous?.priceLabel,
            rating: entry.rating ?? previous?.rating,
            reviewsCount: entry.reviews_count ?? entry.reviewsCount ?? previous?.reviewsCount,
            details:
              formatActivityDetails(
                entry.rating,
                entry.duration_min ?? entry.duration_minutes ?? entry.duration ?? entry.estimated_duration,
              ) ?? previous?.details,
            mapCoords: hasCoords
              ? { x: 0, y: 0, lat: entry.location.latitude, lng: entry.location.longitude }
              : previous?.mapCoords,
            transitToNext: toTransitInfo(entry.transit_to_next),
            // Booking metadata the chat layer knows nothing about
            terminal: previous?.terminal,
            bookingRef: previous?.bookingRef,
            nights: previous?.nights,
            flightDetails: previous?.flightDetails,
            hotelDetails: previous?.hotelDetails,
          };
        },
      );

      // 2. Carry over client-only anchors (flights + the synthesized hotel
      //    check-in/check-out cards). Only the flights were preserved before,
      //    so the hotel cards — and with them the "Change Hotel" entry point —
      //    disappeared after the first chat message. Re-injection is guarded by
      //    title so an anchor the server already returned isn't duplicated.
      const existingDay = currentTrip.days[dayIndex];
      if (existingDay) {
        const presentTitles = new Set(newItems.map((it) => it.title.trim().toLowerCase()));
        existingDay.items
          .filter(
            (item) =>
              (item.type === 'flight' || item.type === 'hotel') &&
              !presentTitles.has(item.title.trim().toLowerCase()),
          )
          .forEach((anchor) => newItems.push(anchor));

        // Rich hotel pricing/room data lives on the boundary cards — re-attach
        // it to any hotel node that came back from the server without it.
        const hotelMetadata =
          existingDay.items.find((item) => item.hotelDetails)?.hotelDetails ??
          currentTrip.days.flatMap((d) => d.items).find((item) => item.hotelDetails)?.hotelDetails;
        if (hotelMetadata) {
          newItems.forEach((item) => {
            if (item.type === 'hotel' && !item.hotelDetails) item.hotelDetails = hotelMetadata;
          });
        }
      }

      newItems.sort(byTime);

      // dayNumber/dateLabel are derived from the array index, not from
      // `day.day`: the backend numbers days from 1, so `day.day + 1` produced
      // "Day 2" for the first day and disagreed with the generation path.
      return {
        dayNumber: dayIndex + 1,
        dateLabel: `Day ${dayIndex + 1} • ${day.date || ''}`,
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
  // Memoized so the two props it feeds AddActivityModal come from one object
  // identity per render; it used to be a plain function called twice inline in
  // the JSX, which walked every day of the trip twice on every single render.
  const activitySearchOrigin = useMemo((): { lat?: number; lng?: number } => {
    const findCoords = (day: (typeof trip.days)[number] | undefined) =>
      day?.items.find((it) => it.mapCoords?.lat != null && it.mapCoords?.lng != null)?.mapCoords;

    const coords = findCoords(trip.days[activeDayIndex]) ?? trip.days.map(findCoords).find(Boolean);
    return { lat: coords?.lat, lng: coords?.lng };
  }, [trip.days, activeDayIndex]);

  // Switch Flight
  //
  // The user picks ONE leg in the modal, so only that leg may change. The old
  // version rewrote every flight item in the trip with the selected option, so
  // choosing a new outbound also silently replaced the return flight (same
  // carrier, same number, same times) — and then priced the whole round trip
  // as `selectedPrice * travelers`, dropping the other leg's fare entirely.
  const handleSelectFlight = (flight: FlightOption) => {
    setTrip((prev) => {
      const flightItems = prev.days.flatMap((day) => day.items).filter((it) => it.type === 'flight');
      const outboundLeg = flightItems.find((it) => it.flightDetails?.direction !== 'return');
      const returnLeg = flightItems.find((it) => it.flightDetails?.direction === 'return');

      // Infer which leg was replaced from the route. Falls back to outbound
      // when the codes don't identify a leg (e.g. placeholder airports).
      const depCode = flight.departure.airport_code;
      const targetDirection: 'outbound' | 'return' =
        returnLeg?.flightDetails?.depAirport === depCode &&
        outboundLeg?.flightDetails?.depAirport !== depCode
          ? 'return'
          : 'outbound';

      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type !== 'flight') return item;
          const isReturn = item.flightDetails?.direction === 'return';
          if ((isReturn ? 'return' : 'outbound') !== targetDirection) return item;

          // Rebuild flightDetails in full rather than merging into a possibly
          // missing object — previously an item without flightDetails kept
          // `undefined` and the card fell back to "Airline Carrier / FLIGHT".
          const flightDetails: FlightDetails = {
            ...item.flightDetails,
            direction: isReturn ? 'return' : 'outbound',
            carrier: flight.airline,
            flightNumber: flight.flight_number,
            depAirport: flight.departure.airport_code,
            arrAirport: flight.arrival.airport_code,
            depTime: flight.departure.time,
            arrTime: flight.arrival.time,
            durationMinutes: flight.duration_minutes ?? item.flightDetails?.durationMinutes,
            price: flight.price,
            currency: flight.currency || item.flightDetails?.currency || prev.costs.currency,
          };

          return {
            ...item,
            title: isReturn ? `Return via ${flight.airline}` : `Arrival via ${flight.airline}`,
            subtitle: `${flight.flight_number} • ${flight.departure.airport_code} to ${flight.arrival.airport_code}`,
            time: isReturn ? flight.departure.time : flight.arrival.time,
            bookingRef: `${(flight.airline_code || flight.flight_number).slice(0, 2)}-${Math.floor(1000 + Math.random() * 9000)}`,
            terminal: item.terminal ?? 'T1',
            flightDetails,
          };
        }).sort(byTime),
      }));

      // Re-price from the resulting legs so both directions are counted once.
      const updatedFlights = updatedDays.flatMap((day) => day.items).filter((it) => it.type === 'flight');
      const farePerPax = (['outbound', 'return'] as const).reduce((sum, direction) => {
        const leg = updatedFlights.find(
          (it) => (it.flightDetails?.direction === 'return' ? 'return' : 'outbound') === direction,
        );
        return sum + (leg?.flightDetails?.price ?? 0);
      }, 0);
      const travelers = prev.travelersCount > 0 ? prev.travelersCount : 1;
      const newCosts = { ...prev.costs, flights: farePerPax * travelers };

      return {
        ...prev,
        days: updatedDays,
        costs: { ...newCosts, usdEstimate: tripTotal(newCosts) },
      };
    });

    // Add confirmation to chat
    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Updated your flight to ${flight.airline} (${flight.flight_number}) departing ${flight.departure.time} and arriving ${flight.arrival.time}. Recalculated your total budget!`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsFlightModalOpen(false);
  };

  // Switch Accommodation
  //
  // ChangeAccommodationModal calls onSelectStay(stay, room) — passing the
  // SPECIFIC room the user picked, which can differ from stay.selected_room if
  // they expanded "View room options" and chose a different one.
  const handleSelectAccommodation = (stay: StayOption, room: RoomOption) => {
    const locationLabel = [stay.address, stay.city].filter(Boolean).join(', ') || stay.name;
    const schedule = stay.stay_schedule;

    setTrip((prev) => {
      let updatedDays = prev.days.map((day) => {
        const arrivalFlight = day.items.find(
          (it) => it.type === 'flight' && it.flightDetails?.direction !== 'return',
        );
        return {
          ...day,
          items: day.items
            .map((item) => {
              if (item.type !== 'hotel') return item;
              // ...unchanged...
            })
            .sort(byTime),
        };
      });

      // Re-run the rest-beat rule against the NEW property's check-in/out —
      // not the one the itinerary was originally generated for.
      const allItems = updatedDays.flatMap((d) => d.items);
      const checkInItem = allItems.find((it) => it.type === 'hotel' && it.tag === 'Hotel Check-in');
      const checkOutItem = allItems.find((it) => it.type === 'hotel' && it.tag === 'Hotel Check-out');
      const totalDays = updatedDays.length;

      updatedDays = updatedDays.map((day, dayIdx) => ({
        ...day,
        items: pruneRestBeats(day.items, {
          isFirstDay: dayIdx === 0,
          isLastDay: dayIdx === totalDays - 1,
          checkIn: checkInItem?.hotelDetails?.checkIn,
          checkOut: checkOutItem?.hotelDetails?.checkOut,
        }),
      }));
                
      const newCosts = { ...prev.costs, accommodation: room.total_price || 0 };
      return {
        ...prev,
        days: updatedDays,
        costs: { ...newCosts, usdEstimate: tripTotal(newCosts) },
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

  // Add Activity to current day — persists via the same /api/itinerary/item
  // endpoint used for edit/delete, then refines transit with real routing data.
  const handleAddActivity = async (activity: ActivityOption) => {
    const hasCoords = activity.latitude != null && activity.longitude != null;
    const currentDay = trip.days[activeDayIndex];
    const type = activityTypeFor(activity.category);

    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      time: nextFreeSlot(currentDay?.items ?? []),
      type,
      tag: activity.category || 'Activity',
      title: activity.title,
      subtitle: activity.description,
      image: activity.image,
      price: parsePriceLabel(activity.priceLabel) || undefined,
      priceLabel: activity.priceLabel,
      rating: activity.rating,
      reviewsCount: activity.reviewsCount,
      // Built from the parts we actually have — the old template always
      // interpolated "(undefined reviews)" when the source had no review count.
      details: [
        activity.rating != null ? `Rating: ${activity.rating} ⭐` : null,
        activity.reviewsCount != null ? `${activity.reviewsCount.toLocaleString()} reviews` : null,
        activity.distance ? `Distance: ${activity.distance}` : null,
      ]
        .filter(Boolean)
        .join(' • ') || undefined,
      mapCoords: hasCoords ? { x: 0, y: 0, lat: activity.latitude!, lng: activity.longitude! } : undefined,
      // No transit placeholder: this item is appended last, and the old
      // placeholder described travelling to the item itself ("Walk ---> X" on
      // X's own card), which is never correct. computeRefinedTransit below
      // fills in the real legs when coordinates allow.
    };

    const dayNumber = activeDayIndex + 1;
    const addedCost = parsePriceLabel(activity.priceLabel) * (trip.travelersCount > 0 ? trip.travelersCount : 1);
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
            kind: type === 'dining' ? 'meal' : type,
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
      // Accept any of the itinerary shapes normalizeChatItinerary understands.
      // Only `data.itinerary.daily_itinerary.days` was handled before, so a
      // differently-shaped (but successful) response fell through to the
      // "offline" branch below and added the activity a second time locally.
      const itinerary = normalizeChatItinerary(data.itinerary ?? data);
      if (itinerary) {
        // Mapped against the current render's trip so the resulting items are
        // available synchronously for the routing call. The old code assigned
        // `resultingDayItems` from inside the setTrip updater, which React may
        // invoke twice (StrictMode) or later than this line runs.
        const mapped = mapChatItineraryToTrip(itinerary, trip);
        const costs = { ...mapped.costs, activities: mapped.costs.activities + addedCost };
        const next: Trip = { ...mapped, costs: { ...costs, usdEstimate: tripTotal(costs) } };
        setTrip(next);
        resultingDayItems = next.days[activeDayIndex]?.items ?? null;
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    }

    if (!resultingDayItems) {
      const updatedDays = trip.days.map((day, idx) =>
        idx === activeDayIndex ? { ...day, items: [...day.items, newItem].sort(byTime) } : day,
      );
      const costs = { ...trip.costs, activities: trip.costs.activities + addedCost };
      setTrip({ ...trip, days: updatedDays, costs: { ...costs, usdEstimate: tripTotal(costs) } });
      resultingDayItems = updatedDays[activeDayIndex]?.items ?? null;
    }
    if (resultingDayItems) {
      const dayItems = fillMissingTransit(resultingDayItems);
      // Optimistic pass: show an estimate immediately, same as Reorder does,
      // instead of only ever showing real transit if/when the backend
      // refinement call succeeds.
      setTrip((prev) => {
        const day = prev.days[activeDayIndex];
        if (!day) return prev;
        const stillSame = day.items.map((it) => it.id).join('|') === resultingDayItems!.map((it) => it.id).join('|');
        if (!stillSame) return prev;
        const updatedDays = prev.days.map((d, idx) => (idx !== activeDayIndex ? d : { ...d, items: dayItems }));
        return { ...prev, days: updatedDays };
      });

      const refined = await computeRefinedTransit(dayItems);
      if (refined) {
        setTrip((prev) => {
          const day = prev.days[activeDayIndex];
          if (!day) return prev;
          const stillSame = day.items.map((it) => it.id).join('|') === dayItems.map((it) => it.id).join('|');
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
  const applyLocalItemEdit = (savedItem: TimelineItem) => {
    setTrip((prev) => {
      const updatedDays = prev.days.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        const exists = day.items.some((it) => it.id === savedItem.id);
        const newItems = exists
          ? day.items.map((it) => (it.id === savedItem.id ? savedItem : it))
          : [...day.items, savedItem];
        newItems.sort(byTime);
        return { ...day, items: newItems };
      });
      return { ...prev, days: updatedDays };
    });
  };

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
                  // The place's name, not its subtitle — sending the subtitle
                  // made the backend rename the stop to its own description.
                  name: savedItem.title,
                }
              : undefined,
          },
        }),
      });
      if (!response.ok) throw new Error(`Failed to save item (${response.status})`);
      const data = await response.json();
      const itinerary = normalizeChatItinerary(data.itinerary ?? data);
      if (itinerary) {
        setTrip((prev) => mapChatItineraryToTrip(itinerary, prev));
      } else {
        // Saved server-side but nothing usable came back — keep the local edit
        // instead of leaving the timeline showing the pre-edit version.
        applyLocalItemEdit(savedItem);
      }
    } catch (error) {
      console.error('Error saving itinerary item:', error);
      // optimistic local fallback so the UI doesn't feel broken if the API is down
      applyLocalItemEdit(savedItem);
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
    // TimelineView also hides the delete button for them, so this is a guard
    // rather than the primary defence.
    if (itemToDelete.type === 'flight' || itemToDelete.type === 'hotel') {
      console.warn('Flight/hotel items cannot be deleted via the itinerary chat layer.');
      return;
    }

    const removeLocally = () =>
      setTrip((prev) => {
        const updatedDays = prev.days.map((d, idx) =>
          idx !== activeDayIndex
            ? d
            : { ...d, items: d.items.filter((it) => it.id !== itemId) },
        );
        const costs = {
          ...prev.costs,
          activities: Math.max(
            0,
            prev.costs.activities -
              (itemToDelete.price ?? 0) * (prev.travelersCount > 0 ? prev.travelersCount : 1),
          ),
        };
        return { ...prev, days: updatedDays, costs: { ...costs, usdEstimate: tripTotal(costs) } };
      });

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
      const itinerary = normalizeChatItinerary(data.itinerary ?? data);
      if (itinerary) {
        setTrip((prev) => mapChatItineraryToTrip(itinerary, prev));
      } else {
        // Deleted server-side but no itinerary came back — the item used to
        // stay on screen until the next sync, looking like the delete failed.
        removeLocally();
      }
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      // Local-only fallback: remove from view even if the API call failed.
      // Will be overwritten by the server's version on next sync.
      removeLocally();
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
          const items: TimelineItem[] = schedule.map((item: any, index: number) => {
            const name = String(item.name ?? '');
            const kind = String(item.kind ?? '');
            let itemType: TimelineItem['type'] = KIND_TO_TYPE[kind] ?? 'activity';
            // `item.name` is optional in the planner payload; calling
            // .toLowerCase() on it directly threw for nameless entries.
            if (
              kind === 'flight' ||
              name.toLowerCase().includes('flight') ||
              name.toLowerCase().includes('arrival')
            )
              itemType = 'flight';

            const hasCoords = item.location?.latitude != null && item.location?.longitude != null;

            return {
              id: `item-${dayIdx}-${index}`,
              time: toHHMM(item.time, '12:00'),
              type: itemType,
              tag:
                kind === 'hotel' ? 'Rest'
                : kind === 'hotel_checkin' ? 'Hotel Check-in'
                : kind ? kind.charAt(0).toUpperCase() + kind.slice(1)
                : 'Activity',
              title: name || 'Planned activity',
              subtitle: item.location?.name || 'Location confirmed',
              details: formatActivityDetails(item.rating, item.duration_min),
              mapCoords: hasCoords
                ? { x: 0, y: 0, lat: item.location.latitude, lng: item.location.longitude }
                : undefined,
              // Planner already computed real transit for every leg — surface it
              // immediately instead of only backfilling it via
              // computeRefinedTransit after a later add/reorder action.
              // (There used to be two `transitToNext` keys in this object, so
              // the first mapping was silently dead code.)
              transitToNext: toTransitInfo(item.transit_to_next),
              // kind 'hotel_checkin' IS the booking moment, so it gets the rich
              // card; plain 'hotel' ("Return to Hotel") stays a rest beat.
              hotelDetails: itemType === 'hotel' ? hotelDetails : undefined,
              nights: itemType === 'hotel' ? hotelDetails.totalNights : undefined,
              flightDetails:
                itemType === 'flight'
                  ? isLastDay
                    ? returnDetails
                    : outboundDetails
                  : undefined,
            };
          });

          // Ensure Day 1 has explicit Flight Arrival and Hotel Check-in items if not present
          if (isFirstDay) {
            const hasFlight = items.some((it) => it.type === 'flight');
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

            // Only synthesize a check-in card when the planner didn't already
            // return one (kind 'hotel_checkin'), otherwise day 1 shows two
            // "Hotel Check-in" cards for the same booking.
            const hasCheckIn = items.some((it) => it.type === 'hotel' && it.tag === 'Hotel Check-in');
            if (!hasCheckIn) {
              items.push({
                id: `item-hotel-checkin-day${dayIdx + 1}`,
                time: earliestCheckInAfterArrival(hotelDetails.checkIn, outboundDetails.arrTime),
                type: 'hotel',
                tag: 'Hotel Check-in',
                title: `Check-in: ${hotelDetails.name}`,
                subtitle: hotelDetails.address,
                nights: hotelDetails.totalNights,
                hotelDetails,
              });
            }
          }

          if (isLastDay) {
            const hasCheckOut = items.some((it) => it.type === 'hotel' && it.tag === 'Hotel Check-out');
            if (!hasCheckOut) {
              items.push({
                id: `item-hotel-checkout-day${dayIdx + 1}`,
                time: hotelDetails.checkOut,
                type: 'hotel',
                tag: 'Hotel Check-out',
                title: `Check-out: ${hotelDetails.name}`,
                subtitle: hotelDetails.address,
                hotelDetails,
              });
            }

            const hasReturnFlight = items.some(
              (it) => it.type === 'flight' && it.flightDetails?.direction === 'return',
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

          // Chronological order by parsed minutes, not string comparison
          items.sort(byTime);

          return {
            dayNumber: dayIdx + 1,
            dateLabel: `Day ${dayIdx + 1} • ${day.date || ''}`,
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

      const generatedCosts = {
        activities: (apiData.cost_breakdown?.activities || 0) * travelersCount,
        // Accommodation comes from the hotel booking. The old fallback chain
        // reached for cost_breakdown.food_dining — a completely unrelated
        // budget line — whenever the hotel had no total.
        accommodation:
          hotelDetails.totalPrice ??
          apiData.cost_breakdown?.accommodation ??
          0,
        flights: (outboundDetails.price + returnDetails.price) * travelersCount,
        currency: apiData.cost_breakdown?.currency || outboundDetails.currency || 'USD',
        usdEstimate: 0,
      };

      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        title:
          apiData.trip_overview?.title || `${destination.split(',')[0]} Trip`,
        destination: destination,
        dates: dates,
        travelersCount: travelersCount,
        budget: budget,
        vibes: newTripData.vibes ?? [],
        // usdEstimate is the grand total (accommodation + flights + activities)
        // so the timeline summary and the Finalize & Pay screen quote the same
        // figure; activities used to be silently excluded here.
        costs: { ...generatedCosts, usdEstimate: tripTotal(generatedCosts) },
        members: [
          {
            id: 'member-0',
            name: 'You',
            avatar: `https://i.pravatar.cc/150?u=0`,
            shareAmount: Math.round(tripTotal(generatedCosts) / (travelersCount || 1)),
            hasPaid: false,
            isCurrentUser: true,
          },
        ],
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
        flightSearchParams?: typeof flightSearchParams;
        chatSessionId?: string;
      } = JSON.parse(saved);
      setTrip(parsed.trip);
      if (parsed.hotelSearchParams) {
        setHotelSearchParams(parsed.hotelSearchParams);
      }
      // Same class of bug as hotelSearchParams: without these, "Change Flight"
      // searched with empty origin/destination and the AI co-pilot started a
      // brand new server session (losing the itinerary context) after a
      // payment redirect.
      if (parsed.flightSearchParams) {
        setFlightSearchParams(parsed.flightSearchParams);
      }
      if (parsed.chatSessionId) {
        setChatSessionId(parsed.chatSessionId);
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
            flightSearchParams={flightSearchParams}
            chatSessionId={chatSessionId}
            onBack={() => setActiveView('workspace')}
            onUpdateMembers={(members) => setTrip((prev) => ({ ...prev, members }))}
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
              isGenerating={isAIGenerating && trip.days.length === 0}
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
        originLat={activitySearchOrigin.lat}
        originLng={activitySearchOrigin.lng}
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