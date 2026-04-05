import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  useGetSaveData,
  useUpdateSaveData,
  useListPokemon,
  getGetSaveDataQueryKey,
} from "@workspace/api-client-react";
import type {
  MonsterInstance,
  Pokemon,
  SaveData,
} from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import {
  checkEvolutionReady,
  checkMegaReady,
  calculateCooldownRemaining,
  timeUntilMega,
  getLearnableMoves,
  getTrainingOpponent,
  monsterToBattleMonster,
  pokemonToBattleMonster,
} from "@/lib/game-logic";
import { simulateBattle } from "@/lib/battle-engine";
import type {
  ExtendedMonster,
  BattleMonster,
  BattleLogEntry,
  BattleResult,
  MonsterMove,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Swords, Apple, Zap, ArrowUpCircle, X, ChevronRight,
  Shield, Star, Trophy, Skull,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Small UI components ───────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  fire: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  water: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  grass: "bg-green-500/20 text-green-300 border-green-500/30",
  electric: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  psychic: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  ghost: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  dragon: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  dark: "bg-gray-600/20 text-gray-300 border-gray-500/30",
  fairy: "bg-rose-400/20 text-rose-300 border-rose-400/30",
  ice: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
  fighting: "bg-red-600/20 text-red-300 border-red-500/30",
  poison: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  ground: "bg-amber-700/20 text-amber-300 border-amber-600/30",
  rock: "bg-stone-500/20 text-stone-300 border-stone-400/30",
  steel: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  flying: "bg-sky-400/20 text-sky-300 border-sky-400/30",
  normal: "bg-zinc-500/20 text-zinc-300 border-zinc-400/30",
  bug: "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border tracking-widest",
      TYPE_COLORS[type] ?? "bg-gray-500/20 text-gray-300 border-gray-400/30"
    )}>
      {type}
    </span>
  );
}

function StatBar({ label, value, max = 200, color = "primary" }: {
  label: string; value: number; max?: number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", {
            "bg-primary": color === "primary",
            "bg-amber-400": color === "amber",
            "bg-pink-500": color === "pink",
            "bg-blue-400": color === "blue",
            "bg-purple-400": color === "purple",
            "bg-cyan-400": color === "cyan",
          })}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

function CooldownButton({ label, icon: Icon, cooldownTs, onClick, disabled, variant = "primary" }: {
  label: string; icon: React.ElementType; cooldownTs: number | null | undefined;
  onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "amber";
}) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!cooldownTs) { setRemaining(0); return; }
    const tick = () => setRemaining(calculateCooldownRemaining(cooldownTs));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownTs]);
  const isOnCooldown = remaining > 0;
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/50",
    secondary: "bg-card text-foreground hover:bg-white/10 border-border",
    amber: "bg-amber-500 text-black hover:bg-amber-400 border-amber-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || isOnCooldown}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden",
        styles[variant]
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="font-mono">{label}</span>
      {isOnCooldown && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <motion.div className="h-full bg-white/40" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: remaining, ease: "linear" }} />
          </div>
          <span className="absolute top-1 right-1 text-[9px] font-mono opacity-70">{remaining}s</span>
        </>
      )}
    </button>
  );
}

function MoveCard({ move, onClick, selected }: { move: MonsterMove; onClick?: () => void; selected?: boolean }) {
  const catIcon = move.category === "physical" ? "⚔" : move.category === "special" ? "✦" : "◉";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left",
        onClick
          ? selected
            ? "border-primary bg-primary/15 ring-1 ring-primary/50"
            : "border-border bg-background hover:border-primary/40 hover:bg-white/5 active:scale-95"
          : "border-border bg-background cursor-default"
      )}
    >
      <span className="text-[10px] opacity-60 font-mono w-4 shrink-0">{catIcon}</span>
      <span className="flex-1 text-xs font-medium text-foreground truncate">{move.name}</span>
      <TypeBadge type={move.type} />
      {move.power > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-1">{move.power}</span>
      )}
    </button>
  );
}

