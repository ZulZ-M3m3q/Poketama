import { useState, useEffect, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  checkEvolutionReady,
  checkMegaReady,
  calculateCooldownRemaining,
  timeUntilMega,
  getTypeColorClass,
} from "@/lib/game-logic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Swords, Apple, Zap, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function StatBar({
  label,
  value,
  max = 200,
  color = "primary",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-muted-foreground w-12 shrink-0">
        {label}
      </span>
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
      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">
        {value}
      </span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
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
  return (
    <span
      className={cn(
        "text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border tracking-widest",
        colors[type] ?? "bg-gray-500/20 text-gray-300 border-gray-400/30"
      )}
    >
      {type}
    </span>
  );
}

function CooldownButton({
  label,
  icon: Icon,
  cooldownTs,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  icon: React.ElementType;
  cooldownTs: number | null | undefined;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "amber";
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!cooldownTs) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(calculateCooldownRemaining(cooldownTs));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownTs]);

  const isOnCooldown = remaining > 0;

  const variantStyles = {
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
        variantStyles[variant]
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="font-mono">{label}</span>
      {isOnCooldown && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <motion.div
            className="h-full bg-white/40"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: remaining, ease: "linear" }}
          />
        </div>
      )}
      {isOnCooldown && (
        <span className="absolute top-1 right-1 text-[9px] font-mono opacity-70">
          {remaining}s
        </span>
      )}
    </button>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: saveData, isLoading: saveLoading } = useGetSaveData({
    query: { queryKey: getGetSaveDataQueryKey() },
  });
  const { data: allPokemon } = useListPokemon();
  const updateSave = useUpdateSaveData();

  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [evoAnim, setEvoAnim] = useState(false);
  const [feedAnim, setFeedAnim] = useState(false);
  const [evoPickerOpen, setEvoPickerOpen] = useState(false);
  const [megaPickerOpen, setMegaPickerOpen] = useState(false);
  const [megaOptions, setMegaOptions] = useState<
    Array<{ id: string; name: string; sprite_url: string }>
  >([]);
  const [evoOptions, setEvoOptions] = useState<number[]>([]);

  const activeSlot = saveData?.activeSlot ?? 0;
  const monster: MonsterInstance | undefined = saveData?.slots?.[activeSlot];
  const pokemon: Pokemon | undefined = allPokemon?.find(
    (p) => p.id === monster?.pokedexId
  );

  const currentSprite =
    monster?.stage === "mega" && monster.megaFormId
      ? pokemon?.megaForms?.find((m) => m.id === monster.megaFormId)
          ?.sprite_url
      : pokemon?.sprite_url;

  const evolutionReady = monster && pokemon ? checkEvolutionReady(monster, pokemon) : false;
  const megaReady = monster && pokemon ? checkMegaReady(monster, pokemon) : false;
  const megaCountdown = monster?.evolutionTimer
    ? timeUntilMega(monster.evolutionTimer)
    : null;

  const saveMonster = useCallback(
    (updated: MonsterInstance) => {
      if (!saveData) return;
      const newSlots = [...(saveData.slots ?? [])];
      newSlots[activeSlot] = updated;
      const newSave: SaveData = { ...saveData, slots: newSlots };
      updateSave.mutate(newSave, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() });
        },
      });
    },
    [saveData, activeSlot, updateSave, queryClient]
  );

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

  const handleTrain = () => {
    if (!monster) return;
    setLevelUpAnim(true);
    setTimeout(() => setLevelUpAnim(false), 1200);
    const boost = (n: number) => Math.ceil(n * 1.05);
    saveMonster({
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
      happiness: Math.max(0, monster.happiness - 5),
      hunger: Math.max(0, monster.hunger - 10),
      trainCooldown: Date.now() + 10000,
      lastTrained: Date.now(),
    });
  };

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
    if (!monster || !pokemon) return;
    const targetPokemon = allPokemon?.find((p) => p.id === targetId);
    if (!targetPokemon) return;
    setEvoAnim(true);
    setTimeout(() => setEvoAnim(false), 2000);
    const isFinal = targetPokemon.evolution_stage === "final";
    saveMonster({
      ...monster,
      pokedexId: targetId,
      stage: targetPokemon.evolution_stage as MonsterInstance["stage"],
      evolutionTimer: isFinal ? Date.now() : null,
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
    saveMonster({
      ...monster,
      stage: "mega",
      megaFormId: formId,
    });
    setMegaPickerOpen(false);
  };

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
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-32 h-32 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <span className="text-5xl opacity-30">?</span>
        </motion.div>
        <div>
          <h2 className="text-foreground font-bold text-lg mb-1">
            No Monster Yet
          </h2>
          <p className="text-muted-foreground text-sm">
            Scan an NFC code to hatch your first companion
          </p>
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

  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Evolution glow overlay */}
      <AnimatePresence>
        {evoAnim && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, times: [0, 0.2, 0.4, 0.6, 1] }}
          >
            <div className="absolute inset-0 bg-primary/30 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level up particle */}
      <AnimatePresence>
        {levelUpAnim && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2 }}
              className="text-4xl font-bold text-primary drop-shadow-[0_0_20px_rgba(33,214,142,0.9)] font-mono"
            >
              LEVEL UP!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: name + stage badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground font-bold text-xl tracking-tight">
            {pokemon.name}
          </h1>
          <div className="flex gap-1 mt-1">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-xs font-mono uppercase px-2 py-0.5 rounded-lg border",
              monster.stage === "mega"
                ? "bg-primary/20 text-primary border-primary/50"
                : monster.stage === "final"
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                : monster.stage === "mid"
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                : "bg-card text-muted-foreground border-border"
            )}
          >
            {monster.stage === "mega"
              ? monster.megaFormId
                  ?.split("-")
                  .slice(1)
                  .map((s) => s[0].toUpperCase() + s.slice(1))
                  .join(" ") ?? "MEGA"
              : monster.stage.toUpperCase()}
          </div>
          <div className="text-muted-foreground text-xs font-mono mt-1">
            #{String(pokemon.id).padStart(3, "0")}
          </div>
        </div>
      </div>

      {/* Sprite display */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "relative w-48 h-48 rounded-full flex items-center justify-center",
            monster.stage === "mega"
              ? "bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/20"
              : "bg-gradient-to-br from-card via-card/80 to-transparent"
          )}
        >
          {monster.stage === "mega" && (
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
          )}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSprite}
              src={currentSprite}
              alt={pokemon.name}
              className={cn(
                "w-36 h-36 object-contain drop-shadow-2xl",
                feedAnim && "animate-bounce"
              )}
              style={{ imageRendering: "pixelated" }}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </AnimatePresence>
        </div>

        {/* Level badge */}
        <motion.div
          key={monster.level}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold font-mono px-2 py-1 rounded-lg min-w-[3rem] text-center"
        >
          Lv.{monster.level}
        </motion.div>
      </div>

      {/* Hunger / Happiness bars */}
      <div className="bg-card rounded-xl border border-card-border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-muted-foreground w-16">
            Hunger
          </span>
          <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-400 rounded-full"
              animate={{ width: `${monster.hunger}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
            {monster.hunger}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-muted-foreground w-16">
            Happy
          </span>
          <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-pink-400 rounded-full"
              animate={{ width: `${monster.happiness}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
            {monster.happiness}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-card rounded-xl border border-card-border p-3 space-y-1.5">
        <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 tracking-widest">
          Stats
        </div>
        <StatBar label="HP" value={monster.stats.hp} max={250} color="primary" />
        <StatBar label="ATK" value={monster.stats.atk} max={200} color="amber" />
        <StatBar label="DEF" value={monster.stats.def} max={200} color="blue" />
        <StatBar label="SP.ATK" value={monster.stats.spatk} max={200} color="pink" />
        <StatBar label="SP.DEF" value={monster.stats.spdef} max={200} color="purple" />
        <StatBar label="SPD" value={monster.stats.spd} max={200} color="cyan" />
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
        <CooldownButton
          label="Feed"
          icon={Apple}
          cooldownTs={monster.feedCooldown}
          onClick={handleFeed}
          variant="amber"
        />
        <CooldownButton
          label="Train"
          icon={Swords}
          cooldownTs={monster.trainCooldown}
          onClick={handleTrain}
          variant="secondary"
        />
        {evolutionReady && (
          <motion.button
            onClick={handleEvolve}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-primary text-primary-foreground border-primary/50 overflow-hidden"
            animate={{ boxShadow: ["0 0 0px rgba(33,214,142,0.5)", "0 0 20px rgba(33,214,142,0.8)", "0 0 0px rgba(33,214,142,0.5)"] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span className="font-mono">Evolve</span>
          </motion.button>
        )}
        {!evolutionReady && megaReady && monster.stage !== "mega" && (
          <motion.button
            onClick={handleMega}
            className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-purple-600 text-white border-purple-400 overflow-hidden"
            animate={{ boxShadow: ["0 0 0px rgba(147,51,234,0.5)", "0 0 20px rgba(147,51,234,0.8)", "0 0 0px rgba(147,51,234,0.5)"] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Zap className="w-4 h-4" />
            <span className="font-mono">MEGA</span>
          </motion.button>
        )}
        {!evolutionReady && !megaReady && (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-xs font-medium border bg-card/50 text-muted-foreground border-border opacity-40">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="font-mono">---</span>
          </div>
        )}
      </div>

      {/* Evolution Picker Modal */}
      <Dialog open={evoPickerOpen} onOpenChange={setEvoPickerOpen}>
        <DialogContent className="bg-card border-card-border max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-mono uppercase text-sm text-muted-foreground tracking-widest">
              Choose Evolution
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {evoOptions.map((id) => {
              const ep = allPokemon?.find((p) => p.id === id);
              if (!ep) return null;
              return (
                <button
                  key={id}
                  onClick={() => doEvolve(id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background hover:bg-primary/10 border border-border hover:border-primary/30 transition-all"
                >
                  <img
                    src={ep.sprite_url}
                    alt={ep.name}
                    className="w-10 h-10 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm">{ep.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      {ep.types.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mega Picker Modal */}
      <Dialog open={megaPickerOpen} onOpenChange={setMegaPickerOpen}>
        <DialogContent className="bg-card border-card-border max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center font-mono uppercase text-sm text-muted-foreground tracking-widest">
              Choose Mega Form
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {megaOptions.map((form) => (
              <button
                key={form.id}
                onClick={() => doMega(form.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background hover:bg-purple-500/10 border border-border hover:border-purple-500/30 transition-all"
              >
                <img
                  src={form.sprite_url}
                  alt={form.name}
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="font-medium text-sm">{form.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
