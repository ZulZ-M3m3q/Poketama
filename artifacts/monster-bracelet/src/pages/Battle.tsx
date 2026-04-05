import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetSaveData,
  useUpdateSaveData,
  useListPokemon,
  getGetSaveDataQueryKey,
} from "@workspace/api-client-react";
import type {
  MonsterInstance,
  SaveData,
  Pokemon,
} from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import {
  generateBattleCode,
  parseBattleCode,
  monsterToBattleMonster,
  getLearnableMoves,
} from "@/lib/game-logic";
import { simulateBattle } from "@/lib/battle-engine";
import type {
  ExtendedMonster,
  BattleMonster,
  BattleLogEntry,
  BattleResult,
  MonsterMove,
} from "@/lib/types";
import { Swords, Copy, Check, Trophy, Skull, Star, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared mini-components ────────────────────────────────────────────────────

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

function MoveCard({ move }: { move: MonsterMove }) {
  const catIcon = move.category === "physical" ? "⚔" : move.category === "special" ? "✦" : "◉";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/60">
      <span className="text-[10px] opacity-60 font-mono w-4 shrink-0">{catIcon}</span>
      <span className="flex-1 text-xs font-medium text-foreground truncate">{move.name}</span>
      <TypeBadge type={move.type} />
      {move.power > 0 && <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-1">{move.power}</span>}
    </div>
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
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      className={cn("text-[11px] leading-relaxed", colors[entry.color])}
    >
      {entry.text}
    </motion.p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "fighting" | "result";

export default function Battle() {
  const queryClient = useQueryClient();
  const { data: saveData } = useGetSaveData({ query: { queryKey: getGetSaveDataQueryKey() } });
  const { data: allPokemon } = useListPokemon();
  const updateSave = useUpdateSaveData();

  // Your Pokémon selection
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [codeInputOpen, setCodeInputOpen] = useState(false);

  // Battle code
  const [opponentCode, setOpponentCode] = useState("");
  const [opponentBM, setOpponentBM] = useState<BattleMonster | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Battle state
  const [phase, setPhase] = useState<Phase>("idle");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [logShown, setLogShown] = useState(0);
  const [pendingMonster, setPendingMonster] = useState<ExtendedMonster | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Move learning
  const [moveLearnOpen, setMoveLearnOpen] = useState(false);
  const [moveOptions, setMoveOptions] = useState<MonsterMove[]>([]);
  const [selectedMove, setSelectedMove] = useState<MonsterMove | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const slots = (saveData?.slots ?? []) as ExtendedMonster[];
  const myMonster = slots[selectedSlot] as ExtendedMonster | undefined;
  const myPokemon: Pokemon | undefined = allPokemon?.find((p) => p.id === myMonster?.pokedexId);

  // Auto-scroll log
  useEffect(() => {
    if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [logShown]);

  const saveMonster = useCallback((updated: ExtendedMonster, slotIndex: number) => {
    if (!saveData) return;
    const newSlots = [...(saveData.slots ?? [])];
    newSlots[slotIndex] = updated as MonsterInstance;
    const newSave: SaveData = { ...saveData, slots: newSlots };
    queryClient.setQueryData(getGetSaveDataQueryKey(), newSave);
    updateSave.mutate({ data: newSave }, {
      onError: () => { queryClient.invalidateQueries({ queryKey: getGetSaveDataQueryKey() }); },
    });
  }, [saveData, updateSave, queryClient]);

  // Copy my Pokémon's battle code
  const handleCopyCode = () => {
    if (!myMonster || !myPokemon) return;
    const code = generateBattleCode(myMonster, myPokemon);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Parse opponent code
  const handleLoadCode = () => {
    setCodeError(null);
    const bm = parseBattleCode(opponentCode);
    if (!bm) {
      setCodeError("Invalid battle code. Make sure you copied the full code.");
      return;
    }
    setOpponentBM(bm);
    setCodeInputOpen(false);
  };

  // Start the PvP battle
  const handleStartBattle = useCallback(() => {
    if (!myMonster || !myPokemon || !opponentBM) return;
    const playerBM = monsterToBattleMonster(myMonster, myPokemon);
    const result = simulateBattle(playerBM, opponentBM);
    setBattleResult(result);
    setPhase("fighting");
    setLogShown(0);

    let i = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      i++;
      setLogShown(i);
      if (i >= result.log.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setTimeout(() => {
          setPhase("result");
          if (result.won) {
            const boost = (n: number) => Math.ceil(n * 1.05);
            const leveled: ExtendedMonster = {
              ...myMonster,
              level: myMonster.level + 2, // PvP gives 2 levels
              stats: {
                hp: boost(boost(myMonster.stats.hp)),
                atk: boost(boost(myMonster.stats.atk)),
                def: boost(boost(myMonster.stats.def)),
                spatk: boost(boost(myMonster.stats.spatk)),
                spdef: boost(boost(myMonster.stats.spdef)),
                spd: boost(boost(myMonster.stats.spd)),
              },
              happiness: Math.min(100, myMonster.happiness + 12),
              hunger: Math.max(0, myMonster.hunger - 20),
              wins: (myMonster.wins ?? 0) + 1,
            };
            setPendingMonster(leveled);
          } else {
            saveMonster({
              ...myMonster,
              hunger: Math.max(0, myMonster.hunger - 15),
              happiness: Math.max(0, myMonster.happiness - 8),
              losses: (myMonster.losses ?? 0) + 1,
            }, selectedSlot);
          }
        }, 500);
      }
    }, 300);
  }, [myMonster, myPokemon, opponentBM, saveMonster, selectedSlot]);

  const handleBattleFinish = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (battleResult?.won && pendingMonster && myPokemon) {
      const learnable = getLearnableMoves(pendingMonster, myPokemon, 3);
      if (learnable.length > 0) {
        setMoveOptions(learnable);
        setSelectedMove(null);
        setReplaceMode(false);
        setMoveLearnOpen(true);
        return;
      }
      saveMonster(pendingMonster, selectedSlot);
    }
    setPhase("idle");
    setBattleResult(null);
    setLogShown(0);
    setPendingMonster(null);
    setOpponentBM(null);
    setOpponentCode("");
  }, [battleResult, pendingMonster, myPokemon, saveMonster, selectedSlot]);

  // Move learning
  const handleMovePick = (move: MonsterMove) => {
    if (!pendingMonster) return;
    const currentMoves = pendingMonster.moves ?? [];
    if (currentMoves.length < 4) {
      const updated = { ...pendingMonster, moves: [...currentMoves, move] };
      saveMonster(updated, selectedSlot);
      cleanupMoveLearn();
    } else {
      setSelectedMove(move);
      setReplaceMode(true);
    }
  };
  const handleMoveReplace = (i: number) => {
    if (!pendingMonster || !selectedMove) return;
    const newMoves = [...(pendingMonster.moves ?? [])];
    newMoves[i] = selectedMove;
    saveMonster({ ...pendingMonster, moves: newMoves }, selectedSlot);
    cleanupMoveLearn();
  };
  const handleMoveSkip = () => {
    if (pendingMonster) saveMonster(pendingMonster, selectedSlot);
    cleanupMoveLearn();
  };
  const cleanupMoveLearn = () => {
    setPendingMonster(null);
    setSelectedMove(null);
    setReplaceMode(false);
    setMoveLearnOpen(false);
    setPhase("idle");
    setBattleResult(null);
    setLogShown(0);
    setOpponentBM(null);
    setOpponentCode("");
  };

  const myCode = myMonster && myPokemon ? generateBattleCode(myMonster, myPokemon) : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-4 h-4 text-primary" />
        <h1 className="text-foreground font-bold text-lg tracking-tight">PvP Battle</h1>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Share your code with a friend, enter theirs, then battle!
      </p>

      {phase === "idle" && (
        <>
          {/* ── Select your fighter ── */}
          {slots.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">No monsters in your slots.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Scan an NFC code first!</p>
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">Your Fighter</p>
              {/* Slot selector */}
              <div className="flex flex-wrap gap-2">
                {slots.map((s, i) => {
                  const sp = allPokemon?.find((p) => p.id === s.pokedexId);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(i)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all",
                        selectedSlot === i
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      {sp && <img src={sp.sprite_url} className="w-6 h-6 object-contain" style={{ imageRendering: "pixelated" }} />}
                      <span>{sp?.name ?? `Slot ${i + 1}`}</span>
                      <span className="text-[10px] font-mono opacity-60">Lv.{s.level}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Pokémon preview */}
              {myMonster && myPokemon && (
                <div className="flex items-center gap-4 bg-background rounded-xl p-3 border border-border">
                  <img src={myPokemon.sprite_url} className="w-14 h-14 object-contain" style={{ imageRendering: "pixelated" }} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{myPokemon.name}</div>
                    <div className="flex gap-1 mt-1">{myPokemon.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">
                      Lv.{myMonster.level} · {(myMonster.moves ?? []).length} moves · {myMonster.wins ?? 0}W/{myMonster.losses ?? 0}L
                    </div>
                  </div>
                </div>
              )}

              {/* Copy my code */}
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-2">My Battle Code</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-[10px] font-mono text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                    {myCode ?? "—"}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    disabled={!myCode}
                    className="shrink-0 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-primary" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Enter opponent code ── */}
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">Opponent Code</p>

            {!opponentBM ? (
              <>
                <textarea
                  value={opponentCode}
                  onChange={(e) => { setOpponentCode(e.target.value); setCodeError(null); }}
                  placeholder="Paste opponent's battle code here…"
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
                />
                {codeError && (
                  <p className="text-xs text-red-400">{codeError}</p>
                )}
                <button
                  onClick={handleLoadCode}
                  disabled={!opponentCode.trim()}
                  className="w-full py-2.5 bg-card border border-border text-foreground rounded-xl text-sm font-medium hover:bg-white/5 active:scale-95 transition-all disabled:opacity-40"
                >
                  Load Opponent
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Opponent preview */}
                <div className="flex items-center gap-4 bg-background rounded-xl p-3 border border-primary/30">
                  <img src={opponentBM.sprite} className="w-14 h-14 object-contain" style={{ imageRendering: "pixelated" }} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{opponentBM.name}</div>
                    <div className="flex gap-1 mt-1">{opponentBM.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">Lv.{opponentBM.level}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">Their Moves</p>
                  {opponentBM.moves.map((m) => <MoveCard key={m.id} move={m} />)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOpponentBM(null); setOpponentCode(""); }}
                    className="flex-1 py-2 rounded-xl border border-border bg-background text-xs text-muted-foreground hover:bg-white/5 active:scale-95 transition-all"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleStartBattle}
                    disabled={!myMonster}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40"
                  >
                    <Swords className="w-4 h-4" /> Fight!
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card/50 border border-border/50 rounded-xl p-3 text-[11px] text-muted-foreground/70 leading-relaxed">
            <strong className="text-foreground/70">How to battle a friend:</strong> Copy your code above and send it to them. They paste it in their game, then copy and send you their code. Paste theirs here and fight! Winner gets <span className="text-primary font-semibold">+2 Levels</span>.
          </div>
        </>
      )}

      {/* ── Fighting phase ── */}
      {phase === "fighting" && battleResult && opponentBM && myPokemon && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2">
              <img src={myPokemon.sprite_url} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
              <div>
                <div className="text-xs font-bold">{myPokemon.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">Lv.{myMonster?.level}</div>
              </div>
            </div>
            <span className="text-sm font-bold text-primary font-mono">VS</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-bold">{opponentBM.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">Lv.{opponentBM.level}</div>
              </div>
              <img src={opponentBM.sprite} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
            </div>
          </div>

          <div ref={logScrollRef} className="h-64 overflow-y-auto bg-card rounded-xl border border-border p-3 space-y-0.5 scroll-smooth">
            {battleResult.log.slice(0, logShown).map((entry, i) => <LogLine key={i} entry={entry} />)}
            {logShown < battleResult.log.length && (
              <div className="flex gap-1 pt-1"><span className="text-[10px] text-muted-foreground animate-pulse">●●●</span></div>
            )}
          </div>
        </div>
      )}

      {/* ── Result phase ── */}
      {phase === "result" && battleResult && (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl p-6 border",
              battleResult.won ? "bg-primary/10 border-primary/30" : "bg-red-500/10 border-red-500/30"
            )}
          >
            {battleResult.won ? (
              <>
                <Trophy className="w-12 h-12 text-primary" />
                <p className="font-bold text-primary text-xl">Victory!</p>
                <p className="text-xs text-muted-foreground text-center">+2 Levels gained! Choose a move to learn.</p>
              </>
            ) : (
              <>
                <Skull className="w-12 h-12 text-red-400" />
                <p className="font-bold text-red-400 text-xl">Defeated</p>
                <p className="text-xs text-muted-foreground">Better luck next time!</p>
              </>
            )}
          </motion.div>

          <div className="h-40 overflow-y-auto bg-card rounded-xl border border-border p-3 space-y-0.5">
            {battleResult.log.map((entry, i) => <LogLine key={i} entry={entry} />)}
          </div>

          <button
            onClick={handleBattleFinish}
            className="w-full py-3 bg-card border border-border text-foreground rounded-xl font-medium text-sm hover:bg-white/5 active:scale-95 transition-all"
          >
            {battleResult.won ? "Continue →" : "Back to Battle"}
          </button>
        </div>
      )}

      {/* ── Move Learning Modal (inline) ── */}
      <AnimatePresence>
        {moveLearnOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-card-border rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-bold text-foreground uppercase tracking-widest">
                  {replaceMode ? "Replace a Move" : "+2 Level — New Move!"}
                </span>
              </div>
              {!replaceMode ? (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground text-center">Pick a move to learn:</p>
                  <div className="space-y-2">
                    {moveOptions.map((m) => (
                      <div key={m.id} className="space-y-0.5">
                        <button
                          onClick={() => handleMovePick(m)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-white/5 active:scale-95 transition-all text-left"
                        >
                          <span className="text-[10px] opacity-60 font-mono w-4 shrink-0">
                            {m.category === "physical" ? "⚔" : m.category === "special" ? "✦" : "◉"}
                          </span>
                          <span className="flex-1 text-xs font-medium">{m.name}</span>
                          <TypeBadge type={m.type} />
                          {m.power > 0 && <span className="text-[10px] font-mono text-muted-foreground">{m.power}</span>}
                        </button>
                        <p className="text-[10px] text-muted-foreground/60 px-1">{m.description}</p>
                      </div>
                    ))}
                  </div>
                  {(pendingMonster?.moves ?? []).length >= 4 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1.5">Current moves (full — selecting above will ask to replace)</p>
                      <div className="space-y-1">{(pendingMonster?.moves ?? []).map((m) => <MoveCard key={m.id} move={m} />)}</div>
                    </div>
                  )}
                  <button onClick={handleMoveSkip} className="w-full py-2 text-muted-foreground text-xs border border-border rounded-xl hover:bg-white/5 active:scale-95 transition-all">
                    Skip — Don't learn any move
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-primary tracking-widest mb-1.5">New Move</p>
                    {selectedMove && <MoveCard move={selectedMove} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest mb-1.5">Replace:</p>
                    <div className="space-y-1.5">
                      {(pendingMonster?.moves ?? []).map((m, i) => (
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
                  <button onClick={handleMoveSkip} className="w-full py-2 text-muted-foreground text-xs border border-border rounded-xl hover:bg-white/5 active:scale-95 transition-all">
                    Cancel — Keep current moves
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