function LogLine({ entry }: { entry: BattleLogEntry }) {
  const colors: Record<BattleLogEntry["color"], string> = {
    normal: "text-muted-foreground",
    hit: "text-foreground",
    super: "text-primary font-semibold",
    resist: "text-orange-400",
    miss: "text-zinc-500 italic",
    faint: "text-red-400 font-semibold",
    info: "text-blue-400 font-mono",
  };
  return (
    <motion.p
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("text-[11px] leading-relaxed", colors[entry.color])}
    >
      {entry.text}
    </motion.p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type BattlePhase = "setup" | "fighting" | "result";

export default function Home() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: saveData, isLoading: saveLoading } = useGetSaveData({
    query: { queryKey: getGetSaveDataQueryKey() },
  });
  const { data: allPokemon } = useListPokemon();
  const updateSave = useUpdateSaveData();

  // Animations
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [evoAnim, setEvoAnim] = useState(false);
  const [feedAnim, setFeedAnim] = useState(false);

  // Evolution pickers
  const [evoPickerOpen, setEvoPickerOpen] = useState(false);
  const [megaPickerOpen, setMegaPickerOpen] = useState(false);
  const [megaOptions, setMegaOptions] = useState<Array<{ id: string; name: string; sprite_url: string }>>([]);
  const [evoOptions, setEvoOptions] = useState<number[]>([]);

  // Battle
  const [battleOpen, setBattleOpen] = useState(false);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("setup");
  const [battleOpponent, setBattleOpponent] = useState<BattleMonster | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [battleLogShown, setBattleLogShown] = useState(0);
  const [pendingMonster, setPendingMonster] = useState<ExtendedMonster | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const battleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Move learning
  const [moveLearnOpen, setMoveLearnOpen] = useState(false);
  const [moveOptions, setMoveOptions] = useState<MonsterMove[]>([]);
  const [selectedMove, setSelectedMove] = useState<MonsterMove | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const activeSlot = saveData?.activeSlot ?? 0;
  const monster = saveData?.slots?.[activeSlot] as ExtendedMonster | undefined;
  const pokemon: Pokemon | undefined = allPokemon?.find((p) => p.id === monster?.pokedexId);

  const currentSprite =
    monster?.stage === "mega" && monster.megaFormId
      ? pokemon?.megaForms?.find((m) => m.id === monster.megaFormId)?.sprite_url
      : pokemon?.sprite_url;

  const evolutionReady = monster && pokemon ? checkEvolutionReady(monster, pokemon) : false;
  const megaReady = monster && pokemon ? checkMegaReady(monster, pokemon) : false;
  const megaCountdown = monster?.evolutionTimer ? timeUntilMega(monster.evolutionTimer) : null;

  // Auto-scroll battle log
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [battleLogShown]);

  // ── Save with optimistic update ─────────────────────────────────────────────
  const saveMonster = useCallback(
    (updated: ExtendedMonster) => {
      if (!saveData) return;
      const newSlots = [...(saveData.slots ?? [])];
      newSlots[activeSlot] = updated as MonsterInstance;
      const newSave: SaveData = { ...saveData, slots: newSlots };
      // Optimistic: update cache immediately so UI reflects instantly
      queryClient.setQueryData(getGetSaveDataQueryKey(), newSave);
      updateSave.mutate({ data: newSave }, {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() });
        },
      });
    },
    [saveData, activeSlot, updateSave, queryClient]
  );

  // ── Feed ────────────────────────────────────────────────────────────────────
  const handleFeed = () => {
    if (!monster) return;
    setFeedAnim(true);
    setTimeout(() => setFeedAnim(false), 600);
    saveMonster({
      ...monster,
      hunger: Math.min(100, monster.hunger + 15),
      happiness: Math.min(100, monster.happiness + 5),
      feedCooldown: Date.now() + 8000,
      lastFed: Date.now(),
    });
  };

  // ── Training battle ─────────────────────────────────────────────────────────
  const handleTrain = () => {
    if (!monster || !pokemon || !allPokemon) return;
    const { pokemon: oppPoke, moves: oppMoves } = getTrainingOpponent(monster, allPokemon);
    const level = Math.max(1, monster.level + Math.floor(Math.random() * 6) - 2);
    const opp = pokemonToBattleMonster(oppPoke, oppMoves, level);
    setBattleOpponent(opp);
    setBattlePhase("setup");
    setBattleResult(null);
    setBattleLogShown(0);
    setBattleOpen(true);
  };

  const startBattleSim = useCallback(() => {
    if (!battleOpponent || !monster || !pokemon) return;
    const playerBM = monsterToBattleMonster(monster, pokemon);
    const result = simulateBattle(playerBM, battleOpponent);
    setBattleResult(result);
    setBattlePhase("fighting");
    setBattleLogShown(0);

    let i = 0;
    if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    battleTimerRef.current = setInterval(() => {
      i++;
      setBattleLogShown(i);
      if (i >= result.log.length) {
        clearInterval(battleTimerRef.current!);
        battleTimerRef.current = null;
        setTimeout(() => {
          setBattlePhase("result");
          if (result.won) {
            // Build leveled-up monster, don't save yet — wait for move choice
            const boost = (n: number) => Math.ceil(n * 1.05);
            const leveled: ExtendedMonster = {
              ...monster,
              level: monster.level + 1,
              stats: {
                hp: boost(monster.stats.hp),
                atk: boost(monster.stats.atk),
                def: boost(monster.stats.def),
                spatk: boost(monster.stats.spatk),
                spdef: boost(monster.stats.spdef),
                spd: boost(monster.stats.spd),
              },
              happiness: Math.min(100, monster.happiness + 8),
              hunger: Math.max(0, monster.hunger - 15),
              trainCooldown: Date.now() + 12000,
              lastTrained: Date.now(),
              wins: (monster.wins ?? 0) + 1,
            };
            setPendingMonster(leveled);
            setLevelUpAnim(true);
            setTimeout(() => setLevelUpAnim(false), 1500);
          } else {
            // Loss: small stat decrease, save immediately
            saveMonster({
              ...monster,
              hunger: Math.max(0, monster.hunger - 10),
              happiness: Math.max(0, monster.happiness - 5),
              trainCooldown: Date.now() + 12000,
              lastTrained: Date.now(),
              losses: (monster.losses ?? 0) + 1,
            });
          }
        }, 600);
      }
    }, 300);
  }, [battleOpponent, monster, pokemon, saveMonster]);

  const handleBattleClose = useCallback(() => {
    if (battleTimerRef.current) {
      clearInterval(battleTimerRef.current);
      battleTimerRef.current = null;
    }

    let openingMoveLearn = false;
    if (battleResult?.won && pendingMonster && pokemon) {
      const learnable = getLearnableMoves(pendingMonster, pokemon, 3);
      if (learnable.length > 0) {
        setMoveOptions(learnable);
        setSelectedMove(null);
        setReplaceMode(false);
        setMoveLearnOpen(true);
        openingMoveLearn = true;
      } else {
        // No new moves available — save the level-up directly
        saveMonster(pendingMonster);
      }
    }

    setBattleOpen(false);
    setBattleResult(null);
    setBattleOpponent(null);
    setBattleLogShown(0);
    setBattlePhase("setup");

    // Only clear pendingMonster if we're NOT handing it off to the move-learn modal
    if (!openingMoveLearn) {
      setPendingMonster(null);
    }
  }, [battleResult, pendingMonster, pokemon, saveMonster]);

  // ── Move learning ───────────────────────────────────────────────────────────
  const handleMovePick = (move: MonsterMove) => {
    if (!pendingMonster) return;
    const currentMoves = pendingMonster.moves ?? [];
    if (currentMoves.length < 4) {
      // Just add
      const updated: ExtendedMonster = { ...pendingMonster, moves: [...currentMoves, move] };
      saveMonster(updated);
      setPendingMonster(null);
      setMoveLearnOpen(false);
    } else {
      // Need to replace — enter replace mode
      setSelectedMove(move);
      setReplaceMode(true);
    }
  };

  const handleMoveReplace = (replaceIndex: number) => {
    if (!pendingMonster || !selectedMove) return;
    const currentMoves = [...(pendingMonster.moves ?? [])];
    currentMoves[replaceIndex] = selectedMove;
    const updated: ExtendedMonster = { ...pendingMonster, moves: currentMoves };
    saveMonster(updated);
    setPendingMonster(null);
    setSelectedMove(null);
    setReplaceMode(false);
    setMoveLearnOpen(false);
  };

  const handleMoveSkip = () => {
    if (pendingMonster) saveMonster(pendingMonster);
    setPendingMonster(null);
    setSelectedMove(null);
    setReplaceMode(false);
    setMoveLearnOpen(false);
  };

  // ── Evolution ───────────────────────────────────────────────────────────────
  const handleEvolve = () => {
    if (!monster || !pokemon) return;
    if (pokemon.possible_evolutions.length > 1) {
      setEvoOptions(pokemon.possible_evolutions);
      setEvoPickerOpen(true);
    } else if (pokemon.possible_evolutions.length === 1) {
      doEvolve(pokemon.possible_evolutions[0]);
    }
  };

  const doEvolve = (targetId: number) => {
    if (!monster) return;
    const targetPokemon = allPokemon?.find((p) => p.id === targetId);
    if (!targetPokemon) return;
    setEvoAnim(true);
    setTimeout(() => setEvoAnim(false), 2000);
    saveMonster({
      ...monster,
      pokedexId: targetId,
      stage: targetPokemon.evolution_stage as MonsterInstance["stage"],
      evolutionTimer: targetPokemon.evolution_stage === "final" ? Date.now() : null,
      megaFormId: null,
    });
    setEvoPickerOpen(false);
  };

  const handleMega = () => {
    if (!monster || !pokemon) return;
    if ((pokemon.megaForms?.length ?? 0) > 1) {
      setMegaOptions(pokemon.megaForms ?? []);
      setMegaPickerOpen(true);
    } else if ((pokemon.megaForms?.length ?? 0) === 1) {
      doMega(pokemon.megaForms![0].id);
    }
  };

  const doMega = (formId: string) => {
    if (!monster) return;
    setEvoAnim(true);
    setTimeout(() => setEvoAnim(false), 2500);
    saveMonster({ ...monster, stage: "mega", megaFormId: formId });
    setMegaPickerOpen(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (saveLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!monster || !pokemon) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="w-32 h-32 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <span className="text-5xl opacity-30">?</span>
        </motion.div>
        <div>
          <h2 className="text-foreground font-bold text-lg mb-1">No Monster Yet</h2>
          <p className="text-muted-foreground text-sm">Scan an NFC code to hatch your first companion</p>
        </div>
        <button
          onClick={() => setLocation("/nfc")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 active:scale-95 transition-all"
        >
          Go to NFC Scanner
        </button>
      </div>
    );
  }

  const currentMoves: MonsterMove[] = monster.moves ?? [];

  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Overlays */}
      <AnimatePresence>
        {evoAnim && (
          <motion.div className="absolute inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0.3, 0.7, 0] }} exit={{ opacity: 0 }}
            transition={{ duration: 2, times: [0, 0.2, 0.4, 0.6, 1] }}>
            <div className="absolute inset-0 bg-primary/30 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {levelUpAnim && (
          <motion.div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: [0.5, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5 }}
              className="text-4xl font-bold text-primary drop-shadow-[0_0_20px_rgba(33,214,142,0.9)] font-mono"
            >
              LEVEL UP!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground font-bold text-xl tracking-tight">{pokemon.name}</h1>
          <div className="flex gap-1 mt-1">
            {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "text-xs font-mono uppercase px-2 py-0.5 rounded-lg border",
            monster.stage === "mega" ? "bg-primary/20 text-primary border-primary/50"
              : monster.stage === "final" ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
              : monster.stage === "mid" ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
              : "bg-card text-muted-foreground border-border"
          )}>
            {monster.stage === "mega"
              ? monster.megaFormId?.split("-").slice(1).map((s) => s[0].toUpperCase() + s.slice(1)).join(" ") ?? "MEGA"
              : monster.stage.toUpperCase()}
          </div>
          <div className="text-muted-foreground text-xs font-mono mt-1">
            #{String(pokemon.id).padStart(3, "0")}
          </div>
        </div>
      </div>

      {/* Sprite */}
      <div className="relative flex items-center justify-center">
        <div className={cn(
          "relative w-48 h-48 rounded-full flex items-center justify-center",
          monster.stage === "mega"
            ? "bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/20"
            : "bg-gradient-to-br from-card via-card/80 to-transparent"
        )}>
          {monster.stage === "mega" && (
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
          )}
          <AnimatePresence mode="wait">
            <motion.img key={currentSprite} src={currentSprite} alt={pokemon.name}
              className={cn("w-36 h-36 object-contain drop-shadow-2xl", feedAnim && "animate-bounce")}
              style={{ imageRendering: "pixelated" }}
              initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </AnimatePresence>
        </div>
        <motion.div key={monster.level} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold font-mono px-2 py-1 rounded-lg min-w-[3rem] text-center"
        >
          Lv.{monster.level}
        </motion.div>
        {/* W/L record */}
        {((monster.wins ?? 0) + (monster.losses ?? 0)) > 0 && (
          <div className="absolute top-2 left-2 text-[9px] font-mono text-muted-foreground bg-card/80 rounded px-1.5 py-0.5">
            {monster.wins ?? 0}W / {monster.losses ?? 0}L
          </div>
        )}
      </div>

      {/* Hunger / Happiness bars */}
      <div className="bg-card rounded-xl border border-card-border p-3 space-y-2">
        {[
          { label: "Hunger", value: monster.hunger, color: "bg-amber-400" },
          { label: "Happy", value: monster.happiness, color: "bg-pink-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-muted-foreground w-16">{label}</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", color)}
                animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{value}%</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-card rounded-xl border border-card-border p-3 space-y-1.5">
        <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 tracking-widest">Stats</div>
        <StatBar label="HP" value={monster.stats.hp} max={1200} color="primary" />
        <StatBar label="ATK" value={monster.stats.atk} max={1000} color="amber" />
        <StatBar label="DEF" value={monster.stats.def} max={1000} color="blue" />
        <StatBar label="SP.ATK" value={monster.stats.spatk} max={1000} color="pink" />
        <StatBar label="SP.DEF" value={monster.stats.spdef} max={1000} color="purple" />
        <StatBar label="SPD" value={monster.stats.spd} max={1000} color="cyan" />
      </div>

      {/* Moves panel */}
      <div className="bg-card rounded-xl border border-card-border p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">Moves</div>
          <div className="text-[10px] font-mono text-muted-foreground">{currentMoves.length}/4</div>
        </div>
        {currentMoves.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 text-center py-2">
            Win training battles to learn moves
          </p>
        ) : (
          <div className="space-y-1.5">
            {currentMoves.map((m) => <MoveCard key={m.id} move={m} />)}
          </div>
        )}
      </div>

      {/* Mega countdown */}
      {monster.stage === "final" && !megaReady && megaCountdown && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono bg-card border border-border rounded-xl px-3 py-2">
          <Zap className="w-3 h-3 text-primary" />
          Mega available in {megaCountdown}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <CooldownButton label="Feed" icon={Apple} cooldownTs={monster.feedCooldown} onClick={handleFeed} variant="amber" />
        <CooldownButton label="Train" icon={Swords} cooldownTs={monster.trainCooldown} onClick={handleTrain} variant="secondary" />
        {evolutionReady && (
          <motion.button onClick={handleEvolve}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-primary text-primary-foreground border-primary/50 overflow-hidden"
            animate={{ boxShadow: ["0 0 0px rgba(33,214,142,0.5)", "0 0 20px rgba(33,214,142,0.8)", "0 0 0px rgba(33,214,142,0.5)"] }}
            transition={{ repeat: Infinity, duration: 1.5 }}>
            <ArrowUpCircle className="w-4 h-4" /><span className="font-mono">Evolve</span>
          </motion.button>
        )}
        {!evolutionReady && megaReady && monster.stage !== "mega" && (
          <motion.button onClick={handleMega}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-purple-600 text-white border-purple-400 overflow-hidden"
            animate={{ boxShadow: ["0 0 0px rgba(147,51,234,0.5)", "0 0 20px rgba(147,51,234,0.8)", "0 0 0px rgba(147,51,234,0.5)"] }}
            transition={{ repeat: Infinity, duration: 1.5 }}>
            <Zap className="w-4 h-4" /><span className="font-mono">MEGA</span>
          </motion.button>
        )}
        {!evolutionReady && !megaReady && (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-card/50 text-muted-foreground border-border opacity-40">
            <ArrowUpCircle className="w-4 h-4" /><span className="font-mono">---</span>
          </div>
        )}
      </div>

      {/* ── Evolution picker ── */}
      <Dialog open={evoPickerOpen} onOpenChange={setEvoPickerOpen}>
        <DialogContent className="bg-card border-card-border max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-mono uppercase text-sm text-muted-foreground tracking-widest">Choose Evolution</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {evoOptions.map((id) => {
              const ep = allPokemon?.find((p) => p.id === id);
              if (!ep) return null;
              return (
                <button key={id} onClick={() => doEvolve(id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background hover:bg-primary/10 border border-border hover:border-primary/30 transition-all">
                  <img src={ep.sprite_url} alt={ep.name} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
                  <div className="text-left">
                    <div className="font-medium text-sm">{ep.name}</div>
                    <div className="flex gap-1 mt-0.5">{ep.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mega picker ── */}
      <Dialog open={megaPickerOpen} onOpenChange={setMegaPickerOpen}>
        <DialogContent className="bg-card border-card-border max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-mono uppercase text-sm text-muted-foreground tracking-widest">Choose Mega Form</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {megaOptions.map((form) => (
              <button key={form.id} onClick={() => doMega(form.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background hover:bg-purple-500/10 border border-border hover:border-purple-500/30 transition-all">
                <img src={form.sprite_url} alt={form.name} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
                <div className="font-medium text-sm">{form.name}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Training Battle Modal ── */}
      <Dialog open={battleOpen} onOpenChange={(open) => { if (!open) handleBattleClose(); }}>
        <DialogContent className="bg-card border-card-border max-w-sm mx-auto p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm font-bold text-foreground uppercase tracking-widest">Training Battle</span>
          </div>

          {battlePhase === "setup" && battleOpponent && (
            <div className="p-4 flex flex-col gap-4">
              {/* Matchup preview */}
              <div className="flex items-center gap-4 bg-background rounded-xl p-3 border border-border">
                <div className="flex-1 text-center">
                  <img src={currentSprite} alt={pokemon.name} className="w-14 h-14 object-contain mx-auto" style={{ imageRendering: "pixelated" }} />
                  <div className="text-xs font-bold mt-1">{pokemon.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Lv.{monster.level}</div>
                </div>
                <div className="text-lg font-bold text-primary font-mono">VS</div>
                <div className="flex-1 text-center">
                  <img src={battleOpponent.sprite} alt={battleOpponent.name} className="w-14 h-14 object-contain mx-auto" style={{ imageRendering: "pixelated" }} />
                  <div className="text-xs font-bold mt-1">{battleOpponent.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Lv.{battleOpponent.level}</div>
                </div>
              </div>
              {/* Opponent moves preview */}
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1.5">Opponent Moves</p>
                <div className="space-y-1">
                  {battleOpponent.moves.map((m) => <MoveCard key={m.id} move={m} />)}
                </div>
              </div>
              <button onClick={startBattleSim}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all">
                <Swords className="w-4 h-4" /> Start Battle!
              </button>
            </div>
          )}

          {battlePhase === "fighting" && battleResult && (
            <div className="p-4 flex flex-col gap-3">
              {/* Mini sprites */}
              <div className="flex items-center justify-between bg-background rounded-xl p-2 border border-border">
                <div className="flex items-center gap-2">
                  <img src={currentSprite} className="w-8 h-8 object-contain" style={{ imageRendering: "pixelated" }} />
                  <span className="text-xs font-bold">{pokemon.name}</span>
                </div>
                <span className="text-xs font-mono text-primary font-bold">FIGHT</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{battleOpponent?.name}</span>
                  <img src={battleOpponent?.sprite} className="w-8 h-8 object-contain" style={{ imageRendering: "pixelated" }} />
                </div>
              </div>
              {/* Log */}
              <div ref={logScrollRef} className="h-52 overflow-y-auto bg-background rounded-xl border border-border p-3 space-y-0.5 scroll-smooth">
                {battleResult.log.slice(0, battleLogShown).map((entry, i) => (
                  <LogLine key={i} entry={entry} />
                ))}
                {battleLogShown < battleResult.log.length && (
                  <div className="flex gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground animate-pulse">●●●</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {battlePhase === "result" && battleResult && (
            <div className="p-4 flex flex-col gap-4">
              <div className={cn(
                "flex flex-col items-center gap-2 rounded-xl p-4 border",
                battleResult.won
                  ? "bg-primary/10 border-primary/30"
                  : "bg-red-500/10 border-red-500/30"
              )}>
                {battleResult.won
                  ? <><Trophy className="w-10 h-10 text-primary" /><p className="font-bold text-primary text-lg">Victory!</p><p className="text-xs text-muted-foreground">+1 Level · Choose a move to learn</p></>
                  : <><Skull className="w-10 h-10 text-red-400" /><p className="font-bold text-red-400 text-lg">Defeated...</p><p className="text-xs text-muted-foreground">Train harder next time</p></>
                }
              </div>
              {/* Battle summary log */}
              <div className="h-32 overflow-y-auto bg-background rounded-xl border border-border p-3 space-y-0.5">
                {battleResult.log.map((entry, i) => <LogLine key={i} entry={entry} />)}
              </div>
              <button onClick={handleBattleClose}
                className="w-full py-2.5 bg-card text-foreground rounded-xl font-medium text-sm hover:bg-white/10 active:scale-95 transition-all border border-border">
                {battleResult.won ? "Continue →" : "Close"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Move Learning Modal ── */}
      <Dialog open={moveLearnOpen} onOpenChange={(open) => { if (!open) handleMoveSkip(); }}>
        <DialogContent className="bg-card border-card-border max-w-sm mx-auto p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm font-bold text-foreground uppercase tracking-widest">
              {replaceMode ? "Replace a Move" : "Move Learned!"}
            </span>
          </div>

          {!replaceMode ? (
            <div className="p-4 flex flex-col gap-4">
              <p className="text-xs text-muted-foreground text-center">
                {pokemon.name} can learn a new move! Pick one (or skip):
              </p>
              <div className="space-y-2">
                {moveOptions.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1">
                    <MoveCard move={m} onClick={() => handleMovePick(m)} />
                    <p className="text-[10px] text-muted-foreground/70 px-1">{m.description}</p>
                  </div>
                ))}
              </div>
              {/* Current moves (shown when at 4) */}
              {currentMoves.length >= 4 && (
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1.5">
                    Current moves (pick above to replace one)
                  </p>
                  <div className="space-y-1">
                    {currentMoves.map((m) => <MoveCard key={m.id} move={m} />)}
                  </div>
                </div>
              )}
              <button onClick={handleMoveSkip}
                className="w-full py-2 text-muted-foreground text-xs border border-border rounded-xl hover:bg-white/5 active:scale-95 transition-all">
                Skip — Don't learn any move
              </button>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <div>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Pick which move to replace with <span className="text-foreground font-semibold">{selectedMove?.name}</span>:
                </p>
                {/* New move being learned */}
                {selectedMove && (
                  <div className="mb-3">
                    <p className="text-[10px] font-mono uppercase text-primary tracking-widest mb-1.5">New Move</p>
                    <MoveCard move={selectedMove} />
                  </div>
                )}
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1.5">Replace:</p>
                <div className="space-y-1.5">
                  {currentMoves.map((m, i) => (
                    <button key={m.id} onClick={() => handleMoveReplace(i)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-red-500/40 hover:bg-red-500/5 active:scale-95 transition-all text-left group">
                      <X className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 shrink-0" />
                      <span className="flex-1 text-xs font-medium">{m.name}</span>
                      <TypeBadge type={m.type} />
                      {m.power > 0 && <span className="text-[10px] font-mono text-muted-foreground">{m.power}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleMoveSkip}
                className="w-full py-2 text-muted-foreground text-xs border border-border rounded-xl hover:bg-white/5 active:scale-95 transition-all">
                Cancel — Keep current moves
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
