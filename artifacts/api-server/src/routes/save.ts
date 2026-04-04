import { Router } from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = path.resolve(__dirname, "..");
const SAVE_FILE = path.resolve(ARTIFACT_ROOT, "src/data/save.json");
const POKEMON_FILE = path.resolve(ARTIFACT_ROOT, "src/data/pokemon.json");

function loadSave(): unknown {
  try {
    const raw = fs.readFileSync(SAVE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { slots: [], activeSlot: 0 };
  }
}

function writeSave(data: unknown): void {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function loadPokemon(): Array<{ id: number }> {
  const raw = fs.readFileSync(POKEMON_FILE, "utf-8");
  return JSON.parse(raw);
}

router.get("/save", (req, res) => {
  try {
    const save = loadSave();
    res.json(save);
  } catch (err) {
    req.log.error({ err }, "Failed to load save data");
    res.status(500).json({ error: "Failed to load save data" });
  }
});

router.post("/save", (req, res) => {
  try {
    const body = req.body;
    writeSave(body);
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
