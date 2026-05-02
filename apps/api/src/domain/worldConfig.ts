import { LOCAL_WORLD_CONFIG, type WorldConfigDoc, type WorldSpawnConfig } from './worldConfigData.js';

export type { WorldSpawnConfig };

export async function getWorldConfig(): Promise<WorldConfigDoc> {
  return LOCAL_WORLD_CONFIG;
}
