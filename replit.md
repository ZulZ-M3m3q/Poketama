# Monster Bracelet Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the Monster Bracelet app — a virtual pet game inspired by Vital Bracelet/Tamagotchi with Pokémon-like monsters.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: JSON files (pokemon.json + save.json in artifacts/api-server/src/data/)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion

## Artifacts

- **monster-bracelet** — Main web app at `/` — the virtual pet game UI
- **api-server** — Express API at `/api` — serves Pokémon database and save data

## Key Features

- NFC simulation: Enter codes in `HP/ATK/DEF/SPATK/SPDEF/SPD/POKEDEX` format
- 142+ Pokémon in local JSON database (Gen 1-9 key Pokémon)
- Complete evolution system (1-stage, 2-stage, random, mega)
- Feeding, training with cooldowns
- 6 save slots with active monster selection
- Searchable Pokédex with type filtering

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/monster-bracelet run dev` — run frontend locally

## Data Files

- `artifacts/api-server/src/data/pokemon.json` — local Pokémon database
- `artifacts/api-server/src/data/save.json` — persisted save data

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
