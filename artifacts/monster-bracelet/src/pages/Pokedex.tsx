import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useListPokemon } from "@workspace/api-client-react";
import type { Pokemon } from "@workspace/api-client-react/src/generated/api.schemas";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_TYPES = [
  "fire", "water", "grass", "electric", "psychic", "ghost", "dragon",
  "dark", "fairy", "ice", "fighting", "poison", "ground", "rock",
  "steel", "flying", "normal", "bug",
];

function TypeBadge({ type, small }: { type: string; small?: boolean }) {
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
        "font-mono uppercase border tracking-widest",
        small ? "text-[8px] px-1.5 py-0.5 rounded" : "text-[10px] px-2 py-0.5 rounded-full",
        colors[type] ?? "bg-gray-500/20 text-gray-300 border-gray-400/30"
      )}
    >
      {type}
    </span>
  );
}

function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-2.5 flex items-center gap-2.5 hover:bg-white/5 hover:border-primary/20 transition-all">
      <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center border border-border shrink-0">
        <img
          src={pokemon.sprite_url}
          alt={pokemon.name}
          className="w-10 h-10 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs text-foreground truncate">{pokemon.name}</span>
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
        </div>
        <div className="flex gap-0.5 mt-0.5 flex-wrap">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} small />
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn(
            "text-[8px] font-mono uppercase px-1 py-0.5 rounded border",
            pokemon.evolution_stage === "final"
              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
              : pokemon.evolution_stage === "mid"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          )}>
            {pokemon.evolution_stage}
          </span>
          {pokemon.hasMega && (
            <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded border bg-primary/10 text-primary border-primary/20">
              mega
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pokedex() {
  const { data: allPokemon, isLoading } = useListPokemon();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  const filtered = useMemo(() => {
    if (!allPokemon) return [];
    let result = [...allPokemon].sort((a, b) => a.id - b.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)
      );
    }
    if (selectedType) {
      result = result.filter((p) => p.types.includes(selectedType));
    }
    return result;
  }, [allPokemon, search, selectedType]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground font-bold text-lg tracking-tight">
            Pokedex
          </h1>
          <span className="text-xs font-mono text-muted-foreground">
            {allPokemon?.length ?? 0} entries
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or #..."
              className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs transition-all",
              selectedType
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {showTypeFilter && (
          <div className="flex flex-wrap gap-1 pt-1">
            <button
              onClick={() => { setSelectedType(null); setShowTypeFilter(false); }}
              className={cn(
                "text-[9px] font-mono uppercase px-2 py-1 rounded-full border transition-all",
                !selectedType
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              All
            </button>
            {ALL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type === selectedType ? null : type); setShowTypeFilter(false); }}
                className={cn(
                  "text-[9px] font-mono uppercase px-2 py-1 rounded-full border transition-all",
                  selectedType === type
                    ? "ring-1 ring-primary"
                    : ""
                )}
              >
                <TypeBadge type={type} small />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No results found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filtered.map((pokemon, i) => (
              <motion.div
                key={pokemon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <PokemonCard pokemon={pokemon} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
