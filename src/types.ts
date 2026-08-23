export type NavTab = 'trips' | 'dashboard' | 'assistant' | 'explore' | 'archive';

export type TravelVibe = 'Chill' | 'Culture' | 'Foodie' | 'Adventure' | 'Nightlife' | 'Romantic' | 'Luxury' | 'Shopping';

export interface TransitInfo {
  type: 'subway' | 'train' | 'walk' | 'bus' | 'taxi';
  description: string;
  duration?: string;
  distance?: string;
}

export interface TimelineItem {
  id: string;
  time: string;
  type: 'activity' | 'flight' | 'hotel' | 'dining' | 'nightlife' | 'culture' | 'nature' | 'shopping';
  tag: string;
  title: string;
  subtitle: string;
  image?: string;
  price?: number;
  priceLabel?: string;
  details?: string;
  rating?: number;
  reviewsCount?: number;
  mapPinNumber?: number;
  mapCoords?: { x: number; y: number; lat?: number; lng?: number };
  transitToNext?: TransitInfo;
  bookingRef?: string;
  terminal?: string;
  nights?: number;
}

export interface DayPlan {
  dayNumber: number;
  dateLabel: string;
  items: TimelineItem[];
}

export interface TripMember {
  id: string;
  name: string;
  avatar: string;
  shareAmount: number;
  hasPaid: boolean;
  isCurrentUser?: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  dates: string;
  travelersCount: number;
  budget: number;
  vibes: TravelVibe[];
  specialRequests?: string;
  days: DayPlan[];
  members: TripMember[];
  costs: {
    activities: number;
    accommodation: number;
    flights: number;
    currency: string;
    usdEstimate: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestionPills?: string[];
  actionApplied?: string;
}

export interface FlightOption {
  id: string;
  airline: string;
  airlineLogo: string;
  flightCode: string;
  from: string;
  to?: string;
  departTime: string;
  arriveTime: string;
  date: string;
  duration: string;
  layover: string;
  price: number;
  nonRefundable: boolean;
  seatsLeft: number;
}

export interface StayOption {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currencySymbol: string;
  image: string;
  isSponsored: boolean;
  nights: number;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ActivityOption {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  rating: number;
  reviewsCount?: number;
  distance: string;
  priceLabel: string;
  image: string;
  isSponsored: boolean;
  description: string;
  timeSlot?: string;
  isFavorite?: boolean;
}
