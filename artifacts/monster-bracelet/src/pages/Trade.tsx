import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Copy, Check, Loader2, X, RefreshCw, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/react";
import { useGetSaveData, useListPokemon, getGetSaveDataQueryKey } from "@workspace/api-client-react";
import type { MonsterInstance } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

interface RoomPlayer {
  displayName: string;
  slotIndex: number | null;
  confirmed: boolean;
  slots: MonsterInstance[];
}

interface RoomState {
  code: string;
  status: "waiting" | "selecting" | "completed" | "cancelled";
  myRole: "creator" | "joiner";
  creator: RoomPlayer;
  joiner: RoomPlayer | null;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    fire: "bg-orange-500/20 text-orange-300", water: "bg-blue-500/20 text-blue-300",
    grass: "bg-green-500/20 text-green-300", electric: "bg-yellow-400/20 text-yellow-300",
    psychic: "bg-pink-500/20 text-pink-300", ice: "bg-cyan-400/20 text-cyan-300",
    dragon: "bg-indigo-500/20 text-indigo-300", dark: "bg-zinc-500/20 text-zinc-300",
    fairy: "bg-pink-300/20 text-pink-200", fighting: "bg-red-600/20 text-red-300",
    poison: "bg-purple-500/20 text-purple-300", ground: "bg-amber-600/20 text-amber-300",
    rock: "bg-yellow-700/20 text-yellow-600", ghost: "bg-violet-600/20 text-violet-300",
    steel: "bg-slate-400/20 text-slate-300", bug: "bg-lime-500/20 text-lime-300",
    flying: "bg-sky-400/20 text-sky-300", normal: "bg-zinc-400/20 text-zinc-300",
  };
  return (
    <span className={cn("text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-white/10", colors[type] ?? "bg-zinc-500/20 text-zinc-300")}>
      {type}
    </span>
  );
}

