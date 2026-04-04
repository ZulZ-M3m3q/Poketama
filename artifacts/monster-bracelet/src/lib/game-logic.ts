import type { MonsterInstance, Pokemon, SaveData } from "@workspace/api-client-react/src/generated/api.schemas";

export function getTypeColorClass(type: string): string {
  const t = type.toLowerCase();
  return `type-badge-${t}`;
}

export function calculateCooldownRemaining(timestamp: number | null): number {
  if (!timestamp) return 0;
  const now = Date.now();
  if (now >= timestamp) return 0;
  return Math.ceil((timestamp - now) / 1000);
}

export function checkEvolutionReady(
  instance: MonsterInstance,
  pokemon: Pokemon
): boolean {
  if (!pokemon.possible_evolutions || pokemon.possible_evolutions.length === 0) {
    return false;
  }

  // 1-stage chain (length 2)
  if (pokemon.evolution_chain.length === 2) {
    return instance.level >= 20;
  }

  // 2-stage chain (length 3)
  if (pokemon.evolution_chain.length === 3) {
    if (instance.stage === "base") return instance.level >= 20;
    if (instance.stage === "mid") return instance.level >= 40;
  }

  return false;
}

export function checkMegaReady(
  instance: MonsterInstance,
  pokemon: Pokemon
): boolean {
  if (!pokemon.hasMega) return false;
  if (instance.stage !== "final") return false;
  if (!instance.evolutionTimer) return false;

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (now - instance.evolutionTimer < ONE_DAY_MS) return false;

  if (pokemon.evolution_chain.length === 2) {
    return instance.level >= 30;
  } else if (pokemon.evolution_chain.length === 3) {
    return instance.level >= 50;
  } else {
    return instance.level >= 15;
  }
}

export function timeUntilMega(evolutionTimer: number | null): string | null {
  if (!evolutionTimer) return null;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const readyAt = evolutionTimer + ONE_DAY_MS;
  
  if (now >= readyAt) return null; // Ready
  
  const diff = readyAt - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
