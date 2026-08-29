export type NavTab = 'trips' | 'dashboard' | 'assistant' | 'explore' | 'archive';

export type TravelVibe = 'culture' | 'scenery' | 'food' | 'shopping' | 'entertainment' | 'adventure' | 'wellness' | 'city';

export interface TransitInfo {
  type: 'subway' | 'train' | 'walk' | 'bus' | 'taxi';
  description: string;
  duration?: string;
  distance?: string;
}

export interface FlightDetails {
  direction?: string;
  carrier?: string;
  flightNumber?: string;
  depAirport?: string;
  arrAirport?: string;
  depTime?: string;
  arrTime?: string;
  cabin?: string;
  fareFamily?: string;
  price?: number;
  currency?: string;
  durationMinutes?: number;
}

export interface HotelDetails {
  name?: string;
  address?: string;
  city?: string;
  starRating?: number;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  totalNights?: number;
  pricePerNight?: number;
  totalPrice?: number;
  currency?: string;
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
  flightDetails?: FlightDetails;
  hotelDetails?: HotelDetails;
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

export interface RoomOption {
  room_name: string;
  max_occupancy: number;
  price_per_night: number;
  total_price: number;
  currency: string;
  breakfast_included: boolean;
  is_refundable: boolean;
  cancellation_policy: string | null;
}
 
export interface StaySchedule {
  check_in_date: string;
  check_in_time: string;
  check_out_date: string;
  check_out_time: string;
  total_nights: number;
}
 
export interface StayOption {
  hotel_id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  star_rating: number | null;
  rating: number | null;          // guest review score, e.g. 8.7 - null until StayAPI/mock data supplies it
  review_count: number | null;
  image_url: string | null;       // null until StayAPI/mock data supplies it - render a placeholder image when null
  is_sponsored: boolean;
  stay_schedule: StaySchedule;
  selected_room: RoomOption;
  available_rooms: RoomOption[];
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