function MonsterCard({
  monster,
  allPokemon,
  selected,
  onSelect,
  disabled,
}: {
  monster: MonsterInstance;
  allPokemon: any[];
  selected: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  const poke = allPokemon.find((p) => p.id === monster.pokedexId);
  if (!poke) return null;
  return (
    <motion.button
      whileTap={onSelect && !disabled ? { scale: 0.97 } : {}}
      onClick={onSelect}
      disabled={disabled || !onSelect}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-card-border bg-card hover:border-primary/30",
        (disabled || !onSelect) && "opacity-70 cursor-default"
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
      <img
        src={poke.sprite_url}
        alt={poke.name}
        className="w-12 h-12 object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{poke.name}</div>
        <div className="text-[10px] font-mono text-muted-foreground">Lv.{monster.level}</div>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {poke.types.map((t: string) => <TypeBadge key={t} type={t} />)}
        </div>
      </div>
    </motion.button>
  );
}

export default function Trade() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: saveData } = useGetSaveData({ query: { queryKey: getGetSaveDataQueryKey() } });
  const { data: allPokemon } = useListPokemon();

  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [mySlotIndex, setMySlotIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const mySlots = saveData?.slots ?? [];
  const displayName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Trainer";

  // Poll room state
  useEffect(() => {
    if (view !== "room" || !room) return;
    if (room.status === "completed" || room.status === "cancelled") return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/trade/room/${room.code}`);
        setRoom(data);
        if (data.myRole === "creator") {
          setMySlotIndex(data.creator.slotIndex);
        } else {
          setMySlotIndex(data.joiner?.slotIndex ?? null);
        }
        if (data.status === "completed") {
          queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() });
        }
      } catch {
        // silently retry
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [view, room, queryClient]);

  const handleCreate = async () => {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/trade/create", {
        method: "POST",
        body: JSON.stringify({ displayName }),
      });
      setRoom(data);
      setMySlotIndex(null);
      setView("room");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError("Please enter a trade code."); return; }
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/trade/join", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim().toUpperCase(), displayName }),
      });
      setRoom(data);
      setMySlotIndex(null);
      setView("room");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPokemon = async (slotIndex: number) => {
    if (!room) return;
    setMySlotIndex(slotIndex);
    try {
      const data = await apiFetch("/trade/offer", {
        method: "POST",
        body: JSON.stringify({ code: room.code, slotIndex }),
      });
      setRoom(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConfirm = async () => {
    if (!room || mySlotIndex === null) return;
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/trade/confirm", { method: "POST", body: JSON.stringify({ code: room.code }) });
      setRoom(data);
      if (data.status === "completed") {
        queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!room) { setView("lobby"); return; }
    try {
      await apiFetch("/trade/cancel", { method: "POST", body: JSON.stringify({ code: room.code }) });
    } catch { /* ignore */ }
    setRoom(null);
    setMySlotIndex(null);
    setView("lobby");
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const myPlayer = room ? (room.myRole === "creator" ? room.creator : room.joiner) : null;
  const theirPlayer = room ? (room.myRole === "creator" ? room.joiner : room.creator) : null;
  const myConfirmed = myPlayer?.confirmed ?? false;
  const theirConfirmed = theirPlayer?.confirmed ?? false;
  const bothSelected = mySlotIndex !== null && theirPlayer?.slotIndex !== null;

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (view === "lobby") {
    return (
      <div className="flex flex-col p-4 gap-5 min-h-full">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <h1 className="text-foreground font-bold text-xl tracking-tight">Trade</h1>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Create a trade room to get a code, or enter a friend's code to join their room. Then pick a Pokémon and swap!
        </p>

        {mySlots.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
            You need at least one Pokémon in your slots to trade. Add one from the Slots tab first.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={loading || mySlots.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-4 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Create Trade Room
          </button>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or join</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={6}
              placeholder="Enter code (e.g. XK7B4M)"
              className="flex-1 bg-card border border-card-border rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={loading || mySlots.length === 0}
              className="rounded-xl bg-card border border-card-border px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ── Trade completed ────────────────────────────────────────────────────────
  if (room?.status === "completed") {
    const myOffered = myPlayer?.slotIndex !== null ? myPlayer?.slots[myPlayer.slotIndex!] : null;
    const theirOffered = theirPlayer?.slotIndex !== null ? theirPlayer?.slots[theirPlayer.slotIndex!] : null;
    const myNewPoke = allPokemon?.find((p: any) => p.id === theirOffered?.pokedexId);
    return (
      <div className="flex flex-col p-4 gap-5 items-center justify-center min-h-full text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-2 mx-auto">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Trade Complete!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {myNewPoke ? `You received ${myNewPoke.name}!` : "The trade was successful."}
          </p>
        </motion.div>
        {myNewPoke && (
          <img src={myNewPoke.sprite_url} alt={myNewPoke.name} className="w-28 h-28 object-contain" style={{ imageRendering: "pixelated" }} />
        )}
        <button
          onClick={() => { setRoom(null); setMySlotIndex(null); setView("lobby"); }}
          className="rounded-xl bg-primary text-primary-foreground px-8 py-3 font-semibold text-sm"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // ── Trade cancelled ────────────────────────────────────────────────────────
  if (room?.status === "cancelled") {
    return (
      <div className="flex flex-col p-4 gap-5 items-center justify-center min-h-full text-center">
        <X className="w-12 h-12 text-red-400" />
        <h2 className="text-lg font-bold text-foreground">Trade Cancelled</h2>
        <button
          onClick={() => { setRoom(null); setMySlotIndex(null); setView("lobby"); }}
          className="rounded-xl bg-card border border-card-border px-8 py-3 font-semibold text-sm text-foreground"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // ── Room view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-foreground font-bold text-lg tracking-tight">Trade Room</h1>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Code display */}
      {room?.status === "waiting" && (
        <div className="bg-card rounded-xl border border-card-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-widest">Your Trade Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-bold font-mono text-primary tracking-widest">{room.code}</span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Waiting for another player to join…
          </div>
        </div>
      )}

      {room?.status === "selecting" && (
        <>
          {/* Players */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "You", player: myPlayer, isMe: true },
              { label: theirPlayer?.displayName ?? "Opponent", player: theirPlayer, isMe: false },
            ].map(({ label, player, isMe }) => (
              <div key={label} className={cn(
                "bg-card rounded-xl border p-3 text-center",
                isMe ? "border-primary/30" : "border-card-border"
              )}>
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1">{label}</div>
                {player?.slotIndex !== null && player?.slotIndex !== undefined ? (
                  <>
                    {(() => {
                      const m = player.slots[player.slotIndex];
                      const p = allPokemon?.find((pk: any) => pk.id === m?.pokedexId);
                      return p ? (
                        <div className="flex flex-col items-center gap-1">
                          <img src={p.sprite_url} alt={p.name} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
                          <span className="text-xs font-medium text-foreground">{p.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">Lv.{m.level}</span>
                        </div>
                      ) : <div className="text-xs text-muted-foreground">…</div>;
                    })()}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground/50 py-2">Choosing…</div>
                )}
                {player?.confirmed && (
                  <div className="mt-1 text-[9px] text-primary font-mono flex items-center justify-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Ready
                  </div>
                )}
              </div>
            ))}
          </div>

          <ArrowLeftRight className="w-5 h-5 text-primary mx-auto" />

          {/* My Pokémon selection */}
          <div className="bg-card rounded-xl border border-card-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-2">
              Choose a Pokémon to offer
            </div>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {mySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-2">No Pokémon in slots</p>
              ) : (
                mySlots.map((m, i) => (
                  <MonsterCard
                    key={i}
                    monster={m}
                    allPokemon={allPokemon ?? []}
                    selected={mySlotIndex === i}
                    onSelect={() => handleSelectPokemon(i)}
                    disabled={myConfirmed}
                  />
                ))
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          {/* Confirm button */}
          <div className="sticky bottom-0 bg-background/90 backdrop-blur-sm pt-2 pb-1 -mx-4 px-4">
            {myConfirmed ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/30 py-3 text-sm text-primary font-semibold">
                <Check className="w-4 h-4" />
                {theirConfirmed ? "Trade executing…" : "Waiting for other player…"}
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading || mySlotIndex === null || !bothSelected}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {mySlotIndex === null
                  ? "Select a Pokémon first"
                  : !bothSelected
                  ? "Wait for other player to choose"
                  : "Confirm Trade"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
