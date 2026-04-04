import { Router } from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = path.resolve(__dirname, "..");
const POKEMON_FILE = path.resolve(ARTIFACT_ROOT, "src/data/pokemon.json");

function loadPokemon(): unknown[] {
  const raw = fs.readFileSync(POKEMON_FILE, "utf-8");
  return JSON.parse(raw);
}

router.get("/pokemon", (req, res) => {
  try {
    const pokemon = loadPokemon();
    res.json(pokemon);
  } catch (err) {
    req.log.error({ err }, "Failed to load pokemon");
    res.status(500).json({ error: "Failed to load pokemon database" });
  }
});

router.get("/pokemon/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid pokemon ID" });
      return;
    }
    const pokemon = loadPokemon();
    const found = (pokemon as Array<{ id: number }>).find((p) => p.id === id);
    if (!found) {
      res.status(404).json({ error: `Pokemon #${id} not found` });
      return;
    }
    res.json(found);
  } catch (err) {
    req.log.error({ err }, "Failed to get pokemon");
    res.status(500).json({ error: "Failed to load pokemon database" });
  }
});

export default router;
