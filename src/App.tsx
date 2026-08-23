import React, { useState } from 'react';
import { Trip, TimelineItem, ChatMessage, FlightOption, StayOption, ActivityOption, NavTab } from './types';
import { initialTokyoTrip as mockTokyoTrip, initialChatMessages } from './data/mockTripData';
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

export const App: React.FC = () => {
  const [trip, setTrip] = useState<Trip>(mockTokyoTrip);
  const [activeTab, setActiveTab] = useState<NavTab>('trips');
  const [isMapView, setIsMapView] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'landing' | 'workspace' | 'finalize_pay' | 'archive'>('landing');
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [hasGeneratedItinerary, setHasGeneratedItinerary] = useState<boolean>(false);
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([]);
  
  // Modals state
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Handle Tab changes
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'trips') {
      setActiveView('landing');
    } else if (tab === 'dashboard' || tab === 'assistant') {
      setActiveView('workspace');
    } else if (tab === 'explore') {
      setActiveView('landing');
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
          usdEstimate: prev.costs.activities / 150 + prev.costs.accommodation / 150 + flight.price,
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
  const handleSelectAccommodation = (stay: StayOption) => {
    setTrip((prev) => {
      const updatedDays = prev.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type === 'hotel') {
            return {
              ...item,
              title: `Check-in: ${stay.name}`,
              subtitle: `${stay.location} • Confirmed`,
              image: stay.image,
            };
          }
          return item;
        }),
      }));

      const newAccomTotal = stay.pricePerNight * 5;
      return {
        ...prev,
        days: updatedDays,
        costs: {
          ...prev.costs,
          accommodation: newAccomTotal,
          usdEstimate: (prev.costs.activities + newAccomTotal) / 150 + prev.costs.flights / 150,
        },
      };
    });

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Upgraded your stay to ${stay.name} (${stay.location}). Total accommodation updated to ¥${(stay.pricePerNight * 5).toLocaleString()}.`,
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
      type: activity.category === 'Dining' ? 'dining' : activity.category === 'Nature' ? 'culture' : 'activity',
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
        newItems.sort((a, b) => a.time.localeCompare(b.time));
        return { ...day, items: newItems };
      });
      return { ...prev, days: updatedDays };
    });

    setIsEditItemModalOpen(false);
    setEditingItem(null);
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

      if (textLower.includes('coffee') || textLower.includes('shimokitazawa') || textLower.includes('swap')) {
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
          updatedDays[0].items = [coffeeItem, ...updatedDays[0].items.filter((i) => i.tag !== 'Morning')];
          return { ...prev, days: updatedDays };
        });

        aiReply = `Done! I've scheduled the Shimokitazawa Specialty Coffee Tour for morning on Day 1, with transit connection back to Shinjuku.`;
        suggestions = ['Find ramen for dinner nearby', 'View Day 1 on map', 'Add thrift shopping in Shimokitazawa'];
      } else if (textLower.includes('flight') || textLower.includes('airline')) {
        aiReply = `Here are alternative direct and connecting flights for Tokyo. Opening the flight replacer now...`;
        setIsFlightModalOpen(true);
      } else if (textLower.includes('hotel') || textLower.includes('stay') || textLower.includes('accommodation')) {
        aiReply = `Opening our curated selection of verified Tokyo stays and ryokans...`;
        setIsAccommodationModalOpen(true);
      } else if (textLower.includes('activity') || textLower.includes('museum') || textLower.includes('ramen') || textLower.includes('add')) {
        aiReply = `I've opened the activity finder with nearby culinary spots and cultural landmarks.`;
        setIsActivityModalOpen(true);
      } else if (textLower.includes('split') || textLower.includes('pay') || textLower.includes('bill') || textLower.includes('cost')) {
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
  const handleCreateNewTrip = (newTripData: Partial<Trip>) => {
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: `${newTripData.destination?.split(',')[0]} Adventure`,
      destination: newTripData.destination || 'Kyoto, Japan',
      dates: newTripData.dates || 'Nov 12 - Nov 18, 2025',
      travelersCount: newTripData.travelersCount || 4,
      budget: newTripData.budget || 2400,
      vibes: ['Culture', 'Foodie'],
      costs: {
        activities: 52000,
        accommodation: 98000,
        flights: 120000,
        currency: '¥',
        usdEstimate: newTripData.budget || 2400,
      },
      members: mockTokyoTrip.members,
      days: [
        {
          dayNumber: 1,
          dateLabel: 'Day 1 • Nov 12',
          items: [
            {
              id: 'new-1',
              time: '10:00',
              type: 'flight',
              tag: 'Arrival',
              title: `Arrival at ${newTripData.destination?.split(',')[0]} International`,
              subtitle: 'Flight confirmed • Airport express connection',
              transitToNext: { type: 'train', description: 'Airport Express --- 45 mins ---> City Center' },
            },
            {
              id: 'new-2',
              time: '14:00',
              type: 'hotel',
              tag: 'Hotel',
              title: `Check-in: Grand Central ${newTripData.destination?.split(',')[0]}`,
              subtitle: 'Luxury King Suite • 5 Nights',
            },
            {
              id: 'new-3',
              time: '17:30',
              type: 'culture',
              tag: 'Sightseeing',
              title: 'Historic District Walking Tour',
              subtitle: 'Evening walking exploration and traditional landmarks.',
            },
            {
              id: 'new-4',
              time: '19:30',
              type: 'dining',
              tag: 'Dinner',
              title: 'Local Signature Tasting Dinner',
              subtitle: 'Michelin-guide recommended regional cuisine.',
            },
          ],
        },
        {
          dayNumber: 2,
          dateLabel: 'Day 2 • Nov 13',
          items: [
            {
              id: 'new-5',
              time: '09:00',
              type: 'culture',
              tag: 'Morning Tour',
              title: 'Heritage Temple & Garden Walk',
              subtitle: 'Early access guided temple meditation and gardens.',
            },
            {
              id: 'new-6',
              time: '13:00',
              type: 'dining',
              tag: 'Lunch',
              title: 'Artisan Food Hall & Markets',
              subtitle: 'Regional delicacies and seasonal sweets.',
            },
          ],
        },
      ],
    };

    setTrip(newTrip);
    setActiveDayIndex(0);
    setHasGeneratedItinerary(true);
    setActiveTab('dashboard');
    setActiveView('workspace');

    setChatMessages([
      {
        id: 'msg-start',
        sender: 'ai',
        text: `Welcome to your customized trip plan for ${newTrip.destination}! I've arranged your arrival, boutique hotel, and prime day experiences. What would you like to explore or adjust?`,
        timestamp: 'Just now',
        suggestionPills: [
          'Add hidden gem coffee spots',
          'Explore night markets & street food',
          'Upgrade hotel to 5-star Ryokan',
        ],
      },
    ]);
  };

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
          <FinalizePayView trip={trip} onBack={() => setActiveView('workspace')} />
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
