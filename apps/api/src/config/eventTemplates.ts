import { BudgetTier } from '@prisma/client';

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  category: string;
  suggestedDuration: number; // in minutes
  suggestedBudgetTier: BudgetTier;
  estimatedCostRange: {
    min: number;
    max: number;
  };
  suggestedActivities: string[];
  venueTypes: string[];
  planningTips: string[];
  icon: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  // Social Events
  {
    id: 'birthday-party',
    name: 'Birthday Party',
    description: 'Celebrate a special birthday with friends and family',
    eventType: 'birthday',
    category: 'social',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 100, max: 500 },
    suggestedActivities: ['Cake cutting', 'Games', 'Gift opening', 'Photo booth'],
    venueTypes: ['restaurant', 'bar', 'event_venue', 'park'],
    planningTips: [
      'Send invitations 2-3 weeks in advance',
      'Consider dietary restrictions when ordering cake',
      'Plan activities to keep guests engaged',
      'Designate someone for photos',
    ],
    icon: '🎂',
  },
  {
    id: 'dinner-party',
    name: 'Dinner Party',
    description: 'Host an intimate dinner gathering',
    eventType: 'dinner',
    category: 'social',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 50, max: 300 },
    suggestedActivities: ['Appetizers', 'Main course', 'Dessert', 'Conversation games'],
    venueTypes: ['restaurant', 'home'],
    planningTips: [
      'Plan menu around seasonal ingredients',
      'Ask about dietary restrictions beforehand',
      'Prepare as much as possible in advance',
      'Set the table the night before',
    ],
    icon: '🍽️',
  },
  {
    id: 'game-night',
    name: 'Game Night',
    description: 'Fun evening of board games and friendly competition',
    eventType: 'game-night',
    category: 'social',
    suggestedDuration: 240,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 20, max: 100 },
    suggestedActivities: ['Board games', 'Card games', 'Video games', 'Trivia'],
    venueTypes: ['home', 'bar', 'cafe'],
    planningTips: [
      'Have a variety of games for different group sizes',
      'Prepare snacks and drinks',
      'Start with an easy game to warm up',
      'Have prizes for winners',
    ],
    icon: '🎲',
  },
  {
    id: 'movie-night',
    name: 'Movie Night',
    description: 'Cozy movie watching experience',
    eventType: 'movie-night',
    category: 'social',
    suggestedDuration: 180,
    suggestedBudgetTier: 'FREE',
    estimatedCostRange: { min: 0, max: 50 },
    suggestedActivities: ['Movie viewing', 'Popcorn bar', 'Movie discussion'],
    venueTypes: ['home', 'movie_theater'],
    planningTips: [
      'Create a poll for movie selection',
      'Set up comfortable seating',
      'Prepare movie snacks',
      'Dim the lights for atmosphere',
    ],
    icon: '🎬',
  },
  {
    id: 'brunch',
    name: 'Brunch Gathering',
    description: 'Relaxed late morning meal with friends',
    eventType: 'brunch',
    category: 'social',
    suggestedDuration: 120,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 30, max: 150 },
    suggestedActivities: ['Brunch dishes', 'Mimosas', 'Coffee tasting', 'Conversation'],
    venueTypes: ['restaurant', 'cafe', 'home'],
    planningTips: [
      'Make reservations for popular spots',
      'Consider hosting a potluck brunch',
      'Have coffee options ready',
      'Plan for late arrivals',
    ],
    icon: '🥞',
  },

  // Outdoor Events
  {
    id: 'picnic',
    name: 'Picnic in the Park',
    description: 'Outdoor gathering with food and fun',
    eventType: 'picnic',
    category: 'outdoor',
    suggestedDuration: 180,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 30, max: 100 },
    suggestedActivities: ['Picnic lunch', 'Frisbee', 'Lawn games', 'Nature walk'],
    venueTypes: ['park'],
    planningTips: [
      'Check weather forecast',
      'Bring blankets and portable chairs',
      'Pack bug spray and sunscreen',
      'Bring trash bags for cleanup',
    ],
    icon: '🧺',
  },
  {
    id: 'hiking',
    name: 'Group Hike',
    description: 'Outdoor adventure and exercise with friends',
    eventType: 'hiking',
    category: 'outdoor',
    suggestedDuration: 240,
    suggestedBudgetTier: 'FREE',
    estimatedCostRange: { min: 0, max: 30 },
    suggestedActivities: ['Hiking', 'Photography', 'Bird watching', 'Picnic lunch'],
    venueTypes: ['park', 'natural_feature'],
    planningTips: [
      'Choose a trail appropriate for all fitness levels',
      'Share the trail info beforehand',
      'Bring plenty of water',
      'Have a backup indoor plan',
    ],
    icon: '🥾',
  },
  {
    id: 'beach-day',
    name: 'Beach Day',
    description: 'Fun day at the beach with friends',
    eventType: 'beach',
    category: 'outdoor',
    suggestedDuration: 300,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 20, max: 100 },
    suggestedActivities: ['Swimming', 'Beach volleyball', 'Sandcastle building', 'Sunset watching'],
    venueTypes: ['natural_feature'],
    planningTips: [
      'Bring plenty of sunscreen',
      'Pack a cooler with drinks',
      'Bring beach games and floaties',
      'Designate a meeting spot',
    ],
    icon: '🏖️',
  },

  // Celebrations
  {
    id: 'anniversary',
    name: 'Anniversary Celebration',
    description: 'Celebrate a special milestone',
    eventType: 'anniversary',
    category: 'celebration',
    suggestedDuration: 180,
    suggestedBudgetTier: 'PREMIUM',
    estimatedCostRange: { min: 200, max: 1000 },
    suggestedActivities: ['Special dinner', 'Toast', 'Memory sharing', 'Dancing'],
    venueTypes: ['restaurant', 'event_venue', 'rooftop_bar'],
    planningTips: [
      'Make reservations well in advance',
      'Plan a meaningful gift or gesture',
      'Create a playlist of special songs',
      'Consider hiring a photographer',
    ],
    icon: '💑',
  },
  {
    id: 'graduation',
    name: 'Graduation Party',
    description: 'Celebrate academic achievement',
    eventType: 'graduation',
    category: 'celebration',
    suggestedDuration: 240,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 150, max: 500 },
    suggestedActivities: ['Ceremony viewing', 'Photo session', 'Speeches', 'Catered meal'],
    venueTypes: ['restaurant', 'event_venue', 'home'],
    planningTips: [
      'Coordinate with other families if hosting jointly',
      'Create a photo display of achievements',
      'Have a guest book for messages',
      'Plan entertainment for all ages',
    ],
    icon: '🎓',
  },
  {
    id: 'baby-shower',
    name: 'Baby Shower',
    description: 'Celebrate upcoming arrival',
    eventType: 'baby-shower',
    category: 'celebration',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 100, max: 400 },
    suggestedActivities: ['Games', 'Gift opening', 'Advice sharing', 'Light refreshments'],
    venueTypes: ['restaurant', 'home', 'event_venue'],
    planningTips: [
      'Coordinate with the registry',
      'Plan interactive games',
      'Consider dietary restrictions for mom-to-be',
      'Designate gift recorder',
    ],
    icon: '👶',
  },
  {
    id: 'housewarming',
    name: 'Housewarming Party',
    description: 'Welcome guests to a new home',
    eventType: 'housewarming',
    category: 'celebration',
    suggestedDuration: 180,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 50, max: 200 },
    suggestedActivities: ['House tour', 'Appetizers', 'Drinks', 'Outdoor games'],
    venueTypes: ['home'],
    planningTips: [
      'Clean and organize before guests arrive',
      'Create a simple menu',
      'Set up a coat/bag area',
      'Have paper goods for easy cleanup',
    ],
    icon: '🏠',
  },

  // Professional Events
  {
    id: 'networking',
    name: 'Networking Event',
    description: 'Professional networking opportunity',
    eventType: 'networking',
    category: 'professional',
    suggestedDuration: 120,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 0, max: 100 },
    suggestedActivities: ['Introductions', 'Speed networking', 'Industry discussion', 'Business card exchange'],
    venueTypes: ['bar', 'restaurant', 'cafe', 'coworking_space'],
    planningTips: [
      'Prepare your elevator pitch',
      'Bring plenty of business cards',
      'Set goals for connections to make',
      'Follow up within 24 hours',
    ],
    icon: '🤝',
  },
  {
    id: 'team-building',
    name: 'Team Building Activity',
    description: 'Strengthen team bonds outside the office',
    eventType: 'team-building',
    category: 'professional',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 100, max: 500 },
    suggestedActivities: ['Escape room', 'Cooking class', 'Sports activity', 'Volunteer work'],
    venueTypes: ['amusement_park', 'bowling_alley', 'restaurant', 'park'],
    planningTips: [
      'Choose activities inclusive of all abilities',
      'Mix up usual team groupings',
      'Include icebreakers',
      'Get feedback afterward',
    ],
    icon: '👥',
  },

  // Fitness & Wellness
  {
    id: 'fitness-class',
    name: 'Group Fitness Class',
    description: 'Exercise together with friends',
    eventType: 'fitness',
    category: 'wellness',
    suggestedDuration: 90,
    suggestedBudgetTier: 'BUDGET',
    estimatedCostRange: { min: 15, max: 50 },
    suggestedActivities: ['Yoga', 'Spinning', 'HIIT', 'Pilates'],
    venueTypes: ['gym', 'yoga_studio', 'park'],
    planningTips: [
      'Book class in advance',
      'Remind everyone what to bring',
      'Plan post-workout refreshments',
      'Choose beginner-friendly options',
    ],
    icon: '💪',
  },
  {
    id: 'spa-day',
    name: 'Spa Day',
    description: 'Relaxation and self-care with friends',
    eventType: 'spa',
    category: 'wellness',
    suggestedDuration: 240,
    suggestedBudgetTier: 'PREMIUM',
    estimatedCostRange: { min: 100, max: 400 },
    suggestedActivities: ['Massage', 'Facial', 'Sauna', 'Meditation'],
    venueTypes: ['spa', 'health'],
    planningTips: [
      'Book appointments early',
      'Confirm any health restrictions',
      'Arrive early to enjoy amenities',
      'Plan a light meal afterward',
    ],
    icon: '🧘',
  },

  // Entertainment
  {
    id: 'concert',
    name: 'Concert Outing',
    description: 'Live music experience with friends',
    eventType: 'concert',
    category: 'entertainment',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 50, max: 300 },
    suggestedActivities: ['Pre-show dinner', 'Concert', 'Post-show drinks'],
    venueTypes: ['night_club', 'stadium', 'bar'],
    planningTips: [
      'Buy tickets early for best seats',
      'Plan transportation/parking',
      'Set a meeting point',
      'Check venue bag policy',
    ],
    icon: '🎵',
  },
  {
    id: 'sports-game',
    name: 'Sports Game',
    description: 'Watch a live sporting event',
    eventType: 'sports',
    category: 'entertainment',
    suggestedDuration: 180,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 40, max: 250 },
    suggestedActivities: ['Tailgating', 'Game watching', 'Stadium food', 'Team gear'],
    venueTypes: ['stadium'],
    planningTips: [
      'Buy tickets from official sources',
      'Plan for traffic and parking',
      'Bring cash for vendors',
      'Check weather for outdoor games',
    ],
    icon: '⚽',
  },

  // Holidays
  {
    id: 'holiday-party',
    name: 'Holiday Party',
    description: 'Seasonal celebration with loved ones',
    eventType: 'holiday',
    category: 'holiday',
    suggestedDuration: 240,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 100, max: 400 },
    suggestedActivities: ['Gift exchange', 'Holiday meal', 'Games', 'Caroling'],
    venueTypes: ['home', 'restaurant', 'event_venue'],
    planningTips: [
      'Send invitations 3-4 weeks early',
      'Plan for dietary restrictions',
      'Set gift exchange rules if applicable',
      'Decorate to set the mood',
    ],
    icon: '🎄',
  },
  {
    id: 'new-years',
    name: 'New Year\'s Eve Party',
    description: 'Ring in the new year together',
    eventType: 'new-years',
    category: 'holiday',
    suggestedDuration: 300,
    suggestedBudgetTier: 'MODERATE',
    estimatedCostRange: { min: 100, max: 500 },
    suggestedActivities: ['Countdown', 'Champagne toast', 'Dancing', 'Resolutions sharing'],
    venueTypes: ['home', 'bar', 'restaurant', 'event_venue'],
    planningTips: [
      'Stock up on champagne',
      'Plan transportation or offer rooms',
      'Have noise makers ready',
      'Create a midnight playlist',
    ],
    icon: '🎆',
  },
];

/**
 * Get all event templates
 */
export function getEventTemplates(): EventTemplate[] {
  return EVENT_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): EventTemplate[] {
  return EVENT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all unique categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(EVENT_TEMPLATES.map((t) => t.category))];
}
