import { createClient } from 'matecitodb';

const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
const anonKey = process.env.NEXT_PUBLIC_MATECITO_ANON_KEY!;

export const db = createClient({ url, apiKey: anonKey, apiVersion: 'v2' });

export const COLLECTIONS = {
  CITIES: 'cities',
  BUILDINGS: 'buildings',
  UNIT_CONFIGS: 'unit_configs',
} as const;
