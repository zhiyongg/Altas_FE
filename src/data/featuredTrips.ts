import { Trip, TravelVibe } from '../types';

const defaultMembers = [
  { id: 'm1', name: 'You', avatar: 'https://i.pravatar.cc/150?u=0', shareAmount: 1250, hasPaid: true, isCurrentUser: true },
  { id: 'm2', name: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=1', shareAmount: 1250, hasPaid: false },
];

export const featuredTrips: Trip[] = [
  {
    id: 'feat-tokyo',
    title: 'Tokyo Urban Adventure',
    destination: 'Tokyo, Japan',
    dates: 'Oct 10 - Oct 15, 2025',
    travelersCount: 2,
    budget: 2500,
    vibes: ['packed'] as TravelVibe[],
    costs: { activities: 800, accommodation: 1000, flights: 700, currency: 'USD', usdEstimate: 2500 },
    members: defaultMembers,
    days: [
      {
        dayNumber: 1,
        dateLabel: 'Day 1 • Oct 10',
        items: [
          {
            id: 'tokyo-flight',
            time: '14:30',
            type: 'flight',
            tag: 'Arrival',
            title: 'Arrival at Narita (NRT)',
            subtitle: 'Flight NH123 • Terminal 1',
            mapCoords: { x: 0, y: 0, lat: 35.771986, lng: 140.392850 },
          },
          {
            id: 'tokyo-hotel',
            time: '16:00',
            type: 'hotel',
            tag: 'Check-in',
            title: 'Check-in: Keio Plaza Hotel',
            subtitle: 'Shinjuku City',
            mapCoords: { x: 0, y: 0, lat: 35.6896, lng: 139.6922 },
          },
          {
            id: 'tokyo-dinner',
            time: '19:00',
            type: 'dining',
            tag: 'Dinner',
            title: 'Omoide Yokocho',
            subtitle: 'Iconic narrow alleyway packed with tiny yakitori stalls.',
            mapCoords: { x: 0, y: 0, lat: 35.6931, lng: 139.6995 },
          }
        ]
      },
      {
        dayNumber: 2,
        dateLabel: 'Day 2 • Oct 11',
        items: [
          {
            id: 'tokyo-tsukiji',
            time: '08:00',
            type: 'dining',
            tag: 'Breakfast',
            title: 'Tsukiji Outer Market',
            subtitle: 'Fresh seafood breakfast and street food stalls.',
            mapCoords: { x: 0, y: 0, lat: 35.6654, lng: 139.7706 },
          },
          {
            id: 'tokyo-shrine',
            time: '10:30',
            type: 'culture',
            tag: 'Culture',
            title: 'Meiji Jingu Shrine',
            subtitle: 'Explore the forested grounds.',
            mapCoords: { x: 0, y: 0, lat: 35.6763, lng: 139.6993 },
          },
          {
            id: 'tokyo-teamlab',
            time: '14:00',
            type: 'activity',
            tag: 'Museum',
            title: 'teamLab Planets TOKYO',
            subtitle: 'Immersive digital art exhibition.',
            mapCoords: { x: 0, y: 0, lat: 35.6499, lng: 139.7891 },
          }
        ]
      },
      {
        dayNumber: 3,
        dateLabel: 'Day 3 • Oct 12',
        items: [
          {
            id: 'tokyo-asakusa',
            time: '09:00',
            type: 'culture',
            tag: 'Temple',
            title: 'Senso-ji Temple',
            subtitle: 'Tokyo\'s oldest Buddhist temple in Asakusa.',
            mapCoords: { x: 0, y: 0, lat: 35.7147, lng: 139.7966 },
          },
          {
            id: 'tokyo-skytree',
            time: '13:00',
            type: 'activity',
            tag: 'Landmark',
            title: 'Tokyo Skytree',
            subtitle: 'Iconic broadcasting tower with observation decks.',
            mapCoords: { x: 0, y: 0, lat: 35.7100, lng: 139.8107 },
          },
          {
            id: 'tokyo-akihabara',
            time: '16:00',
            type: 'shopping',
            tag: 'Shopping',
            title: 'Akihabara Electric Town',
            subtitle: 'Anime, manga, and electronics district.',
            mapCoords: { x: 0, y: 0, lat: 35.6983, lng: 139.7731 },
          }
        ]
      },
      {
        dayNumber: 4,
        dateLabel: 'Day 4 • Oct 13',
        items: [
          {
            id: 'tokyo-shibuya',
            time: '10:00',
            type: 'activity',
            tag: 'Sightseeing',
            title: 'Shibuya Crossing & Hachiko',
            subtitle: 'The busiest pedestrian crossing in the world.',
            mapCoords: { x: 0, y: 0, lat: 35.6595, lng: 139.7005 },
          },
          {
            id: 'tokyo-harajuku',
            time: '13:30',
            type: 'shopping',
            tag: 'Shopping',
            title: 'Takeshita Street, Harajuku',
            subtitle: 'Trendy fashion boutiques and crepes.',
            mapCoords: { x: 0, y: 0, lat: 35.6713, lng: 139.7032 },
          }
        ]
      }
    ]
  },
  {
    id: 'feat-kyoto',
    title: 'Kyoto Temple Serenity',
    destination: 'Kyoto, Japan',
    dates: 'Nov 12 - Nov 18, 2025',
    travelersCount: 2,
    budget: 2200,
    vibes: ['relaxed'] as TravelVibe[],
    costs: { activities: 400, accommodation: 1200, flights: 600, currency: 'USD', usdEstimate: 2200 },
    members: defaultMembers,
    days: [
      {
        dayNumber: 1,
        dateLabel: 'Day 1 • Nov 12',
        items: [
          {
            id: 'kyoto-fushimi',
            time: '14:00',
            type: 'culture',
            tag: 'Shrine',
            title: 'Fushimi Inari Taisha',
            subtitle: 'Famous shrine with thousands of vermilion torii gates.',
            mapCoords: { x: 0, y: 0, lat: 34.9671, lng: 135.7726 },
          }
        ]
      },
      {
        dayNumber: 2,
        dateLabel: 'Day 2 • Nov 13',
        items: [
          {
            id: 'kyoto-kiyomizu',
            time: '09:00',
            type: 'culture',
            tag: 'Temple',
            title: 'Kiyomizu-dera',
            subtitle: 'Iconic Buddhist temple overlooking the city.',
            mapCoords: { x: 0, y: 0, lat: 34.9948, lng: 135.7850 },
          },
          {
            id: 'kyoto-gion',
            time: '18:00',
            type: 'culture',
            tag: 'District',
            title: 'Gion District',
            subtitle: 'Traditional entertainment district famous for geisha.',
            mapCoords: { x: 0, y: 0, lat: 35.0037, lng: 135.7736 },
          }
        ]
      },
      {
        dayNumber: 3,
        dateLabel: 'Day 3 • Nov 14',
        items: [
          {
            id: 'kyoto-arashiyama',
            time: '08:30',
            type: 'nature',
            tag: 'Nature',
            title: 'Arashiyama Bamboo Grove',
            subtitle: 'Walking paths through a soaring bamboo forest.',
            mapCoords: { x: 0, y: 0, lat: 35.0135, lng: 135.6728 },
          },
          {
            id: 'kyoto-kinkakuji',
            time: '14:00',
            type: 'culture',
            tag: 'Temple',
            title: 'Kinkaku-ji (Golden Pavilion)',
            subtitle: 'Zen temple whose top two floors are completely covered in gold leaf.',
            mapCoords: { x: 0, y: 0, lat: 35.0394, lng: 135.7292 },
          }
        ]
      },
      {
        dayNumber: 4,
        dateLabel: 'Day 4 • Nov 15',
        items: [
          {
            id: 'kyoto-nishiki',
            time: '10:30',
            type: 'dining',
            tag: 'Market',
            title: 'Nishiki Market',
            subtitle: 'Kyoto\'s Kitchen - a narrow shopping street lined with more than 100 shops and restaurants.',
            mapCoords: { x: 0, y: 0, lat: 35.0051, lng: 135.7644 },
          },
          {
            id: 'kyoto-nijo',
            time: '13:30',
            type: 'culture',
            tag: 'Castle',
            title: 'Nijo Castle',
            subtitle: 'Former Kyoto residence of the Tokugawa shogun.',
            mapCoords: { x: 0, y: 0, lat: 35.0142, lng: 135.7482 },
          }
        ]
      }
    ]
  },
  {
    id: 'feat-seoul',
    title: 'Seoul Vibrant K-Culture',
    destination: 'Seoul, South Korea',
    dates: 'Sep 20 - Sep 26, 2025',
    travelersCount: 2,
    budget: 1900,
    vibes: ['moderate'] as TravelVibe[],
    costs: { activities: 500, accommodation: 800, flights: 600, currency: 'USD', usdEstimate: 1900 },
    members: defaultMembers,
    days: [
      {
        dayNumber: 1,
        dateLabel: 'Day 1 • Sep 20',
        items: [
          {
            id: 'seoul-gyeongbokgung',
            time: '10:00',
            type: 'culture',
            tag: 'Palace',
            title: 'Gyeongbokgung Palace',
            subtitle: 'The largest of the Five Grand Palaces built during the Joseon dynasty.',
            mapCoords: { x: 0, y: 0, lat: 37.5796, lng: 126.9770 },
          }
        ]
      },
      {
        dayNumber: 2,
        dateLabel: 'Day 2 • Sep 21',
        items: [
          {
            id: 'seoul-bukchon',
            time: '10:30',
            type: 'culture',
            tag: 'Village',
            title: 'Bukchon Hanok Village',
            subtitle: 'Traditional Korean village with hundreds of hanok houses.',
            mapCoords: { x: 0, y: 0, lat: 37.5826, lng: 126.9836 },
          },
          {
            id: 'seoul-myeongdong',
            time: '18:00',
            type: 'shopping',
            tag: 'Night Market',
            title: 'Myeongdong Shopping Street',
            subtitle: 'Bustling district packed with cosmetics shops and street food.',
            mapCoords: { x: 0, y: 0, lat: 37.5610, lng: 126.9860 },
          }
        ]
      },
      {
        dayNumber: 3,
        dateLabel: 'Day 3 • Sep 22',
        items: [
          {
            id: 'seoul-tower',
            time: '16:00',
            type: 'activity',
            tag: 'Landmark',
            title: 'N Seoul Tower',
            subtitle: 'Observation and communication tower located on Namsan Mountain.',
            mapCoords: { x: 0, y: 0, lat: 37.5512, lng: 126.9882 },
          },
          {
            id: 'seoul-itaewon',
            time: '20:00',
            type: 'nightlife',
            tag: 'Dining & Bars',
            title: 'Itaewon District',
            subtitle: 'Vibrant nightlife and diverse international dining scene.',
            mapCoords: { x: 0, y: 0, lat: 37.5348, lng: 126.9934 },
          }
        ]
      },
      {
        dayNumber: 4,
        dateLabel: 'Day 4 • Sep 23',
        items: [
          {
            id: 'seoul-ddp',
            time: '11:00',
            type: 'activity',
            tag: 'Architecture',
            title: 'Dongdaemun Design Plaza (DDP)',
            subtitle: 'Iconic neo-futuristic landmark designed by Zaha Hadid.',
            mapCoords: { x: 0, y: 0, lat: 37.5668, lng: 127.0096 },
          },
          {
            id: 'seoul-hongdae',
            time: '15:00',
            type: 'shopping',
            tag: 'Culture',
            title: 'Hongdae Street',
            subtitle: 'Indie arts culture, street performances, and youth fashion.',
            mapCoords: { x: 0, y: 0, lat: 37.5568, lng: 126.9237 },
          }
        ]
      }
    ]
  },
  {
    id: 'feat-paris',
    title: 'Paris Romance & Art',
    destination: 'Paris, France',
    dates: 'Dec 05 - Dec 11, 2025',
    travelersCount: 2,
    budget: 3200,
    vibes: ['moderate'] as TravelVibe[],
    costs: { activities: 900, accommodation: 1500, flights: 800, currency: 'USD', usdEstimate: 3200 },
    members: defaultMembers,
    days: [
      {
        dayNumber: 1,
        dateLabel: 'Day 1 • Dec 05',
        items: [
          {
            id: 'paris-eiffel',
            time: '16:00',
            type: 'activity',
            tag: 'Landmark',
            title: 'Eiffel Tower',
            subtitle: 'Iconic wrought-iron lattice tower on the Champ de Mars.',
            mapCoords: { x: 0, y: 0, lat: 48.8584, lng: 2.2945 },
          }
        ]
      },
      {
        dayNumber: 2,
        dateLabel: 'Day 2 • Dec 06',
        items: [
          {
            id: 'paris-louvre',
            time: '10:00',
            type: 'activity',
            tag: 'Museum',
            title: 'Louvre Museum',
            subtitle: 'World-famous art museum housing the Mona Lisa.',
            mapCoords: { x: 0, y: 0, lat: 48.8606, lng: 2.3376 },
          },
          {
            id: 'paris-seine',
            time: '18:00',
            type: 'activity',
            tag: 'Cruise',
            title: 'Seine River Cruise',
            subtitle: 'Romantic boat ride passing illuminated monuments.',
            mapCoords: { x: 0, y: 0, lat: 48.8616, lng: 2.3270 },
          }
        ]
      },
      {
        dayNumber: 3,
        dateLabel: 'Day 3 • Dec 07',
        items: [
          {
            id: 'paris-notredame',
            time: '09:30',
            type: 'culture',
            tag: 'Landmark',
            title: 'Cathédrale Notre-Dame de Paris',
            subtitle: 'Historic Catholic cathedral on the Île de la Cité.',
            mapCoords: { x: 0, y: 0, lat: 48.8529, lng: 2.3499 },
          },
          {
            id: 'paris-montmartre',
            time: '14:30',
            type: 'culture',
            tag: 'District',
            title: 'Montmartre & Sacré-Cœur',
            subtitle: 'Historic hilltop district known for its artists and basilica.',
            mapCoords: { x: 0, y: 0, lat: 48.8867, lng: 2.3431 },
          }
        ]
      },
      {
        dayNumber: 4,
        dateLabel: 'Day 4 • Dec 08',
        items: [
          {
            id: 'paris-champs',
            time: '11:00',
            type: 'shopping',
            tag: 'Avenue',
            title: 'Champs-Élysées & Arc de Triomphe',
            subtitle: 'Famous avenue leading to the massive triumphal arch.',
            mapCoords: { x: 0, y: 0, lat: 48.8738, lng: 2.2950 },
          },
          {
            id: 'paris-museedorsay',
            time: '15:00',
            type: 'activity',
            tag: 'Museum',
            title: 'Musée d\'Orsay',
            subtitle: 'Museum housed in a grand railway station showcasing Impressionist masterpieces.',
            mapCoords: { x: 0, y: 0, lat: 48.8599, lng: 2.3265 },
          }
        ]
      }
    ]
  }
];
