import { Router } from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = path.resolve(__dirname, "..");
const POKEMON_FILE = path.resolve(ARTIFACT_ROOT, "src/data/pokemon.json");

interface PokemonEntry {
  id: number;
  name: string;
  sprite_url: string;
  evolution_chain: number[];
  evolution_stage: string;
  possible_evolutions: number[];
  hasMega: boolean;
  megaForms: { id: string; name: string; sprite_url: string }[];
  types: string[];
  base_stats: {
    hp: number;
    atk: number;
    def: number;
    spatk: number;
    spdef: number;
    spd: number;
  };
}

function loadPokemon(): PokemonEntry[] {
  const raw = fs.readFileSync(POKEMON_FILE, "utf-8");
  return JSON.parse(raw) as PokemonEntry[];
}

router.post("/nfc/parse", (req, res) => {
  try {
    const { code } = req.body as { code?: string };

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing code in request body" });
      return;
    }

    const trimmed = code.trim();
    const parts = trimmed.split("/");

    if (parts.length !== 7) {
      res.status(400).json({
        error: `Invalid NFC code format. Expected HP/ATK/DEF/SPATK/SPDEF/SPD/POKEDEX (7 values separated by /), got ${parts.length} value(s).`,
      });
      return;
    }

    const [hp, atk, def, spatk, spdef, spd, pokedexRaw] = parts.map((p) =>
      parseInt(p.trim(), 10)
    );

    if ([hp, atk, def, spatk, spdef, spd, pokedexRaw].some(isNaN)) {
      res.status(400).json({
        error: "All values in the NFC code must be numbers.",
      });
      return;
    }

    if (
      hp <= 0 || atk <= 0 || def <= 0 || spatk <= 0 || spdef <= 0 || spd <= 0
    ) {
      res.status(400).json({ error: "Stat values must be greater than 0." });
      return;
    }

    const pokemon = loadPokemon();
    const found = pokemon.find((p) => p.id === pokedexRaw);

    if (!found) {
      res.status(404).json({
        error: `No Pokémon found with Pokédex #${pokedexRaw}. Please check your code.`,
      });
      return;
    }

    res.json({
      stats: { hp, atk, def, spatk, spdef, spd },
      pokedexId: found.id,
      pokemon: found,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to parse NFC code");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
