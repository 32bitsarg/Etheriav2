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
