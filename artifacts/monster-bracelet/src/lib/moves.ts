import type { MonsterMove } from "./types";

export const ALL_MOVES: MonsterMove[] = [
  // ── Normal ──────────────────────────────────────────
  { id: "tackle",         name: "Tackle",         type: "normal",   power: 40,  category: "physical", accuracy: 100, description: "A basic tackle attack." },
  { id: "quick_attack",   name: "Quick Attack",   type: "normal",   power: 40,  category: "physical", accuracy: 100, description: "Strikes before the opponent." },
  { id: "body_slam",      name: "Body Slam",      type: "normal",   power: 85,  category: "physical", accuracy: 100, description: "A full-body slam that may paralyze." },
  { id: "hyper_beam",     name: "Hyper Beam",     type: "normal",   power: 150, category: "special",  accuracy: 90,  description: "Fires a powerful beam of energy." },
  { id: "swift",          name: "Swift",          type: "normal",   power: 60,  category: "special",  accuracy: 100, description: "Star-shaped rays that never miss." },
  { id: "double_edge",    name: "Double-Edge",    type: "normal",   power: 120, category: "physical", accuracy: 100, description: "A reckless tackle that also hurts the user." },

  // ── Fire ────────────────────────────────────────────
  { id: "ember",          name: "Ember",          type: "fire",     power: 40,  category: "special",  accuracy: 100, description: "Small embers that may burn." },
  { id: "flame_wheel",    name: "Flame Wheel",    type: "fire",     power: 60,  category: "physical", accuracy: 100, description: "Rolls forward engulfed in flames." },
  { id: "flamethrower",   name: "Flamethrower",   type: "fire",     power: 90,  category: "special",  accuracy: 100, description: "A scorching stream of fire." },
  { id: "fire_blast",     name: "Fire Blast",     type: "fire",     power: 110, category: "special",  accuracy: 85,  description: "An explosive blast of fire." },
  { id: "heat_wave",      name: "Heat Wave",      type: "fire",     power: 95,  category: "special",  accuracy: 90,  description: "Exhales a hot breath at all foes." },
  { id: "inferno",        name: "Inferno",        type: "fire",     power: 100, category: "special",  accuracy: 50,  description: "Burns the target with intense fire." },

  // ── Water ───────────────────────────────────────────
  { id: "water_gun",      name: "Water Gun",      type: "water",    power: 40,  category: "special",  accuracy: 100, description: "Squirts water at the target." },
  { id: "aqua_jet",       name: "Aqua Jet",       type: "water",    power: 40,  category: "physical", accuracy: 100, description: "Attacks with a burst of water, striking first." },
  { id: "water_pulse",    name: "Water Pulse",    type: "water",    power: 60,  category: "special",  accuracy: 100, description: "Pulsing water rings that may confuse." },
  { id: "waterfall",      name: "Waterfall",      type: "water",    power: 80,  category: "physical", accuracy: 100, description: "Charges the foe with a waterfall." },
  { id: "surf",           name: "Surf",           type: "water",    power: 90,  category: "special",  accuracy: 100, description: "A powerful wave that crashes over the foe." },
  { id: "hydro_pump",     name: "Hydro Pump",     type: "water",    power: 110, category: "special",  accuracy: 80,  description: "Blasts a huge volume of water." },

  // ── Grass ───────────────────────────────────────────
  { id: "vine_whip",      name: "Vine Whip",      type: "grass",    power: 45,  category: "physical", accuracy: 100, description: "Strikes with long vines." },
  { id: "razor_leaf",     name: "Razor Leaf",     type: "grass",    power: 55,  category: "physical", accuracy: 95,  description: "Sharp leaves slashed at high speed." },
  { id: "giga_drain",     name: "Giga Drain",     type: "grass",    power: 75,  category: "special",  accuracy: 100, description: "Drains HP from the target." },
  { id: "energy_ball",    name: "Energy Ball",    type: "grass",    power: 90,  category: "special",  accuracy: 100, description: "Draws power from nature for a ball of energy." },
  { id: "leaf_blade",     name: "Leaf Blade",     type: "grass",    power: 90,  category: "physical", accuracy: 100, description: "Slashes with a sharp leaf." },
  { id: "solar_beam",     name: "Solar Beam",     type: "grass",    power: 120, category: "special",  accuracy: 100, description: "Absorbs sunlight then fires a beam." },

  // ── Electric ────────────────────────────────────────
  { id: "thunder_shock",  name: "ThunderShock",   type: "electric", power: 40,  category: "special",  accuracy: 100, description: "An electric jolt that may paralyze." },
  { id: "spark",          name: "Spark",          type: "electric", power: 65,  category: "physical", accuracy: 100, description: "An electrified tackle." },
  { id: "thunderbolt",    name: "Thunderbolt",    type: "electric", power: 90,  category: "special",  accuracy: 100, description: "A strong electric blast." },
  { id: "wild_charge",    name: "Wild Charge",    type: "electric", power: 90,  category: "physical", accuracy: 100, description: "Charges while cloaked in electricity." },
  { id: "thunder",        name: "Thunder",        type: "electric", power: 110, category: "special",  accuracy: 70,  description: "A massive lightning bolt strike." },
  { id: "volt_tackle",    name: "Volt Tackle",    type: "electric", power: 120, category: "physical", accuracy: 100, description: "Charges while cloaked in electricity at full force." },

  // ── Psychic ─────────────────────────────────────────
  { id: "confusion",      name: "Confusion",      type: "psychic",  power: 50,  category: "special",  accuracy: 100, description: "A weak psychic attack that may confuse." },
  { id: "psybeam",        name: "Psybeam",        type: "psychic",  power: 65,  category: "special",  accuracy: 100, description: "An odd beam that may confuse the target." },
  { id: "psychic_move",   name: "Psychic",        type: "psychic",  power: 90,  category: "special",  accuracy: 100, description: "A powerful psychic attack." },
  { id: "psystrike",      name: "Psystrike",      type: "psychic",  power: 100, category: "special",  accuracy: 100, description: "Materializes psychic waves that hit physically." },
  { id: "future_sight",   name: "Future Sight",   type: "psychic",  power: 120, category: "special",  accuracy: 100, description: "Sees the future and lands a hit later." },
  { id: "stored_power",   name: "Stored Power",   type: "psychic",  power: 60,  category: "special",  accuracy: 100, description: "Attacks using stored power." },

  // ── Ice ─────────────────────────────────────────────
  { id: "powder_snow",    name: "Powder Snow",    type: "ice",      power: 40,  category: "special",  accuracy: 100, description: "Blasts the foe with icy snow." },
  { id: "ice_punch",      name: "Ice Punch",      type: "ice",      power: 75,  category: "physical", accuracy: 100, description: "Punches with an icy fist." },
  { id: "avalanche",      name: "Avalanche",      type: "ice",      power: 60,  category: "physical", accuracy: 100, description: "Deals more damage if hit first." },
  { id: "freeze_dry",     name: "Freeze-Dry",     type: "ice",      power: 70,  category: "special",  accuracy: 100, description: "Supercools the foe — super effective on Water." },
  { id: "ice_beam",       name: "Ice Beam",       type: "ice",      power: 90,  category: "special",  accuracy: 100, description: "Blasts the foe with an icy beam." },
  { id: "blizzard",       name: "Blizzard",       type: "ice",      power: 110, category: "special",  accuracy: 70,  description: "Whips up a fierce snowstorm." },

  // ── Dragon ──────────────────────────────────────────
  { id: "dragon_breath",  name: "DragonBreath",   type: "dragon",   power: 60,  category: "special",  accuracy: 100, description: "Exhales a mighty draconic breath." },
  { id: "dragon_pulse",   name: "Dragon Pulse",   type: "dragon",   power: 85,  category: "special",  accuracy: 100, description: "Attacks with a pulsing draconic wave." },
  { id: "dragon_claw",    name: "Dragon Claw",    type: "dragon",   power: 80,  category: "physical", accuracy: 100, description: "Slashes with sharp draconic claws." },
  { id: "dragon_rush",    name: "Dragon Rush",    type: "dragon",   power: 100, category: "physical", accuracy: 75,  description: "Charges forward with draconic force." },
  { id: "outrage",        name: "Outrage",        type: "dragon",   power: 120, category: "physical", accuracy: 100, description: "Rampages and thrashes for several turns." },
  { id: "draco_meteor",   name: "Draco Meteor",   type: "dragon",   power: 130, category: "special",  accuracy: 90,  description: "Comets fall from the sky with awesome force." },

  // ── Dark ────────────────────────────────────────────
  { id: "bite",           name: "Bite",           type: "dark",     power: 60,  category: "physical", accuracy: 100, description: "Bites with dark fangs, may cause flinching." },
  { id: "snarl",          name: "Snarl",          type: "dark",     power: 55,  category: "special",  accuracy: 95,  description: "Snarls to lower the foe's Sp. Atk." },
  { id: "night_slash",    name: "Night Slash",    type: "dark",     power: 70,  category: "physical", accuracy: 100, description: "Slashes in darkness with high critical rate." },
  { id: "crunch",         name: "Crunch",         type: "dark",     power: 80,  category: "physical", accuracy: 100, description: "Crunches with sharp fangs." },
  { id: "dark_pulse",     name: "Dark Pulse",     type: "dark",     power: 80,  category: "special",  accuracy: 100, description: "Emits a horrible aura of darkness." },
  { id: "foul_play",      name: "Foul Play",      type: "dark",     power: 95,  category: "physical", accuracy: 100, description: "Uses the foe's own power against it." },

  // ── Ghost ───────────────────────────────────────────
  { id: "lick",           name: "Lick",           type: "ghost",    power: 30,  category: "physical", accuracy: 100, description: "Licks with a ghost tongue, may paralyze." },
  { id: "shadow_punch",   name: "Shadow Punch",   type: "ghost",    power: 60,  category: "physical", accuracy: 100, description: "Throws a punch from the shadows, never misses." },
  { id: "hex",            name: "Hex",            type: "ghost",    power: 65,  category: "special",  accuracy: 100, description: "Doubles power on status-afflicted foes." },
  { id: "shadow_claw",    name: "Shadow Claw",    type: "ghost",    power: 70,  category: "physical", accuracy: 100, description: "Slashes with a shadowy claw." },
  { id: "shadow_ball",    name: "Shadow Ball",    type: "ghost",    power: 80,  category: "special",  accuracy: 100, description: "Hurls a shadowy blob at the foe." },
  { id: "phantom_force",  name: "Phantom Force",  type: "ghost",    power: 90,  category: "physical", accuracy: 100, description: "Vanishes and strikes next turn." },

  // ── Poison ──────────────────────────────────────────
  { id: "poison_sting",   name: "Poison Sting",   type: "poison",   power: 15,  category: "physical", accuracy: 100, description: "Stings with a poison barb." },
  { id: "sludge",         name: "Sludge",         type: "poison",   power: 65,  category: "special",  accuracy: 100, description: "Hurls unsanitary sludge at the foe." },
  { id: "venoshock",      name: "Venoshock",      type: "poison",   power: 65,  category: "special",  accuracy: 100, description: "Drenches the foe in poison." },
  { id: "cross_poison",   name: "Cross Poison",   type: "poison",   power: 70,  category: "physical", accuracy: 100, description: "A slashing attack that may poison." },
  { id: "poison_jab",     name: "Poison Jab",     type: "poison",   power: 80,  category: "physical", accuracy: 100, description: "Stabs with a poison-coated arm." },
  { id: "sludge_bomb",    name: "Sludge Bomb",    type: "poison",   power: 90,  category: "special",  accuracy: 100, description: "Shoots grimy sludge at the foe." },

  // ── Fighting ────────────────────────────────────────
  { id: "karate_chop",    name: "Karate Chop",    type: "fighting", power: 50,  category: "physical", accuracy: 100, description: "A chopping attack with high critical rate." },
  { id: "brick_break",    name: "Brick Break",    type: "fighting", power: 75,  category: "physical", accuracy: 100, description: "Breaks barriers and deals damage." },
  { id: "aura_sphere",    name: "Aura Sphere",    type: "fighting", power: 80,  category: "special",  accuracy: 100, description: "Fires a sphere of aura energy that never misses." },
  { id: "low_kick",       name: "Low Kick",       type: "fighting", power: 80,  category: "physical", accuracy: 100, description: "Sweeps the foe's legs." },
  { id: "superpower",     name: "Superpower",     type: "fighting", power: 120, category: "physical", accuracy: 100, description: "Attacks with incredible power." },
  { id: "close_combat",   name: "Close Combat",   type: "fighting", power: 120, category: "physical", accuracy: 100, description: "Fights at close range, lowering own defenses." },

  // ── Ground ──────────────────────────────────────────
  { id: "mud_shot",       name: "Mud Shot",       type: "ground",   power: 55,  category: "special",  accuracy: 95,  description: "Hurls mud to reduce the foe's speed." },
  { id: "bulldoze",       name: "Bulldoze",       type: "ground",   power: 60,  category: "physical", accuracy: 100, description: "Stomps down to shake the ground." },
  { id: "mud_bomb",       name: "Mud Bomb",       type: "ground",   power: 65,  category: "special",  accuracy: 85,  description: "Throws a ball of mud at the foe." },
  { id: "earth_power",    name: "Earth Power",    type: "ground",   power: 90,  category: "special",  accuracy: 100, description: "Makes the ground erupt with power." },
  { id: "earthquake",     name: "Earthquake",     type: "ground",   power: 100, category: "physical", accuracy: 100, description: "A violent magnitude-10 quake." },
  { id: "precipice_blades",name:"Precipice Blades",type:"ground",   power: 120, category: "physical", accuracy: 85,  description: "Sharply raises the ground to strike." },

  // ── Rock ────────────────────────────────────────────
  { id: "rock_throw",     name: "Rock Throw",     type: "rock",     power: 50,  category: "physical", accuracy: 90,  description: "Throws a small rock at the foe." },
  { id: "ancient_power",  name: "Ancient Power",  type: "rock",     power: 60,  category: "special",  accuracy: 100, description: "Attacks with a primal power." },
  { id: "rock_slide",     name: "Rock Slide",     type: "rock",     power: 75,  category: "physical", accuracy: 90,  description: "Large rocks are hurled at the foe." },
  { id: "power_gem",      name: "Power Gem",      type: "rock",     power: 80,  category: "special",  accuracy: 100, description: "Attacks with a ray of light from gemstones." },
  { id: "stone_edge",     name: "Stone Edge",     type: "rock",     power: 100, category: "physical", accuracy: 80,  description: "Stabs with a sharp stone." },
  { id: "head_smash",     name: "Head Smash",     type: "rock",     power: 150, category: "physical", accuracy: 80,  description: "Attacks by smashing the head with rocks." },

  // ── Steel ───────────────────────────────────────────
  { id: "metal_claw",     name: "Metal Claw",     type: "steel",    power: 50,  category: "physical", accuracy: 95,  description: "Scratches with metal claws." },
  { id: "steel_wing",     name: "Steel Wing",     type: "steel",    power: 70,  category: "physical", accuracy: 90,  description: "Strikes with hardened wings." },
  { id: "iron_head",      name: "Iron Head",      type: "steel",    power: 80,  category: "physical", accuracy: 100, description: "Slams the foe with a hard head." },
  { id: "flash_cannon",   name: "Flash Cannon",   type: "steel",    power: 80,  category: "special",  accuracy: 100, description: "Fires a flash of steel energy." },
  { id: "meteor_mash",    name: "Meteor Mash",    type: "steel",    power: 90,  category: "physical", accuracy: 90,  description: "Hits with a meteor-like punch." },
  { id: "iron_tail",      name: "Iron Tail",      type: "steel",    power: 100, category: "physical", accuracy: 75,  description: "Strikes with a hard steel tail." },

  // ── Flying ──────────────────────────────────────────
  { id: "gust",           name: "Gust",           type: "flying",   power: 40,  category: "special",  accuracy: 100, description: "Blows away the foe with a gust of wind." },
  { id: "wing_attack",    name: "Wing Attack",    type: "flying",   power: 60,  category: "physical", accuracy: 100, description: "Strikes with a sharp wing." },
  { id: "aerial_ace",     name: "Aerial Ace",     type: "flying",   power: 60,  category: "physical", accuracy: 100, description: "An aerial attack that never misses." },
  { id: "air_slash",      name: "Air Slash",      type: "flying",   power: 75,  category: "special",  accuracy: 95,  description: "Slashes with a blade of air." },
  { id: "hurricane",      name: "Hurricane",      type: "flying",   power: 110, category: "special",  accuracy: 70,  description: "Traps the foe in a hurricane." },
  { id: "brave_bird",     name: "Brave Bird",     type: "flying",   power: 120, category: "physical", accuracy: 100, description: "Dives at full speed at the foe." },

  // ── Bug ─────────────────────────────────────────────
  { id: "fury_cutter",    name: "Fury Cutter",    type: "bug",      power: 40,  category: "physical", accuracy: 95,  description: "Slashes repeatedly with increasing power." },
  { id: "bug_bite",       name: "Bug Bite",       type: "bug",      power: 60,  category: "physical", accuracy: 100, description: "Bites the foe." },
  { id: "signal_beam",    name: "Signal Beam",    type: "bug",      power: 75,  category: "special",  accuracy: 100, description: "A sinister beam that may confuse." },
  { id: "x_scissor",      name: "X-Scissor",      type: "bug",      power: 80,  category: "physical", accuracy: 100, description: "Slashes with crossed scythes." },
  { id: "bug_buzz",       name: "Bug Buzz",       type: "bug",      power: 90,  category: "special",  accuracy: 100, description: "A damaging sound wave from vibrating wings." },
  { id: "first_impression",name:"First Impression",type:"bug",       power: 90,  category: "physical", accuracy: 100, description: "Strikes hard on the first turn." },

  // ── Fairy ───────────────────────────────────────────
  { id: "draining_kiss",  name: "Draining Kiss",  type: "fairy",    power: 50,  category: "special",  accuracy: 100, description: "Steals HP with a draining kiss." },
  { id: "dazzling_gleam", name: "Dazzling Gleam", type: "fairy",    power: 80,  category: "special",  accuracy: 100, description: "Emits a powerful flash that damages the foe." },
  { id: "play_rough",     name: "Play Rough",     type: "fairy",    power: 90,  category: "physical", accuracy: 90,  description: "Plays rough with the foe using force." },
  { id: "moonblast",      name: "Moonblast",      type: "fairy",    power: 95,  category: "special",  accuracy: 100, description: "Borrows the moon's power to attack." },
  { id: "sparkling_aria", name: "Sparkling Aria", type: "fairy",    power: 90,  category: "special",  accuracy: 100, description: "Sings with a ringing soprano voice." },
  { id: "geomancy",       name: "Geomancy",       type: "fairy",    power: 80,  category: "special",  accuracy: 100, description: "Absorbs the earth's power and unleashes it." },
];

