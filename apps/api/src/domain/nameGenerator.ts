const PLAYER_FIRST_NAMES = [
  "Aldren",
  "Mira",
  "Torren",
  "Selene",
  "Kael",
  "Brina",
  "Darian",
  "Elara",
  "Rowan",
  "Lyra",
  "Cedric",
  "Nadia",
  "Galen",
  "Iris",
  "Leoric",
  "Seren",
  "Tomas",
  "Vera",
  "Orin",
  "Maia",
];

const PLAYER_LAST_NAMES = [
  "Valen",
  "Stoneward",
  "Rivers",
  "Ashford",
  "Blackwell",
  "Storme",
  "Greymark",
  "Fairwind",
  "Oakheart",
  "Duskfall",
  "Brightmere",
  "Ironvale",
  "Westford",
  "Marwood",
  "Highmere",
  "Rook",
];

const CITY_PREFIXES = [
  "High",
  "Stone",
  "Green",
  "Silver",
  "Oak",
  "River",
  "Iron",
  "Bright",
  "North",
  "West",
  "Gold",
  "Red",
  "White",
  "Storm",
  "Sun",
  "Moon",
];

const CITY_SUFFIXES = [
  "hold",
  "watch",
  "ford",
  "mere",
  "haven",
  "fall",
  "field",
  "crest",
  "brook",
  "keep",
  "vale",
  "gate",
  "reach",
  "wick",
  "mark",
  "port",
];

function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function generatePlayerName(seed: string = crypto.randomUUID()) {
  const hash = hashSeed(seed);
  return `${pick(PLAYER_FIRST_NAMES, hash)} ${pick(PLAYER_LAST_NAMES, Math.floor(hash / 17))}`;
}

export function generateCityName(seed: string = crypto.randomUUID()) {
  const hash = hashSeed(seed);
  return `${pick(CITY_PREFIXES, hash)}${pick(CITY_SUFFIXES, Math.floor(hash / 31))}`;
}
