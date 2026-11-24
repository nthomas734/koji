import type React from 'react';

// A small line icon for the tag pill on a stop card, chosen from the tag's
// word (case-insensitive). A tag with no match draws nothing. 12px, 1.6 stroke,
// in the pill's own text colour (currentColor). Lunch and Dinner share the
// bowl on purpose: the word and the time already tell them apart.

const PATHS: Record<string, React.ReactNode> = {
  // a compass: wander
  walk: <><circle cx="8" cy="8" r="6" /><path d="M10.5 5.5 9 9.5l-4 1 1.5-4z" /></>,
  // a torii-ish gate
  gate: <path d="M1.5 3.5c4 1.2 9 1.2 13 0M3 6.5h10M4.5 4v10.5M11.5 4v10.5" />,
  // a framed picture
  frame: <><rect x="2" y="3" width="12" height="10" rx="1" /><path d="m4.5 10.5 2.5-3 2 2 1.5-1.5 1.5 2" /></>,
  flag: <path d="M4 14.5V2M4 3h8l-2 2.5L12 8H4" />,
  cam: <><path d="M2 5h2.5l1-1.5h5l1 1.5H14v8H2z" /><circle cx="8" cy="9" r="2.3" /></>,
  peak: <path d="m1.5 13 4.5-8 3 5 1.5-2.5 4 5.5z" />,
  // the sun coming up over a line
  sun: <path d="M3.5 11a4.5 4.5 0 0 1 9 0M1.5 13.5h13M8 3v1.5M3 5.5l1 1M13 5.5l-1 1" />,
  bowl: <path d="M2 8h12a6 6 0 0 1-12 0zM6 14h4M9 5.5l4.5-3M7 5.5l5-4" />,
  cup: <path d="M3 6h8v4a4 4 0 0 1-8 0zM11 7h1a2 2 0 0 1 0 4h-1M5.5 1.5v2M8.5 1.5v2" />,
  glass: <path d="M3.5 2.5h9L8 8.5zM8 8.5v5M5.5 13.5h5" />,
  bag: <path d="M3 5.5h10l-.8 8.5H3.8zM5.5 7.5v-3a2.5 2.5 0 0 1 5 0v3" />,
  moon: <path d="M13.5 9.6A5.6 5.6 0 1 1 6.4 2.5a4.4 4.4 0 0 0 7.1 7.1z" />,
  train: <><rect x="3.5" y="2" width="9" height="9.5" rx="2" /><path d="M3.5 7h9M5.5 14l1-2.5M10.5 14l-1-2.5" /></>,
  plane: <path d="M2 9l12-5-3.5 9.5L8 10zM8 10l6-6" />,
};

const BY_TAG: Record<string, keyof typeof PATHS> = {
  explore: 'walk',
  sightseeing: 'gate',
  museum: 'frame',
  tour: 'flag',
  photo: 'cam',
  hike: 'peak',
  breakfast: 'sun',
  lunch: 'bowl',
  dinner: 'bowl',
  coffee: 'cup',
  drinks: 'glass',
  shopping: 'bag',
  hotel: 'moon',
  travel: 'train',
  flight: 'plane',
};

export function tagIconKey(tag: string | null | undefined): keyof typeof PATHS | null {
  const word = (tag ?? '').trim().toLowerCase();
  return BY_TAG[word] ?? null;
}

export function TagIcon({ tag }: { tag: string | null | undefined }) {
  const key = tagIconKey(tag);
  if (!key) return null;
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}>
      {PATHS[key]}
    </svg>
  );
}