export const MOVES_BY_ID = Object.fromEntries(ALL_MOVES.map((m) => [m.id, m]));

export const MOVES_BY_TYPE: Record<string, MonsterMove[]> = {};
for (const move of ALL_MOVES) {
  if (!MOVES_BY_TYPE[move.type]) MOVES_BY_TYPE[move.type] = [];
  MOVES_BY_TYPE[move.type].push(move);
}

interface TypeMatchup {
  super?: string[];
  resist?: string[];
  immune?: string[];
}

export const TYPE_CHART: Record<string, TypeMatchup> = {
  normal:   { resist: ["rock", "steel"],                             immune: ["ghost"] },
  fire:     { super: ["grass","ice","bug","steel"],                  resist: ["fire","water","rock","dragon"] },
  water:    { super: ["fire","ground","rock"],                       resist: ["water","grass","dragon"] },
  grass:    { super: ["water","ground","rock"],                      resist: ["fire","grass","poison","flying","bug","dragon","steel"] },
  electric: { super: ["water","flying"],                             resist: ["grass","electric","dragon"], immune: ["ground"] },
  ice:      { super: ["grass","ground","flying","dragon"],           resist: ["water","ice","steel"] },
  fighting: { super: ["normal","ice","rock","dark","steel"],         resist: ["poison","flying","psychic","bug","fairy"], immune: ["ghost"] },
  poison:   { super: ["grass","fairy"],                              resist: ["poison","ground","rock","ghost"],            immune: ["steel"] },
  ground:   { super: ["fire","electric","poison","rock","steel"],    resist: ["grass","bug"],                               immune: ["flying"] },
  flying:   { super: ["grass","fighting","bug"],                     resist: ["electric","rock","steel"] },
  psychic:  { super: ["fighting","poison"],                          resist: ["psychic","steel"],                           immune: ["dark"] },
  bug:      { super: ["grass","psychic","dark"],                     resist: ["fire","fighting","flying","ghost","steel","fairy"] },
  rock:     { super: ["fire","ice","flying","bug"],                  resist: ["fighting","ground","steel"] },
  ghost:    { super: ["psychic","ghost"],                            resist: ["dark"],                                      immune: ["normal","fighting"] },
  dragon:   { super: ["dragon"],                                     resist: ["steel"],                                     immune: ["fairy"] },
  dark:     { super: ["psychic","ghost"],                            resist: ["fighting","dark","fairy"] },
  steel:    { super: ["ice","rock","fairy"],                         resist: ["fire","water","electric","steel"] },
  fairy:    { super: ["fighting","dragon","dark"],                   resist: ["fire","poison","steel"] },
};

export function getEffectiveness(attackType: string, defTypes: string[]): number {
  const matchup = TYPE_CHART[attackType] ?? {};
  let mult = 1;
  for (const dt of defTypes) {
    if (matchup.immune?.includes(dt)) return 0;
    if (matchup.super?.includes(dt)) mult *= 2;
    if (matchup.resist?.includes(dt)) mult *= 0.5;
  }
  return mult;
}

export function getMovesForTypes(types: string[], count = 4, exclude: string[] = []): MonsterMove[] {
  const pool: MonsterMove[] = [];
  for (const t of types) {
    const typeMoves = MOVES_BY_TYPE[t] ?? [];
    pool.push(...typeMoves.filter((m) => !exclude.includes(m.id)));
  }
  // Dedupe
  const unique = [...new Map(pool.map((m) => [m.id, m])).values()];
  // Shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, count);
}
