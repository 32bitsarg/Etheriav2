export type SocialConfig = {
  chatMessageMaxLength: number;
  chatRateLimitWindowMs: number;
  chatBootstrapMessageLimit: number;
  defaultAllianceName: string;
  defaultAllianceTag: string;
};

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readString(name: string, fallback: string) {
  const value = String(process.env[name] ?? fallback).trim();
  return value.length > 0 ? value : fallback;
}

export function getSocialConfig(): SocialConfig {
  return {
    chatMessageMaxLength: readNumber("CHAT_MESSAGE_MAX_LENGTH", 280),
    chatRateLimitWindowMs: readNumber("CHAT_RATE_LIMIT_WINDOW_MS", 8_000),
    chatBootstrapMessageLimit: readNumber("CHAT_BOOTSTRAP_MESSAGE_LIMIT", 50),
    defaultAllianceName: readString("DEFAULT_ALLIANCE_NAME", "Guardianes de Etheria"),
    defaultAllianceTag: readString("DEFAULT_ALLIANCE_TAG", "GDE"),
  };
}
