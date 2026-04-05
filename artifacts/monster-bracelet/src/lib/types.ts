import type { MonsterInstance } from "@workspace/api-client-react/src/generated/api.schemas";

export interface MonsterMove {
  id: string;
  name: string;
  type: string;
  power: number;
  category: "physical" | "special" | "status";
  accuracy: number;
  description: string;
}

export type ExtendedMonster = MonsterInstance & {
  moves?: MonsterMove[];
  wins?: number;
  losses?: number;
};

export interface BattleMonster {
  name: string;
  sprite: string;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  spatk: number;
  spdef: number;
  spd: number;
  moves: MonsterMove[];
  types: string[];
}

export type BattleLogColor = "normal" | "hit" | "super" | "resist" | "miss" | "faint" | "info";

export interface BattleLogEntry {
  text: string;
  color: BattleLogColor;
}

export interface BattleResult {
  won: boolean;
  log: BattleLogEntry[];
  turns: number;
  playerHpLeft: number;
  opponentHpLeft: number;
}
