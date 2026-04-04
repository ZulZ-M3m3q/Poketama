import { motion } from "framer-motion";
import {
  useGetSaveData,
  useUpdateSaveData,
  useListPokemon,
  getGetSaveDataQueryKey,
} from "@workspace/api-client-react";
import type {
  MonsterInstance,
  SaveData,
} from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function StageBadge({ stage }: { stage: MonsterInstance["stage"] }) {
  const styles: Record<string, string> = {
    base: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    mid: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    final: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    mega: "bg-primary/20 text-primary border-primary/50",
  };
  return (
    <span
      className={cn(
        "text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border tracking-widest",
        styles[stage] ?? styles.base
      )}
    >
      {stage}
    </span>
  );
}

export default function Slots() {
  const queryClient = useQueryClient();
  const { data: saveData, isLoading } = useGetSaveData({
    query: { queryKey: getGetSaveDataQueryKey() },
  });
  const { data: allPokemon } = useListPokemon();
  const updateSave = useUpdateSaveData();

  const slots = saveData?.slots ?? [];
  const activeSlot = saveData?.activeSlot ?? 0;

  const handleActivate = (idx: number) => {
    if (!saveData) return;
    updateSave.mutate(
      { ...saveData, activeSlot: idx },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() }),
      }
    );
  };

  const handleDelete = (idx: number) => {
    if (!saveData) return;
    const newSlots = slots.filter((_, i) => i !== idx);
    const newActive =
      activeSlot >= newSlots.length
        ? Math.max(0, newSlots.length - 1)
        : activeSlot;
    updateSave.mutate(
      { slots: newSlots, activeSlot: newActive },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() }),
      }
    );
  };

  const emptySlots = 6 - slots.length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-foreground font-bold text-lg tracking-tight">
          Monster Slots
        </h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">
          {slots.length}/6 slots used
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">No monsters yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Scan an NFC code to add one
            </p>
          </div>
          <Link href="/nfc">
            <button className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all">
              Scan NFC
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {slots.map((monster, idx) => {
            const pokemon = allPokemon?.find((p) => p.id === monster.pokedexId);
            const isActive = idx === activeSlot;
            const sprite =
              monster.stage === "mega" && monster.megaFormId
                ? pokemon?.megaForms?.find((m) => m.id === monster.megaFormId)
                    ?.sprite_url
                : pokemon?.sprite_url;

            return (
              <motion.div
                key={monster.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "relative bg-card rounded-xl border overflow-hidden transition-all",
                  isActive
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-card-border"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                )}

                <button
                  onClick={() => handleActivate(idx)}
                  className="w-full p-3 flex flex-col items-center gap-2 active:bg-white/5 transition-all"
                >
                  <div className="relative w-16 h-16 rounded-full bg-background/80 flex items-center justify-center">
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                    )}
                    {sprite ? (
                      <img
                        src={sprite}
                        alt={pokemon?.name}
                        className="w-12 h-12 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-lg">?</span>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <div className="font-medium text-xs text-foreground truncate">
                      {pokemon?.name ?? `#${monster.pokedexId}`}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[9px] font-mono text-primary">
                        Lv.{monster.level}
                      </span>
                      <span className="text-muted-foreground/30">|</span>
                      <StageBadge stage={monster.stage} />
                    </div>
                  </div>

                  {isActive && (
                    <div className="text-[8px] font-mono text-primary uppercase tracking-widest">
                      Active
                    </div>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/30 flex items-center justify-center transition-all group"
                >
                  <Trash2 className="w-3 h-3 text-destructive/60 group-hover:text-destructive" />
                </button>
              </motion.div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <Link key={`empty-${i}`} href="/nfc">
              <div className="bg-card/30 rounded-xl border border-dashed border-border/50 p-3 flex flex-col items-center justify-center gap-2 min-h-[120px] hover:bg-card/50 hover:border-primary/30 transition-all cursor-pointer">
                <Plus className="w-5 h-5 text-muted-foreground/40" />
                <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                  Empty
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
