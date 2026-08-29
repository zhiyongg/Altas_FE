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
  const [activeView, setActiveView] = useState<
    'landing' | 'workspace' | 'finalize_pay' | 'archive'
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

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

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

  // Switch Flight
  const handleSelectFlight = (flight: FlightOption) => {
    setTrip((prev) => {
      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type === 'flight') {
            return {
              ...item,
              title: `Arrival via ${flight.airline}`,
              subtitle: `${flight.flightCode} • ${flight.from} to ${trip.destination.split(',')[0]}`,
              time: flight.arriveTime,
              bookingRef: `${flight.flightCode.slice(0, 2)}-${Math.floor(1000 + Math.random() * 9000)}`,
              terminal: 'T1',
            };
          }
          return item;
        }),
      }));

      return {
        ...prev,
        days: updatedDays,
        costs: {
          ...prev.costs,
          flights: Math.round(flight.price * 150),
          usdEstimate:
            prev.costs.activities / 150 +
            prev.costs.accommodation / 150 +
            flight.price,
        },
      };
    });

    // Add confirmation to chat
    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Updated your flight to ${flight.airline} (${flight.flightCode}) arriving at ${flight.arriveTime}. Recalculated your total budget!`,
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
    const locationLabel =
      [stay.address, stay.city].filter(Boolean).join(', ') || stay.name;

    setTrip((prev) => {
      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type === 'hotel') {
            return {
              ...item,
              title: `Check-in: ${stay.name}`,
              subtitle: `${locationLabel} • Confirmed`,
              image: stay.image_url ?? item.image,
            };
          }
          return item;
        }),
      }));

      const newAccomTotal = room.total_price;
      return {
        ...prev,
        days: updatedDays,
        costs: {
          ...prev.costs,
          accommodation: newAccomTotal,
          // NOTE: still assumes activities/flights share the new hotel's
          // currency — a real FX rate is needed if that's not guaranteed.
          usdEstimate:
            (prev.costs.activities + newAccomTotal) / 150 +
            prev.costs.flights / 150,
        },
      };
    });

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Upgraded your stay to ${stay.name} (${locationLabel}) — ${room.room_name}. Total accommodation updated to ${currencySymbol(
        room.currency,
      )}${room.total_price.toLocaleString()}.`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsAccommodationModalOpen(false);
  };

  // Add Activity to current day
  const handleAddActivity = (activity: ActivityOption) => {
    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      time: '19:30',
      type:
        activity.category === 'Dining'
          ? 'dining'
          : activity.category === 'Nature'
            ? 'culture'
            : 'activity',
      tag: activity.category,
      title: activity.title,
      subtitle: activity.description,
      image: activity.image,
      details: `Rating: ${activity.rating} ⭐ (${activity.reviewsCount} reviews) • Distance: ${activity.distance}`,
      transitToNext: {
        type: 'walk',
        description: `Walk --- 500m (6 mins) ---> ${activity.title}`,
      },
    };

    setTrip((prev) => {
      const updatedDays = [...prev.days];
      const targetDay = updatedDays[activeDayIndex] || updatedDays[0];
      targetDay.items = [...targetDay.items, newItem];

      return {
        ...prev,
        days: updatedDays,
        costs: {
          ...prev.costs,
          activities: prev.costs.activities + 6000,
          usdEstimate: prev.costs.usdEstimate + 40,
        },
      };
    });

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Added "${activity.title}" to ${trip.days[activeDayIndex].dateLabel}. Optimal transit route mapped.`,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, confirmMsg]);
    setIsActivityModalOpen(false);
  };

  // Edit / Save Timeline Item
  const handleSaveEditedItem = (savedItem: TimelineItem) => {
    setTrip((prev) => {
      const updatedDays = prev.days.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        const exists = day.items.some((it) => it.id === savedItem.id);
        const newItems = exists
          ? day.items.map((it) => (it.id === savedItem.id ? savedItem : it))
          : [...day.items, savedItem];

        // Sort items chronologically by time
        newItems.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        return { ...day, items: newItems };
      });
      return { ...prev, days: updatedDays };
    });

    setIsEditItemModalOpen(false);
    setEditingItem(null);
  };

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
      const waypoints = recalculated
        .filter((it) => it.mapCoords?.lat != null && it.mapCoords?.lng != null)
        .map((it) => ({ id: it.id, lat: it.mapCoords!.lat!, lng: it.mapCoords!.lng! }));
      if (waypoints.length < 2) return;

      const legs = await recalculateRoute(waypoints);
      if (!legs) {
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

        const refinedItems = day.items.map((item, idx) => {
          const next = day.items[idx + 1];
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

        const updatedDays = prev.days.map((d, idx) =>
          idx !== dayIndex ? d : { ...d, items: refinedItems }
        );
        return { ...prev, days: updatedDays };
      });
    }, 800);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setTrip((prev) => {
      const updatedDays = prev.days.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          items: day.items.filter((it) => it.id !== itemId),
        };
      });
      return { ...prev, days: updatedDays };
    });
  };

  // AI Chat & Intent Processing
  const handleSendMessage = (userText: string) => {
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setIsAIGenerating(true);

    setTimeout(() => {
      const textLower = userText.toLowerCase();
      let aiReply = '';
      let suggestions: string[] = [];

      if (
        textLower.includes('coffee') ||
        textLower.includes('shimokitazawa') ||
        textLower.includes('swap')
      ) {
        // Swap or add coffee
        const coffeeItem: TimelineItem = {
          id: `item-coffee-${Date.now()}`,
          time: '09:30',
          type: 'dining',
          tag: 'Cafe & Culture',
          title: 'Specialty Coffee Tour • Shimokitazawa',
          subtitle: 'Artisanal pour-overs and vintage vinyl coffee shops.',
          details: 'Recommended spots: Bear Pond Espresso & Coffea Exprectus.',
          transitToNext: {
            type: 'subway',
            description: 'Odakyu Line --- 12 mins ---> Shinjuku',
          },
        };

        setTrip((prev) => {
          const updatedDays = [...prev.days];
          updatedDays[0].items = [
            coffeeItem,
            ...updatedDays[0].items.filter((i) => i.tag !== 'Morning'),
          ];
          return { ...prev, days: updatedDays };
        });

        aiReply = `Done! I've scheduled the Shimokitazawa Specialty Coffee Tour for morning on Day 1, with transit connection back to Shinjuku.`;
        suggestions = [
          'Find ramen for dinner nearby',
          'View Day 1 on map',
          'Add thrift shopping in Shimokitazawa',
        ];
      } else if (
        textLower.includes('flight') ||
        textLower.includes('airline')
      ) {
        aiReply = `Here are alternative direct and connecting flights for Tokyo. Opening the flight replacer now...`;
        setIsFlightModalOpen(true);
      } else if (
        textLower.includes('hotel') ||
        textLower.includes('stay') ||
        textLower.includes('accommodation')
      ) {
        aiReply = `Opening our curated selection of verified Tokyo stays and ryokans...`;
        setIsAccommodationModalOpen(true);
      } else if (
        textLower.includes('activity') ||
        textLower.includes('museum') ||
        textLower.includes('ramen') ||
        textLower.includes('add')
      ) {
        aiReply = `I've opened the activity finder with nearby culinary spots and cultural landmarks.`;
        setIsActivityModalOpen(true);
      } else if (
        textLower.includes('split') ||
        textLower.includes('pay') ||
        textLower.includes('bill') ||
        textLower.includes('cost')
      ) {
        aiReply = `Taking you to the group payment breakdown where you can divide expenses among all 4 travelers!`;
        setActiveView('finalize_pay');
      } else {
        aiReply = `I've analyzed your itinerary constraints. Tokyo's transit flows smoothly with this pacing, leaving approx 1.5 hours buffer between major landmarks.`;
        suggestions = [
          'Add teamLab Planets to Day 3',
          'Switch to boutique Ryokan in Asakusa',
          'Calculate group bill split',
        ];
      }

      const aiMsgObj: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: 'Just now',
        suggestionPills: suggestions.length > 0 ? suggestions : undefined,
      };

      setChatMessages((prev) => [...prev, aiMsgObj]);
      setIsAIGenerating(false);
    }, 600);
  };

  // Create new trip
  const handleCreateNewTrip = async (newTripData: Partial<Trip>) => {
    setIsAIGenerating(true);
    setActiveView('workspace');
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
      const customMessages =
        newTripData.specialRequests ||
        'Please make sure to add an activity to visit a cafe to unwind after the flight on day 1.';

      const response = await fetch('http://127.0.0.1:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_request: userRequest,
          custom_messages: customMessages,
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
            depTime: outboundFlightData.dep_time || '08:30',
            arrTime: outboundFlightData.arr_time || '11:45',
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
            depTime: returnFlightData.dep_time || '17:30',
            arrTime: returnFlightData.arr_time || '20:45',
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

          let items = (day.schedule || []).map((item: any, index: number) => {
            let itemType: 'activity' | 'hotel' | 'dining' | 'flight' =
              'activity';
            if (item.kind === 'hotel') itemType = 'hotel';
            if (item.kind === 'meal') itemType = 'dining';
            if (
              item.kind === 'flight' ||
              item.name.toLowerCase().includes('flight') ||
              item.name.toLowerCase().includes('arrival')
            )
              itemType = 'flight';

            return {
              id: `item-${day.day || dayIdx}-${index}-${Date.now()}`,
              time: item.time,
              type: itemType,
              tag: item.kind
                ? item.kind.charAt(0).toUpperCase() + item.kind.slice(1)
                : 'Activity',
              title: item.name,
              subtitle: item.location?.name || 'Location confirmed',
              details: item.rating
                ? `Rating: ${item.rating} ⭐ • Duration: ${item.duration_min || 60} mins`
                : undefined,
              mapCoords: item.location
                ? {
                    x: 0,
                    y: 0,
                    lat: item.location.latitude,
                    lng: item.location.longitude,
                  }
                : undefined,
              hotelDetails: itemType === 'hotel' ? hotelDetails : undefined,
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
            const hasFlight = items.some((it: any) => it.type === 'flight');
            const hasHotel = items.some((it: any) => it.type === 'hotel');

            if (!hasFlight) {
              items.unshift({
                id: `item-flight-outbound-${Date.now()}`,
                time: outboundDetails.arrTime,
                type: 'flight',
                tag: 'Outbound Flight',
                title: `Arrival via ${outboundDetails.carrier} (${outboundDetails.flightNumber})`,
                subtitle: `${outboundDetails.depAirport} ➔ ${outboundDetails.arrAirport} • ${outboundDetails.cabin}`,
                terminal: 'Terminal 1',
                bookingRef: `${outboundDetails.flightNumber.replace(' ', '')}-REF`,
                flightDetails: outboundDetails,
              });
            }

            if (!hasHotel) {
              items.push({
                id: `item-hotel-checkin-${Date.now()}`,
                time: hotelDetails.checkIn || '15:00',
                type: 'hotel',
                tag: 'Hotel Check-in',
                title: `Check-in: ${hotelDetails.name}`,
                subtitle: `${hotelDetails.address} • Confirmed`,
                nights: hotelDetails.totalNights,
                hotelDetails: hotelDetails,
              });
            }
          }

          // Ensure Final Day has Return Flight if not present
          if (isLastDay) {
            const hasCheckout = items.some(
              (it: any) => it.type === 'hotel' && it.tag === 'Hotel Check-out',
            );
            if (!hasCheckout) {
              items.push({
                id: `item-hotel-checkout-${Date.now()}`,
                time: hotelDetails.checkOut || '11:00',
                type: 'hotel',
                tag: 'Hotel Check-out',
                title: `Check-out: ${hotelDetails.name}`,
                subtitle: `${hotelDetails.address}`,
                hotelDetails: hotelDetails,
              });
            }

            const hasReturnFlight = items.some(
              (it: any) =>
                it.type === 'flight' &&
                it.flightDetails?.direction === 'return',
            );
            if (!hasReturnFlight) {
              items.push({
                id: `item-flight-return-${Date.now()}`,
                time: returnDetails.depTime,
                type: 'flight',
                tag: 'Return Flight',
                title: `Departure via ${returnDetails.carrier} (${returnDetails.flightNumber})`,
                subtitle: `${returnDetails.depAirport} ➔ ${returnDetails.arrAirport} • ${returnDetails.cabin}`,
                terminal: 'Terminal 2',
                bookingRef: `${returnDetails.flightNumber.replace(' ', '')}-RET`,
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
          usdEstimate:
            apiData.trip_overview?.total_estimated_budget?.amount || budget,
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
            'Find rooftop dining nearby',
            'Explore local night markets',
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
      />

      <AddActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onAddActivity={handleAddActivity}
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
