'use client';

import { useRouter } from 'next/navigation';
import { KomaMark } from './KomaMark';

/** The way into /koma from the itineraries list. Long-press, same as everywhere. */
export function KomaHomeMark() {
  const router = useRouter();
  return <KomaMark on={false} onToggle={() => router.push('/koma')} size={22} />;
}
