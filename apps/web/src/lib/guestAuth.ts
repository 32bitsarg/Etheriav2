// Guest authentication - temporary solution for rapid development
// Migrates to real auth later without changing the interface

const GUEST_ID_KEY = 'etheria_guest_id';
const CITY_ID_KEY = 'etheria_city_id';

export function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

export function getCityId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CITY_ID_KEY);
}

export function setCityId(cityId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CITY_ID_KEY, cityId);
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_ID_KEY);
  localStorage.removeItem(CITY_ID_KEY);
}

export async function ensureCity(): Promise<string> {
  const existingCityId = getCityId();
  if (existingCityId) {
    // Verify city still exists
    try {
      const res = await fetch(`/api/city/${existingCityId}`);
      if (res.ok) return existingCityId;
    } catch {
      // City gone, create new
    }
  }

  // Create new city
  const res = await fetch('/api/city/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error('Failed to create city');
  }

  const data = await res.json();
  const cityId = data.city.id;
  setCityId(cityId);
  return cityId;
}
