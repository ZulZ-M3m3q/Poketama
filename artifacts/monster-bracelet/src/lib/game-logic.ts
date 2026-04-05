import type { MonsterInstance, Pokemon } from "@workspace/api-client-react/src/generated/api.schemas";
import { getMovesForTypes, MOVES_BY_ID } from "./moves";
import type { BattleMonster, ExtendedMonster, MonsterMove } from "./types";

// ─── Cooldowns ──────────────────────────────────────────────────────────────

export function calculateCooldownRemaining(timestamp: number | null): number {
  if (!timestamp) return 0;
  const now = Date.now();
  if (now >= timestamp) return 0;
  return Math.ceil((timestamp - now) / 1000);
}

// ─── Evolution ──────────────────────────────────────────────────────────────

export function checkEvolutionReady(instance: MonsterInstance, pokemon: Pokemon): boolean {
  if (!pokemon.possible_evolutions || pokemon.possible_evolutions.length === 0) return false;
  // Branching evolutions (e.g. Eevee) have a short chain — treat them as base→final
  if (pokemon.evolution_chain.length === 1) return instance.level >= 20;
  if (pokemon.evolution_chain.length === 2) return instance.level >= 20;
  if (pokemon.evolution_chain.length === 3) {
    if (instance.stage === "base") return instance.level >= 20;
    if (instance.stage === "mid") return instance.level >= 40;
  }
  return false;
}

export function checkMegaReady(instance: MonsterInstance, pokemon: Pokemon): boolean {
  if (!pokemon.hasMega) return false;
  if (instance.stage !== "final") return false;
  if (!instance.evolutionTimer) return false;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (now - instance.evolutionTimer < ONE_DAY_MS) return false;
  if (pokemon.evolution_chain.length === 2) return instance.level >= 30;
  if (pokemon.evolution_chain.length === 3) return instance.level >= 50;
  return instance.level >= 15;
}

export function timeUntilMega(evolutionTimer: number | null): string | null {
  if (!evolutionTimer) return null;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const readyAt = evolutionTimer + ONE_DAY_MS;
  if (now >= readyAt) return null;
  const diff = readyAt - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export function getTypeColorClass(type: string): string {
  return `type-badge-${type.toLowerCase()}`;
}

// ─── Moves ───────────────────────────────────────────────────────────────────

export function getLearnableMoves(monster: ExtendedMonster, pokemon: Pokemon, count = 3): MonsterMove[] {
  const knownIds = (monster.moves ?? []).map((m) => m.id);
  return getMovesForTypes(pokemon.types, count, knownIds);
}

export function getStarterMoves(pokemon: Pokemon): MonsterMove[] {
  return getMovesForTypes(pokemon.types, 2);
}

// ─── Training opponent ───────────────────────────────────────────────────────

export function getTrainingOpponent(
  monster: ExtendedMonster,
  allPokemon: Pokemon[]
): { pokemon: Pokemon; moves: MonsterMove[] } {
  const playerTotal =
    monster.stats.hp + monster.stats.atk + monster.stats.def +
    monster.stats.spatk + monster.stats.spdef + monster.stats.spd;

  const withStats = allPokemon.map((p) => {
    const bs = p.base_stats;
    const total = bs.hp + bs.atk + bs.def + bs.spatk + bs.spdef + bs.spd;
    return { pokemon: p, baseTotals: total };
  });

  // Filter to Pokémon within ±50% total base stats
  const range = playerTotal * 0.5;
  const candidates = withStats.filter(
    (w) => Math.abs(w.baseTotals - playerTotal / (monster.level * 0.3 + 1)) <= range
  );

  const pool = candidates.length >= 3 ? candidates : withStats;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const moves = getMovesForTypes(chosen.pokemon.types, Math.min(4, Math.max(2, Math.floor(monster.level / 10) + 1)));

  return { pokemon: chosen.pokemon, moves };
}

// ─── Battle monster builders ─────────────────────────────────────────────────

export function monsterToBattleMonster(monster: ExtendedMonster, pokemon: Pokemon): BattleMonster {
  const moves = monster.moves && monster.moves.length > 0
    ? monster.moves
    : getMovesForTypes(pokemon.types, 2);

  return {
    name: pokemon.name,
    sprite: pokemon.sprite_url,
    level: monster.level,
    maxHp: monster.stats.hp,
    atk: monster.stats.atk,
    def: monster.stats.def,
    spatk: monster.stats.spatk,
    spdef: monster.stats.spdef,
    spd: monster.stats.spd,
    moves,
    types: pokemon.types,
  };
}

export function pokemonToBattleMonster(
  pokemon: Pokemon,
  moves: MonsterMove[],
  level: number
): BattleMonster {
  const bs = pokemon.base_stats;
  const scale = 1 + level * 0.05;
  return {
    name: pokemon.name,
    sprite: pokemon.sprite_url,
    level,
    maxHp: Math.floor(bs.hp * scale),
    atk: Math.floor(bs.atk * scale),
    def: Math.floor(bs.def * scale),
    spatk: Math.floor(bs.spatk * scale),
    spdef: Math.floor(bs.spdef * scale),
    spd: Math.floor(bs.spd * scale),
    moves,
    types: pokemon.types,
  };
}

// ─── Battle code (PvP) ───────────────────────────────────────────────────────

interface BattleCodeData {
  n: string;
  id: number;
  lv: number;
  st: [number, number, number, number, number, number];
  mv: string[];
  ty: string[];
  sp: string;
}

export function generateBattleCode(monster: ExtendedMonster, pokemon: Pokemon): string {
  const data: BattleCodeData = {
    n: pokemon.name,
    id: monster.pokedexId,
    lv: monster.level,
    st: [
      monster.stats.hp, monster.stats.atk, monster.stats.def,
      monster.stats.spatk, monster.stats.spdef, monster.stats.spd,
    ],
    mv: (monster.moves ?? []).map((m) => m.id),
    ty: pokemon.types,
    sp: pokemon.sprite_url,
  };
  return btoa(JSON.stringify(data));
}

export function parseBattleCode(code: string): BattleMonster | null {
  try {
    const data: BattleCodeData = JSON.parse(atob(code.trim()));
    if (!data.n || !Array.isArray(data.st) || data.st.length !== 6) return null;
    const moves: MonsterMove[] = data.mv
      .map((id) => MOVES_BY_ID[id])
      .filter(Boolean);
    // If no moves decoded (older code), give type-based defaults
    const finalMoves = moves.length > 0 ? moves : getMovesForTypes(data.ty ?? ["normal"], 2);
    return {
      name: data.n,
      sprite: data.sp ?? "",
      level: data.lv ?? 1,
      maxHp: data.st[0],
      atk: data.st[1],
      def: data.st[2],
      spatk: data.st[3],
      spdef: data.st[4],
      spd: data.st[5],
      moves: finalMoves,
      types: data.ty ?? ["normal"],
    };
  } catch {
    return null;
  }
}
