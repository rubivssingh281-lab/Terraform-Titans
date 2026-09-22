import { QuickPhrase, RecentPhrase } from './types';

export const INITIAL_RECENT_PHRASES: RecentPhrase[] = [
  {
    id: '1',
    text: '"I need some water please"',
    mode: 'Blink',
    timestamp: '2 mins ago',
  },
  {
    id: '2',
    text: '"Hello, how are you today?"',
    mode: 'Sign',
    timestamp: '1 hr ago',
  },
  {
    id: '3',
    text: '"Please turn on the light"',
    mode: 'Morse',
    timestamp: '3 hrs ago',
  },
  {
    id: '4',
    text: '"Thank you for your assistance"',
    mode: 'TTS',
    timestamp: '5 hrs ago',
  },
];

export const QUICK_MORSE_PHRASES: QuickPhrase[] = [
  { id: 'm1', label: 'Yes', morse: '— · — —' },
  { id: 'm2', label: 'No', morse: '— ·' },
  { id: 'm3', label: 'Help', morse: '· · · ·   ·   · — · ·   · — — ·' },
  { id: 'm4', label: 'Water', morse: '· — —   · —   — ·   ·   · — ·' },
  { id: 'm5', label: 'Thank You', morse: '—   · · · ·   · —   — ·   — · —' },
  { id: 'm6', label: 'Emergency', morse: '·   — —   · — ·   — — .   .   — .   — . . .' },
];

export const TTS_PHRASE_CATEGORIES = [
  {
    category: 'Urgent Needs',
    phrases: [
      'I need my medicine immediately.',
      'I am feeling pain, please help.',
      'Please call my nurse or family.',
      'I need water or a drink.'
    ]
  },
  {
    category: 'Daily Comfort',
    phrases: [
      'Please adjust my pillow position.',
      'Can you turn up the air conditioner?',
      'Please dim the room lighting.',
      'I would like to rest now.'
    ]
  },
  {
    category: 'Social Conversations',
    phrases: [
      'Hello, it is great to see you today!',
      'Thank you so much for helping me.',
      'How are you doing today?',
      'Yes, that sounds good to me.'
    ]
  }
];

export const INSTITUTION_BADGES = [
  { name: 'ABESIT GHAZIABAD', subtitle: 'Technical University' },
  { name: 'DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY', subtitle: 'AKTU Lucknow' },
  { name: 'Microsoft for Startups', subtitle: 'Global Founder Program' },
  { name: 'NASSCOM FOUNDATION', subtitle: 'Tech for Good' },
  { name: 'TATA TECHNOLOGIES', subtitle: 'Engineering Innovation' },
];

// High-tech avatar images hotlinked from templates or generated placeholders
export const USER_AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCQOfi24BXD90f0WlNznBLpkvAn0TIzsm7AUjbR068Ce_V0aRRAxxDh8BcA3lqvcVp2aO_amisFFW4NO_aUBTw3pq2yllRRLlLhKPuPxUKpm07Tfe31HONJNpZOskozW1Zk-AojdEDtUP38uKwVQouOzAqGTr03xp05hqJ4OVGZZudYFcUzz3-Sas0UNjcwsQc4aa1ASCK1K30Ps0tUd6bHJrTAH2BhMt5FdunA6hdcQoX_RlsR2QTY";

export const FACIAL_MESH_BG_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCE727MmFodrw9J1-ruYhjZEe1ugiCqLjNbrzvpp1qo1FfuEhAe4_t2sKe61lxr8wqgwIZ9Q6guN8fJ33H-q5ypNCTo_P9NSry40-3imZ0uWueEY_LarXPI-QQSq1QstsLWSNIzsa3N_J-GQELPuHYCHpFXjgNoKPCWuC4lWUkcBhFA8gIDV9EmO1w-gr8nH_2MvK-Npq8gp1UGKk5s4SkZYyJHSVeJOJ4NDFkSZy4BjiSIzBiPPyEo";

export const BLINK_CAMERA_FEED_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDRQlyipRWCYHVAE9u224ILn8CF6zZzxCtPl2EUab_svrj02TwEpXc11Qto7DSP13_soBq6S7zLXADJbP-pr5uvbRShikzeUoUf8dKyZwGqJYkAGmilZK4KmdbFsMcPE4BhjeI4jhgExkIg2y9SYsijhP4G0SZ2UFfcWlpTtdTujK1W_dCgGQhdEBi6CU0LnXhBSPqPATQh52Eps3VSLNZudzLwmHifRSEie-Td7dNvtsY7cCi_RqCN";

export const SIGN_CAMERA_FEED_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCK6Dob8wx9H9TNbif5CJf8iV_lUP6WL7dCjQTgw3yKLNhigP3l7mqYFsvTyULwILQJnaP1luDGvQgbkC96ODFPLslIvgSgbDuW5npFl0YzKw5yVfEdN7P22s4RIe5N1L87p_unonHj9_pp1C3H7zkv8uxji86scToln89ezkuOTIulFrQYLfl2vEnd_t2ScwksUyclSFH_sS7tu2B17ZYYqYzZBGqb8l1cRpKWmhwmhigqOcE8zroj";
