export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const popularAirports: Airport[] = [
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia' },
  { code: 'TPE', name: 'Taoyuan International Airport', city: 'Taipei', country: 'Taiwan' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India' },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
  { code: 'BKI', name: 'Kota Kinabalu International Airport', city: 'Kota Kinabalu', country: 'Malaysia' },
  { code: 'PEN', name: 'Penang International Airport', city: 'Penang', country: 'Malaysia' },
];
