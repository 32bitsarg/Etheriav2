function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export type BotProfile = "ECONOMIST" | "MILITARIST" | "TECH_RUSHER" | "BALANCED";

export type BotProfileWeights = {
  economy: number;
  military: number;
  research: number;
  aggression: number;
};

export type BotSimulationConfig = {
  enabled: boolean;
  targetCount: number;
  tickSeconds: number;
  maxBotsPerTick: number;
  minAttackTroops: number;
  maxActiveOutgoingBattles: number;
  attackCooldownMinutes: number;
  targetCooldownMinutes: number;
  profiles: BotProfile[];
  profileWeights: Record<BotProfile, BotProfileWeights>;
};

export function getBotSimulationConfig(): BotSimulationConfig {
  const explicitEnabled = process.env.BOTS_ENABLED === "true";
  const explicitDisabled = process.env.BOTS_ENABLED === "false";
  const devDefaultEnabled = process.env.NODE_ENV !== "production" && !explicitDisabled;
  return {
    enabled: process.env.DB_PROVIDER === "postgres" && (explicitEnabled || devDefaultEnabled),
    targetCount: readNumber("BOT_TARGET_COUNT", 6),
    tickSeconds: readNumber("BOT_TICK_SECONDS", 45),
    maxBotsPerTick: readNumber("BOT_MAX_PER_TICK", 3),
    minAttackTroops: readNumber("BOT_MIN_ATTACK_TROOPS", 8),
    maxActiveOutgoingBattles: readNumber("BOT_MAX_ACTIVE_ATTACKS", 1),
    attackCooldownMinutes: readNumber("BOT_ATTACK_COOLDOWN_MINUTES", 30),
    targetCooldownMinutes: readNumber("BOT_TARGET_COOLDOWN_MINUTES", 45),
    profiles: ["ECONOMIST", "MILITARIST", "TECH_RUSHER", "BALANCED"],
    profileWeights: {
      ECONOMIST: { economy: 5, military: 1, research: 3, aggression: 0.5 },
      MILITARIST: { economy: 2, military: 5, research: 2, aggression: 3 },
      TECH_RUSHER: { economy: 2, military: 1, research: 5, aggression: 0.75 },
      BALANCED: { economy: 3, military: 3, research: 3, aggression: 1.5 },
    },
  };
}
