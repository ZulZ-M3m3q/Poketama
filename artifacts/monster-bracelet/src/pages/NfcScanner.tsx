import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useParseNfc,
  useGetSaveData,
  useUpdateSaveData,
  getGetSaveDataQueryKey,
} from "@workspace/api-client-react";
import type {
  MonsterInstance,
  NfcParseResponse,
} from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { ScanBarcode, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

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

export default function NfcScanner() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [parsed, setParsed] = useState<NfcParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parseNfc = useParseNfc();
  const { data: saveData } = useGetSaveData({
    query: { queryKey: getGetSaveDataQueryKey() },
  });
  const updateSave = useUpdateSaveData();

  const handleScan = () => {
    setError(null);
    setParsed(null);
    setSuccess(false);
    parseNfc.mutate(
      { code: code.trim() },
      {
        onSuccess: (data) => setParsed(data as NfcParseResponse),
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Invalid NFC code";
          setError(msg);
        },
      }
    );
  };

  const handleConfirm = () => {
    if (!parsed || !saveData) return;
    const slots = saveData.slots ?? [];
    if (slots.length >= 6) {
      setError("All 6 slots are full. Remove a monster first.");
      return;
    }

    const newMonster: MonsterInstance = {
      id: nanoid(),
      pokedexId: parsed.pokedexId,
      level: 1,
      stats: parsed.stats,
      hunger: 50,
      happiness: 50,
      stage: parsed.pokemon.evolution_stage as MonsterInstance["stage"],
      evolutionTimer: parsed.pokemon.evolution_stage === "final" ? Date.now() : null,
      megaFormId: null,
      createdAt: Date.now(),
      lastFed: null,
      lastTrained: null,
      feedCooldown: null,
      trainCooldown: null,
    };

    updateSave.mutate(
      {
        slots: [...slots, newMonster],
        activeSlot: saveData.activeSlot ?? 0,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() });
          setSuccess(true);
          setParsed(null);
          setCode("");
          setTimeout(() => setSuccess(false), 3000);
        },
        onError: () => setError("Failed to save monster"),
      }
    );
  };

  const EXAMPLE_CODES = [
    { label: "Charmander (fire starter)", code: "39/52/43/60/50/65/4" },
    { label: "Pikachu (electric mouse)", code: "35/55/40/50/50/90/25" },
    { label: "Eevee (multi-path)", code: "55/55/50/45/65/55/133" },
    { label: "Mewtwo (legendary)", code: "106/110/90/154/90/130/150" },
    { label: "Gengar (ghost)", code: "60/65/60/130/75/110/94" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ScanBarcode className="w-4 h-4 text-primary" />
          <h1 className="text-foreground font-bold text-lg tracking-tight">
            NFC Scanner
          </h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Format: HP/ATK/DEF/SPATK/SPDEF/SPD/POKEDEX
        </p>
      </div>

      {/* Input area */}
      <div className="bg-card rounded-xl border border-card-border p-4 space-y-3">
        <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
          NFC Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
            setParsed(null);
          }}
          placeholder="e.g. 39/52/43/60/50/65/4"
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
        />
        <button
          onClick={handleScan}
          disabled={!code.trim() || parseNfc.isPending}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {parseNfc.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <ScanBarcode className="w-4 h-4" />
              Scan Code
            </>
          )}
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive-foreground rounded-xl px-3 py-2.5 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-xl px-3 py-2.5 text-xs"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            Monster added to your slots!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed preview */}
      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-primary/30 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <div className="text-[10px] font-mono uppercase text-primary tracking-widest mb-3">
                Monster Found
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center border border-border">
                    <img
                      src={parsed.pokemon.sprite_url}
                      alt={parsed.pokemon.name}
                      className="w-16 h-16 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                    #{String(parsed.pokedexId).padStart(3, "0")}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-lg">
                    {parsed.pokemon.name}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {parsed.pokemon.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">
                    {parsed.pokemon.evolution_stage} stage
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[
                  { label: "HP", val: parsed.stats.hp },
                  { label: "ATK", val: parsed.stats.atk },
                  { label: "DEF", val: parsed.stats.def },
                  { label: "SP.ATK", val: parsed.stats.spatk },
                  { label: "SP.DEF", val: parsed.stats.spdef },
                  { label: "SPD", val: parsed.stats.spd },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="bg-background rounded-lg px-2 py-1.5 text-center border border-border"
                  >
                    <div className="text-[8px] font-mono text-muted-foreground uppercase">
                      {label}
                    </div>
                    <div className="font-bold font-mono text-sm text-foreground">
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                disabled={updateSave.isPending}
                className="w-full mt-3 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateSave.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Add to Slots
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example codes */}
      <div className="bg-card rounded-xl border border-card-border p-4">
        <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-3">
          Example Codes
        </div>
        <div className="space-y-1.5">
          {EXAMPLE_CODES.map((ex) => (
            <button
              key={ex.code}
              onClick={() => {
                setCode(ex.code);
                setError(null);
                setParsed(null);
              }}
              className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-white/5 border border-border hover:border-primary/30 transition-all group"
            >
              <div className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {ex.label}
              </div>
              <div className="text-[10px] font-mono text-primary/70 mt-0.5">
                {ex.code}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
