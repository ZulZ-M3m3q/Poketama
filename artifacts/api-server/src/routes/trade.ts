import { Router } from "express";
import { getAuth } from "@clerk/express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = path.resolve(__dirname, "..");
const SAVES_DIR = path.resolve(ARTIFACT_ROOT, "src/data/saves");

function getUserSaveFile(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(SAVES_DIR, `${safe}.json`);
}

function loadSave(userId: string): any {
  try {
    const file = getUserSaveFile(userId);
    if (!fs.existsSync(file)) return { slots: [], activeSlot: 0 };
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return { slots: [], activeSlot: 0 };
  }
}

function writeSave(userId: string, data: any): void {
  if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
  fs.writeFileSync(getUserSaveFile(userId), JSON.stringify(data, null, 2), "utf-8");
}

// ─── In-memory trade rooms ────────────────────────────────────────────────────

interface TradePlayer {
  userId: string;
  displayName: string;
  slotIndex: number | null;
  confirmed: boolean;
}

interface TradeRoom {
  code: string;
  creator: TradePlayer;
  joiner: TradePlayer | null;
  status: "waiting" | "selecting" | "completed" | "cancelled";
  createdAt: number;
}

const rooms = new Map<string, TradeRoom>();

// Clean up rooms older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff) rooms.delete(code);
  }
}, 5 * 60 * 1000);

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function requireAuth(req: any, res: any): string | null {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return auth.userId;
}

// ─── Room view helper ─────────────────────────────────────────────────────────

function roomView(room: TradeRoom, requestingUserId: string) {
  const creatorSave = loadSave(room.creator.userId);
  const joinerSave = room.joiner ? loadSave(room.joiner.userId) : null;

  return {
    code: room.code,
    status: room.status,
    myRole: room.creator.userId === requestingUserId ? "creator" : "joiner",
    creator: {
      displayName: room.creator.displayName,
      slotIndex: room.creator.slotIndex,
      confirmed: room.creator.confirmed,
      slots: creatorSave.slots ?? [],
    },
    joiner: room.joiner
      ? {
          displayName: room.joiner.displayName,
          slotIndex: room.joiner.slotIndex,
          confirmed: room.joiner.confirmed,
          slots: joinerSave?.slots ?? [],
        }
      : null,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/trade/create
router.post("/trade/create", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { displayName = "Trainer" } = req.body as { displayName?: string };

  // Remove any existing rooms this user created
  for (const [code, room] of rooms) {
    if (room.creator.userId === userId && room.status === "waiting") {
      rooms.delete(code);
    }
  }

  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const room: TradeRoom = {
    code,
    creator: { userId, displayName, slotIndex: null, confirmed: false },
    joiner: null,
    status: "waiting",
    createdAt: Date.now(),
  };
  rooms.set(code, room);

  res.json({ code, ...roomView(room, userId) });
});

// POST /api/trade/join
router.post("/trade/join", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { code, displayName = "Trainer" } = req.body as { code: string; displayName?: string };
  const room = rooms.get(code?.toUpperCase());

  if (!room) {
    res.status(404).json({ error: "Room not found. Check the code and try again." });
    return;
  }
  if (room.status !== "waiting") {
    res.status(400).json({ error: "This room is no longer available." });
    return;
  }
  if (room.creator.userId === userId) {
    res.status(400).json({ error: "You cannot join your own room." });
    return;
  }

  room.joiner = { userId, displayName, slotIndex: null, confirmed: false };
  room.status = "selecting";

  res.json(roomView(room, userId));
});

// GET /api/trade/room/:code
router.get("/trade/room/:code", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const room = rooms.get(req.params.code?.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }

  const isParticipant =
    room.creator.userId === userId || room.joiner?.userId === userId;
  if (!isParticipant) {
    res.status(403).json({ error: "You are not part of this trade." });
    return;
  }

  res.json(roomView(room, userId));
});

// POST /api/trade/offer
router.post("/trade/offer", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { code, slotIndex } = req.body as { code: string; slotIndex: number };
  const room = rooms.get(code?.toUpperCase());

  if (!room || room.status !== "selecting") {
    res.status(400).json({ error: "Invalid room or room not in selecting phase." });
    return;
  }

  if (room.creator.userId === userId) {
    room.creator.slotIndex = slotIndex;
    room.creator.confirmed = false;
  } else if (room.joiner?.userId === userId) {
    room.joiner.slotIndex = slotIndex;
    room.joiner.confirmed = false;
  } else {
    res.status(403).json({ error: "Not a participant." });
    return;
  }

  res.json(roomView(room, userId));
});

// POST /api/trade/confirm
router.post("/trade/confirm", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { code } = req.body as { code: string };
  const room = rooms.get(code?.toUpperCase());

  if (!room || room.status !== "selecting") {
    res.status(400).json({ error: "Invalid room or room not in selecting phase." });
    return;
  }
  if (room.creator.slotIndex === null || !room.joiner || room.joiner.slotIndex === null) {
    res.status(400).json({ error: "Both players must select a Pokémon first." });
    return;
  }

  if (room.creator.userId === userId) {
    room.creator.confirmed = true;
  } else if (room.joiner?.userId === userId) {
    room.joiner.confirmed = true;
  } else {
    res.status(403).json({ error: "Not a participant." });
    return;
  }

  // Execute trade when both confirmed
  if (room.creator.confirmed && room.joiner.confirmed) {
    const creatorSave = loadSave(room.creator.userId);
    const joinerSave = loadSave(room.joiner.userId);

    const ci = room.creator.slotIndex;
    const ji = room.joiner.slotIndex;

    const creatorMonster = creatorSave.slots[ci];
    const joinerMonster = joinerSave.slots[ji];

    if (!creatorMonster || !joinerMonster) {
      res.status(400).json({ error: "One of the selected Pokémon no longer exists." });
      return;
    }

    // Swap
    creatorSave.slots[ci] = joinerMonster;
    joinerSave.slots[ji] = creatorMonster;

    // Preserve active slot pointer validity
    if (creatorSave.activeSlot >= creatorSave.slots.length) creatorSave.activeSlot = 0;
    if (joinerSave.activeSlot >= joinerSave.slots.length) joinerSave.activeSlot = 0;

    writeSave(room.creator.userId, creatorSave);
    writeSave(room.joiner.userId, joinerSave);

    room.status = "completed";
  }

  res.json(roomView(room, userId));
});

// POST /api/trade/cancel
router.post("/trade/cancel", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { code } = req.body as { code: string };
  const room = rooms.get(code?.toUpperCase());

  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }

  const isParticipant =
    room.creator.userId === userId || room.joiner?.userId === userId;
  if (!isParticipant) {
    res.status(403).json({ error: "Not a participant." });
    return;
  }

  room.status = "cancelled";
  res.json({ ok: true });
});

export default router;
