// The road.
//
// There is no map to explore. The hero walks a single path that runs along the
// +x axis, seven tiles wide, and everything is generated from the tile
// coordinate itself — so the world is endless and needs no storage. The band
// starts in open daylight and works its way underground.

import { hash2 } from './iso.js';

// Matches the painted road in art/road-graveyard.png exactly (521px of a
// 206px-per-tile lattice), so the hero always walks on the flagstones.
export const HALF = 2.529;
export const VERGE = 9;         // how far past the road we still draw ground

export const BIOMES = [
  {
    key: 'boneyard', name: 'The Boneyard Road', indoors: false,
    // Drawn from art: two repeating ground textures plus a sheet of props the
    // engine scatters itself. Keeping the props separate from the ground is
    // what lets the road run forever without a visible repeat.
    art: {
      grass: 'art/grass.png',
      road: 'art/pavement.png',
      props: 'art/props-graveyard.png', propCols: 4, propRows: 3,
      groundScale: 0.30,   // texture px -> world px
      roadScale: 0.26,
      propScale: 0.31,
      // Which cells of the sheet each scenery slot may use.
      cells: {
        tree:  [0, 1, 2],
        grave: [3, 4, 5],
        bones: [6, 7],
        rock:  [8, 9],
        fence: [10],
        bush:  [11],
      },
      // Flat markings scattered over the road itself. The road is the surface
      // you stare at for the whole march, so breaking it up matters more than
      // any amount of extra verge detail.
      decals: {
        src: 'art/decals.png', cols: 4, rows: 3, scale: 0.30,
        // Weighted, not uniform. Cracks, moss and gravel can sit anywhere
        // without shouting; a mirror-bright puddle or a bloodstain reads as an
        // event, so they stay rare.
        pool: [11, 11, 11, 4, 4, 5, 5, 6, 6, 2, 2, 3, 3, 8, 8, 0, 9, 10, 1, 7],
      },
      // Transition diamonds straddling the road's edge. Measured off the
      // sheet: cell 1 carries its grass on the -y side and cell 2 on the +y
      // side, which are exactly this road's two edges. (Cells 0 and 3 face
      // -x and +x — they'd serve a road running the other way.)
      edges: { src: 'art/road-edges.png', cols: 2, rows: 2, minus: 1, plus: 2, lift: 0 },
      // Rare and large. Repetition reads worst when everything is the same
      // size, so a handful of big pieces does more than a dozen small ones.
      landmarks: [
        { src: 'art/landmarks.png', cols: 2, rows: 2, scale: 0.30 },
        { src: 'art/landmarks-2.png', cols: 2, rows: 2, scale: 0.30 },
      ],
      fill: '#4a5236',
    },
    ground: '#3a4a2c', groundAlt: '#41522f', path: '#8d7c58', pathAlt: '#9a8862',
    sky: ['#4a5236', '#4a5236'], horizon: '#4a5236',
    darkness: 0, tint: 'rgba(255,244,214,.03)', accent: '#e0c463',
    props: ['tree', 'tree', 'grave', 'bones', 'rock', 'fence', 'bush'],
  },
  {
    key: 'grove', name: 'The Elder Wood', indoors: false,
    ground: '#39502f', groundAlt: '#405a34', path: '#6f6247', pathAlt: '#7a6c4f',
    sky: ['#4a6272', '#7d8f8a'], horizon: '#25341f',
    darkness: 0.24, tint: 'rgba(180,210,190,.05)', accent: '#9fd06a',
    props: ['tree', 'tree', 'tree', 'rock', 'bush'],
  },
  {
    key: 'gate', name: 'The Broken Gate', indoors: false,
    ground: '#4a463c', groundAlt: '#535045', path: '#6d6656', pathAlt: '#787060',
    sky: ['#3b3f4c', '#6b6157'], horizon: '#2c2b26',
    darkness: 0.38, tint: 'rgba(255,220,170,.05)', accent: '#c8a24a',
    props: ['pillar', 'rubble', 'pillar', 'banner', 'rock'],
  },
  {
    key: 'crypt', name: 'The Crypt', indoors: true,
    ground: '#2a241c', groundAlt: '#312a20', path: '#463d2e', pathAlt: '#4f4534',
    sky: ['#0a0806', '#0a0806'], horizon: '#0a0806',
    darkness: 0.74, tint: 'rgba(255,190,110,.05)', accent: '#c8a24a',
    props: ['wall', 'wall', 'sconce', 'wall', 'urn'],
  },
  {
    key: 'inferno', name: 'The Inferno', indoors: true,
    ground: '#3a201a', groundAlt: '#44251d', path: '#5a2f24', pathAlt: '#65362a',
    sky: ['#1a0705', '#3a100a'], horizon: '#1a0705',
    darkness: 0.6, tint: 'rgba(255,120,60,.09)', accent: '#ff6a3a',
    props: ['wall', 'sconce', 'rubble', 'wall', 'urn'],
  },
];

