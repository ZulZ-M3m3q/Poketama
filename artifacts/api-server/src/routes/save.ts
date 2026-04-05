import { Router } from "express";
import { getAuth } from "@clerk/express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = path.resolve(__dirname, "..");
const SAVES_DIR = path.resolve(ARTIFACT_ROOT, "src/data/saves");
const POKEMON_FILE = path.resolve(ARTIFACT_ROOT, "src/data/pokemon.json");

// Ensure per-user saves directory exists
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

function getUserSaveFile(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(SAVES_DIR, `${safe}.json`);
}

function loadSave(userId: string): unknown {
  try {
    const file = getUserSaveFile(userId);
    if (!fs.existsSync(file)) return { slots: [], activeSlot: 0 };
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { slots: [], activeSlot: 0 };
  }
}

function writeSave(userId: string, data: unknown): void {
  const file = getUserSaveFile(userId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function loadPokemon(): Array<{ id: number }> {
  const raw = fs.readFileSync(POKEMON_FILE, "utf-8");
  return JSON.parse(raw);
}

router.get("/save", (req, res) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const save = loadSave(userId);
    res.json(save);
  } catch (err) {
    req.log.error({ err }, "Failed to load save data");
    res.status(500).json({ error: "Failed to load save data" });
  }
});

router.post("/save", (req, res) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const body = req.body;
    writeSave(userId, body);
    res.json(body);
  } catch (err) {
    req.log.error({ err }, "Failed to write save data");
    res.status(500).json({ error: "Failed to save data" });
  }
});

router.post("/nfc/parse", (req, res) => {
  try {
    const { code } = req.body as { code: string };
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing NFC code" });
      return;
    }

    const parts = code.trim().split("/");
    if (parts.length < 7) {
      res.status(400).json({
        error: `Invalid NFC format. Expected HP/ATK/DEF/SPATK/SPDEF/SPD/POKEDEX, got ${parts.length} parts`,
      });
      return;
    }

    const [rawHp, rawAtk, rawDef, rawSpatk, rawSpdef, rawSpd, rawPokedex] = parts;

    const hp = parseInt(rawHp, 10);
    const atk = parseInt(rawAtk, 10);
    const def = parseInt(rawDef, 10);
    const spatk = parseInt(rawSpatk, 10);
    const spdef = parseInt(rawSpdef, 10);
    const spd = parseInt(rawSpd, 10);
    const pokedexId = parseInt(rawPokedex, 10);

    if ([hp, atk, def, spatk, spdef, spd, pokedexId].some(isNaN)) {
      res.status(400).json({ error: "All NFC values must be numbers" });
      return;
    }

    const pokemon = loadPokemon();
    const found = pokemon.find((p) => p.id === pokedexId);
    if (!found) {
      res.status(400).json({ error: `Pokemon #${pokedexId} not found in database` });
      return;
    }

    res.json({
      stats: { hp, atk, def, spatk, spdef, spd },
      pokedexId,
      pokemon: found,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to parse NFC code");
    res.status(500).json({ error: "Failed to parse NFC code" });
  }
});

export default router;
