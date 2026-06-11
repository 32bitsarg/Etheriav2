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

// Detecta nombres "Nombre Apellido" generados con las listas viejas, para
// poder migrar bots existentes al nuevo formato de nick.
export function isLegacyGeneratedName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  return PLAYER_FIRST_NAMES.includes(parts[0]) && PLAYER_LAST_NAMES.includes(parts[1]);
}

// ─── Usernames de bots: nicks creíbles de jugador, no "Nombre Apellido" ───

const BOT_NICK_BASES = [
  "facu", "tute", "rama", "nico", "santi", "guille", "lucho", "colo",
  "negro", "tano", "pipa", "chino", "ruso", "mono", "pela", "tomi",
  "agus", "juanma", "fer", "maxi", "leo", "gonza", "dieguito", "seba",
  "matute", "kevo", "brian", "lauti", "thiago", "bauti", "valen", "iván",
  "shadow", "dark", "ghost", "wolf", "drako", "rex", "zeta", "kratos",
  "viking", "spartan", "ronin", "saske", "itachi", "goku", "messi10",
];

const BOT_NICK_SUFFIXES = [
  "", "", "", "_ok", "uy", "ito", "azo", "_arg", "_uy", "cba", "lp",
];

function botNickDigits(hash: number) {
  const styles = [
    () => "",
    () => "",
    () => String(1980 + (hash % 30)),
    () => String((hash % 90) + 10),
    () => String(hash % 10),
    () => "_" + String((hash % 90) + 10),
  ];
  return styles[hash % styles.length]();
}

export function generateBotUsername(seed: string = crypto.randomUUID()) {
  const hash = hashSeed(seed);
  const base = pick(BOT_NICK_BASES, hash);
  const suffix = pick(BOT_NICK_SUFFIXES, Math.floor(hash / 13));
  const digits = botNickDigits(Math.floor(hash / 7));
  let nick = `${base}${suffix}${digits}`;
  // Algunos con mayúscula inicial o un separador, como escribe la gente
  if (hash % 5 === 0) nick = nick.charAt(0).toUpperCase() + nick.slice(1);
  if (hash % 11 === 0 && !nick.includes("_")) nick = nick.replace(/(\d)/, "_$1");
  return nick;
}