export const biomeFor = (stage) => BIOMES[Math.min(BIOMES.length - 1, Math.floor((stage - 1) / 6))];

/**
 * Levels: the named place the hero is walking through right now.
 *
 * One per section, so a level lasts three or four waves and the names come
 * round often enough to mark progress. This is a *label* layer, sitting on top
 * of the biomes — the art and palette still change every six sections, far more
 * slowly, because a repaint is expensive and a name is free. That separation is
 * the point: names can be rewritten or reordered here without touching a single
 * texture.
 *
 * The road is endless and this list is not, so the last name holds once it is
 * reached. The number keeps climbing regardless — "Level 23 · The Inferno" is
 * still a true statement about how far down the hero is.
 */
export const LEVELS = [
  'Outside of a Town',
  'The Open Road',
  'The Killing Fields',
  'Dangerous Cave',
  'The Elder Wood',
  'The Broken Gate',
  'The Sunken Chapel',
  'The Crypt',
  'The Bone Halls',
  'The Inferno',
];

export const levelFor = (section) => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, section - 1))];

// The road is a straight band; only its width constrains anything.
export const walkable = (x, y) => y >= -HALF && y <= HALF;

// Clamp a point back onto the road.
export function onRoad(p) {
  if (p.y < -HALF + 0.2) p.y = -HALF + 0.2;
  else if (p.y > HALF - 0.2) p.y = HALF - 0.2;
  return p;
}

// A road-band object the movement code can share with the old arena API.
export const ROAD = {
  walkable(x, y) { return walkable(x, y); },
};

/**
 * What stands at tile (x, y), if anything. Deterministic, so scenery never
 * pops or shifts as the camera scrolls past it.
 */
export function propAt(x, y, biome) {
  const ay = Math.abs(y);
  if (ay < HALF + 0.6) return null;             // keep the road itself clear
  if (ay > VERGE) return null;

  const h = hash2(x, y);
  const edge = ay < HALF + 1.8;                 // the row right beside the road

  if (biome.indoors) {
    // Indoors the verge is a wall, broken by the occasional sconce or urn.
    if (edge) {
      if (h > 0.93) return 'sconce';
      if (h > 0.88) return 'urn';
      return 'wall';
    }
    return null;
  }

  if (edge && h > 0.9) return biome.props[Math.abs(x * 7 + (y | 0) * 3 + 99) % biome.props.length];
  if (edge) return h > 0.74 ? 'bush' : null;
  if (h > 0.76) return biome.props[Math.abs(x * 3 + (y | 0) * 11 + 7) % biome.props.length];
  return null;
}

/** A flat marking on the road at this tile, or null. */
export function decalAt(x, y, biome) {
  if (!biome.art || !biome.art.decals) return null;
  if (Math.abs(y) > HALF + 1.2) return null;          // road and its lip only
  const h = hash2(x * 13 + 7, y * 5 + 3);
  if (h < 0.945) return null;
  const pool = biome.art.decals.pool;
  return pool[Math.floor(hash2(x + 313, y + 71) * pool.length) % pool.length];
}

/**
 * A landmark at this tile, or null. Kept well off the road and deliberately
 * scarce — one every thirty tiles or so — because their whole job is to be
 * the thing you have not seen for a while.
 */
export function landmarkAt(x, y, biome) {
  const set = biome.art && biome.art.landmarks;
  if (!set) return null;
  const ay = Math.abs(y);
  if (ay < HALF + 2.5 || ay > VERGE - 1) return null;
  if (hash2(x * 29 + 3, y * 17 + 9) < 0.985) return null;
  const si = Math.floor(hash2(x + 5, y + 13) * set.length) % set.length;
  const sheet = set[si];
  const n = sheet.cols * sheet.rows;
  return { sheet, cell: Math.floor(hash2(x + 991, y + 17) * n) % n };
}

// Distance the hero marches between one encounter and the next.
export const MARCH = 7.5;
