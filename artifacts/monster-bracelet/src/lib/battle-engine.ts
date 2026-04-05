import { getEffectiveness } from "./moves";
import type { BattleLogEntry, BattleMonster, BattleResult, MonsterMove } from "./types";

function calcDamage(attacker: BattleMonster, move: MonsterMove, defender: BattleMonster): number {
  if (move.power === 0) return 0;
  const atkStat = move.category === "special" ? attacker.spatk : attacker.atk;
  const defStat = move.category === "special" ? defender.spdef : defender.def;
  const eff = getEffectiveness(move.type, defender.types);
  if (eff === 0) return 0;
  const rand = 0.85 + Math.random() * 0.15;
  // Scale by 0.8 to avoid instant kills
  const raw = Math.floor((atkStat * move.power * 0.8) / (defStat * 10) * rand * eff);
  return Math.max(1, raw);
}

function pickBestMove(attacker: BattleMonster, defender: BattleMonster): MonsterMove | null {
  const damageMoves = attacker.moves.filter((m) => m.power > 0);
  if (!damageMoves.length) return null;
  return damageMoves.reduce((best, m) => {
    const effA = getEffectiveness(m.type, defender.types);
    const effB = getEffectiveness(best.type, defender.types);
    return m.power * effA > best.power * effB ? m : best;
  });
}

function effLabel(eff: number): string {
  if (eff === 0) return " — no effect!";
  if (eff >= 4) return " — 4x super effective!!";
  if (eff >= 2) return " — super effective!";
  if (eff <= 0.25) return " — barely effective...";
  if (eff < 1) return " — not very effective...";
  return "";
}

export function simulateBattle(player: BattleMonster, opponent: BattleMonster): BattleResult {
  const log: BattleLogEntry[] = [];
  let pHp = player.maxHp;
  let oHp = opponent.maxHp;
  let turns = 0;

  log.push({ text: `⚔  ${player.name} Lv.${player.level}  vs  ${opponent.name} Lv.${opponent.level}`, color: "info" });
  log.push({ text: `HP: ${pHp}  |  HP: ${oHp}`, color: "info" });

  while (pHp > 0 && oHp > 0 && turns < 20) {
    turns++;
    log.push({ text: `── Round ${turns} ──`, color: "info" });

    const order: Array<["player" | "opponent", BattleMonster, BattleMonster]> =
      player.spd >= opponent.spd
        ? [["player", player, opponent], ["opponent", opponent, player]]
        : [["opponent", opponent, player], ["player", player, opponent]];

    for (const [side, atk, def] of order) {
      if (pHp <= 0 || oHp <= 0) break;

      const move = pickBestMove(atk, def);
      if (!move) {
        log.push({ text: `${atk.name} has no usable moves!`, color: "miss" });
        continue;
      }

      const dmg = calcDamage(atk, move, def);
      const eff = getEffectiveness(move.type, def.types);
      const suffix = effLabel(eff);

      if (side === "player") {
        oHp = Math.max(0, oHp - dmg);
        log.push({
          text: `▶ ${atk.name} used ${move.name}! (−${dmg} HP${suffix})  [Foe: ${oHp}/${opponent.maxHp}]`,
          color: eff === 0 ? "miss" : eff >= 2 ? "super" : "hit",
        });
        if (oHp <= 0) log.push({ text: `✕  ${opponent.name} fainted!`, color: "faint" });
      } else {
        pHp = Math.max(0, pHp - dmg);
        log.push({
          text: `▶ ${atk.name} used ${move.name}! (−${dmg} HP${suffix})  [You: ${pHp}/${player.maxHp}]`,
          color: eff === 0 ? "miss" : eff >= 2 ? "resist" : "normal",
        });
        if (pHp <= 0) log.push({ text: `✕  ${player.name} fainted!`, color: "faint" });
      }
    }
  }

  const won = pHp > 0;
  log.push({
    text: won ? `🏆  ${player.name} wins the battle!` : `💀  ${player.name} was defeated...`,
    color: won ? "super" : "faint",
  });

  return { won, log, turns, playerHpLeft: pHp, opponentHpLeft: oHp };
}
