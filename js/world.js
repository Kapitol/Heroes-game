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
    key: 'town', name: 'Outside of a Town', indoors: false,
    // Weather is read by js/particles.js: tex names a cell of art/particles.png,
    // wind is tiles/s along the road, rise is height px/s, rate is spawns/s.
    weather: [{ tex: 'glow', tint: 'rgba(255,238,190,.35)', add: true, rate: 1.2, wind: 0.06, rise: 4, size: 5, life: 7, high: true }],
    // The first thing anyone sees, and the only stretch drawn in daylight.
    art: {
      grass: 'art/grass-town.png',
      road: 'art/road-town.png',
      // Sliced by content, and `minCell` earns its keep here: the sheet came
      // back with a 6x65 sliver of stray paint between two props, which the
      // gutter finder counted as a thirteenth object and which would have
      // shifted every slot after it by one. Anything under a tenth of the
      // median cell is debris, and no real prop on this sheet ever is.
      props: 'art/props-town.png', propCols: 4, propRows: 3,
      propSlice: { auto: true, minCell: 0.12 },
      groundScale: 0.30,
      roadScale: 0.26,
      propScale: 0.31,
      cells: {
        tree:  [0, 1, 2],
        grave: [3, 4, 5],
        bones: [6, 7],
        rock:  [8, 9],
        fence: [10],
        bush:  [11],
      },
      decals: {
        src: 'art/decals-town.png', cols: 4, rows: 3, scale: 0.30,
        pool: [11, 11, 11, 4, 4, 5, 5, 6, 6, 2, 2, 3, 3, 8, 8, 0, 9, 10, 1, 7],
      },
      // One windmill (or gallows, or shrine) every 34 tiles of road. The hero
      // marches MARCH=7.5 tiles between encounters, so that is roughly one
      // landmark every four or five fights — seldom enough to be an event.
      landmarkEvery: 34,
      landmarks: [
        { src: 'art/landmarks-town.png', cols: 2, rows: 2, scale: 0.30 },
      ],
      fill: '#6f6a48',
    },
    ground: '#5f6440', groundAlt: '#686d47', path: '#8d7c58', pathAlt: '#9a8862',
    sky: ['#6f6a48', '#6f6a48'], horizon: '#6f6a48',
    darkness: 0, tint: 'rgba(255,244,214,.03)', accent: '#e0c463',
    props: [
      { name: 'fence', tier: 'feature', every: 15 },
      { name: 'grave', tier: 'feature', every: 23 },
      { name: 'tree', tier: 'scatter', density: 3, edge: 'never' },
      { name: 'bones', tier: 'scatter', density: 1 },
      { name: 'rock', tier: 'scatter', density: 1 },
      { name: 'bush', tier: 'scatter', density: 2, edge: 'only' },
    ],
  },
  {
    key: 'boneyard', name: 'The Boneyard Road', indoors: false,
    weather: [{ tex: 'smoke', tint: 'rgba(150,150,140,.22)', rate: 1.4, wind: 0.22, rise: 2, size: 14, life: 7 }],
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
    props: [
      { name: 'grave', tier: 'feature', every: 13 },
      { name: 'fence', tier: 'feature', every: 26 },
      { name: 'tree', tier: 'scatter', density: 2, edge: 'never' },
      { name: 'bones', tier: 'scatter', density: 3 },
      { name: 'rock', tier: 'scatter', density: 1 },
      { name: 'bush', tier: 'scatter', density: 2, edge: 'only' },
    ],
  },
  {
    key: 'grove', name: 'The Elder Wood', indoors: false,
    weather: [{ tex: 'wisp', tint: 'rgba(170,210,150,.3)', rate: 1.6, wind: -0.12, rise: 2, size: 8, life: 8, high: true }],
    ground: '#39502f', groundAlt: '#405a34', path: '#6f6247', pathAlt: '#7a6c4f',
    sky: ['#4a6272', '#7d8f8a'], horizon: '#25341f',
    darkness: 0.24, tint: 'rgba(180,210,190,.05)', accent: '#9fd06a',
    props: [
      { name: 'tree', tier: 'scatter', density: 5, edge: 'never' },
      { name: 'rock', tier: 'scatter', density: 1 },
      { name: 'bush', tier: 'scatter', density: 3, edge: 'only' },
    ],
    scatter: 0.34,   // a wood is thicker than a roadside
  },
  {
    key: 'gate', name: 'The Broken Gate', indoors: false,
    weather: [{ tex: 'smoke', tint: 'rgba(120,110,96,.28)', rate: 2, wind: 0.3, rise: 3, size: 16, life: 6 }],
    ground: '#4a463c', groundAlt: '#535045', path: '#6d6656', pathAlt: '#787060',
    sky: ['#3b3f4c', '#6b6157'], horizon: '#2c2b26',
    darkness: 0.38, tint: 'rgba(255,220,170,.05)', accent: '#c8a24a',
    props: [
      { name: 'pillar', tier: 'feature', every: 11 },
      { name: 'banner', tier: 'feature', every: 19 },
      { name: 'rubble', tier: 'scatter', density: 3 },
      { name: 'rock', tier: 'scatter', density: 2 },
    ],
  },
  {
    key: 'crypt', name: 'The Crypt', indoors: true,
    weather: [{ tex: 'glow', tint: 'rgba(160,190,220,.25)', add: true, rate: 0.8, rise: 3, size: 4, life: 9, high: true }],
    ground: '#2a241c', groundAlt: '#312a20', path: '#463d2e', pathAlt: '#4f4534',
    sky: ['#0a0806', '#0a0806'], horizon: '#0a0806',
    darkness: 0.74, tint: 'rgba(255,190,110,.05)', accent: '#c8a24a',
    props: ['wall', 'wall', 'sconce', 'wall', 'urn'],
  },
  {
    key: 'inferno', name: 'The Inferno', indoors: true,
    // Two entries, and the difference between them is the whole effect: ash is
    // dark, slow, windborne and composited normally, so the lighting dims it
    // with the world; embers are bright, quick, rising and additive.
    weather: [
      { tex: 'smoke', tint: 'rgba(46,38,34,.55)', rate: 5, wind: 0.55, rise: 6, size: 13, life: 6, high: true },
      { tex: 'spark', tint: 'rgba(255,150,60,.8)', add: true, rate: 1.6, wind: 0.25, rise: 26, size: 4, life: 3 },
    ],
    // Painted, like the boneyard, and its sheet is laid out to match: three
    // uprights, three of the tall thing, two low spills, two boulders, a wall
    // and a bush. Only the names changed.
    art: {
      grass: 'art/grass-inferno.png',
      road: 'art/road-inferno.png',
      // Not a lattice. The rows hold 3, 3, 4 and 2 objects, so a uniform grid
      // cuts the shards in half — this one is sliced by its gutters.
      props: 'art/props-inferno.png', propCols: 4, propRows: 3,
      propSlice: { auto: true, minCell: 0.12 },
      groundScale: 0.30,
      roadScale: 0.26,
      roadShade: 'rgba(6,2,0,.42)',
      roadFeather: 22,    // px the scorch carries past the paint, in world units
      // Give most of the width back to the lava. The path here is a scorched
      // line through a burning field, not a highway — and the field is the
      // half of this biome worth looking at.
      roadInset: 0.7,
      propScale: 0.31,
      cells: {
        shard:   [0, 1, 2],
        brazier: [3, 4, 5],
        slag:    [6],
        bones:   [7],
        rock:    [8, 9],
        wall:    [10],
        bush:    [11],
      },
      // Same reasoning as the boneyard: the quiet marks carry the weight and
      // anything that glows stays rare, because down here a lit crack in the
      // road reads as something about to happen.
      decals: {
        src: 'art/decals-inferno.png', cols: 4, rows: 3, scale: 0.30,
        pool: [11, 11, 11, 9, 9, 9, 6, 6, 3, 3, 1, 1, 7, 8, 2, 0, 10, 4, 5],
      },
      // No transition tiles for this biome — the road is basalt and the verge
      // is the same rock lit from inside, so the two meet without a seam worth
      // hiding. The fallback line in the renderer is enough.
      landmarks: [
        { src: 'art/landmarks-inferno.png', cols: 2, rows: 2, scale: 0.30 },
      ],
      fill: '#1c0a06',
    },
    ground: '#3a201a', groundAlt: '#44251d', path: '#5a2f24', pathAlt: '#65362a',
    sky: ['#1a0705', '#3a100a'], horizon: '#1a0705',
    darkness: 0.6, tint: 'rgba(255,120,60,.09)', accent: '#ff6a3a',
    props: [
      // A brazier is in `lights` below: this number is how far apart the fires
      // stand, which is a lighting decision as much as a scenery one.
      { name: 'brazier', tier: 'feature', every: 17 },
      { name: 'shard', tier: 'scatter', density: 3, edge: 'never' },
      { name: 'slag', tier: 'scatter', density: 2 },
      { name: 'rock', tier: 'scatter', density: 2 },
      { name: 'bones', tier: 'scatter', density: 1 },
      { name: 'bush', tier: 'scatter', density: 1, edge: 'only' },
    ],
    // The braziers are this biome's sconces: the renderer hangs a warm light on
    // every one it finds, which is most of what makes the cavern read as lit
    // rather than merely dark.
    lights: ['brazier'],
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
 *
 * `area` is the art set the level is dressed from — its ground, its props and
 * the camp you sit in before walking it. It is a slug rather than a path
 * because every sheet for an area is `<kind>-<area>.png`, so one word names the
 * lot and a set can be dropped in without touching anything but this column.
 *
 * Each level is also a place on `art/world-map.png`, and `at` is where it sits
 * on that image as a fraction of its width and height. Fractions rather than
 * pixels so the map can be drawn at any size — it is shown scaled to fit a
 * panel, and a pin measured in pixels would slide off it. Replacing the art
 * means retyping these ten pairs and nothing else.
 *
 * The order is a journey with a shape: it starts at the village in the
 * south-east and works north and west, through the battlefield and the cave and
 * the drowned chapel, ending in the volcano in the far corner. Read down the
 * list and you are reading the run.
 */
export const LEVELS = [
  { name: 'Outside of a Town', area: 'town', at: [0.805, 0.825] },  // the palisaded village and its windmill
  { name: 'The Open Road', area: 'openroad', at: [0.565, 0.715] },  // the wayside cross and shrine
  { name: 'The Killing Fields', area: 'fields', at: [0.630, 0.555] },  // the drowned field of spears
  { name: 'Dangerous Cave', area: 'cave', at: [0.622, 0.365] },  // the black mouth in the rock
  { name: 'The Elder Wood', area: 'wood', at: [0.495, 0.175] },  // the stand of dead white trees
  { name: 'The Broken Gate', area: 'gate', at: [0.370, 0.435] },  // the split gatehouse towers
  { name: 'The Sunken Chapel', area: 'chapel', at: [0.198, 0.560] },  // the drowned church in the lake
  { name: 'The Crypt', area: 'crypt', at: [0.180, 0.375] },  // the walled graveyard
  { name: 'The Bone Halls', area: 'bonehalls', at: [0.212, 0.212] },  // the ring of standing stones
  { name: 'The Inferno', area: 'inferno', at: [0.130, 0.070] },  // the crater bleeding lava
];

export const levelAt = (section) =>
  LEVELS[Math.min(LEVELS.length - 1, Math.max(0, section - 1))];

export const levelFor = (section) => levelAt(section).name;

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

// --- the placement grammar ---------------------------------------------------
//
// Three tiers, and what separates them is frequency discipline:
//
//   landmark   one per window of road, from the landmark sheets. The windmill.
//              Its whole job is to be the thing you have not seen for a while.
//   feature    one per window, from the prop sheet. Fences, braziers, pillars —
//              big enough, or bright enough, that two on one screen is clutter.
//   scatter    a fraction of verge tiles, weighted per prop. Trees, stones,
//              bones, grass. The old behaviour, now with the number written down.
//
// **Every rule here is arithmetic on the tile coordinate.** `propAt` runs for
// every visible tile every frame, so anything that remembers what it placed
// last makes scenery appear and vanish as the camera moves. A minimum gap is
// therefore a *slot* — the road cut into fixed windows, one object per window,
// its position inside the window hashed — and never a scan of neighbours.

const SCATTER = 0.24;        // fraction of open verge tiles carrying something
const EDGE_SCATTER = 0.26;   // the row beside the road, which runs busier

/**
 * The one tile inside this object's window, or null.
 *
 * `x / every` names the window; the hash decides where in it the object sits,
 * which side of the road it stands on, and how far back.
 *
 * **The position is confined to the middle half of its window**, and that is
 * the difference between a guarantee and an average. Allowed anywhere in the
 * window, one object can sit at the end of its own and the next at the start
 * of the following one — measured over four thousand tiles, that produced a
 * real gap of *one tile* for every kind, which is precisely the crowding this
 * tier exists to prevent. Confined, the worst case is half a window: fences
 * every fifteen tiles are never closer than eight.
 */
function slotAt(x, y, every, salt, near = HALF + 1.5, far = VERGE - 1) {
  const n = Math.max(2, Math.round(every));
  const slot = Math.floor(x / n);
  const lo = Math.floor(n * 0.25);
  const span = Math.max(1, Math.floor(n * 0.5));
  if (x !== slot * n + lo + Math.floor(hash2(slot, salt) * span)) return null;
  const side = hash2(slot, salt + 1) < 0.5 ? -1 : 1;
  const band = Math.round(near + hash2(slot, salt + 2) * Math.max(0, far - near));
  return y === side * band ? slot : null;
}

/**
 * A biome's prop list, sorted into tiers once and cached.
 *
 * Built lazily and held on a WeakMap because `propAt` is one of the hottest
 * functions in the frame: filtering the list per tile would allocate a few
 * hundred arrays a frame to answer a question whose answer never changes.
 *
 * A bare string is a scatter prop of weight 1, which is what every biome used
 * to be — and repeating a name is still how a pool says "more of these".
 */
const GRAMMAR = new WeakMap();

function grammar(biome) {
  let g = GRAMMAR.get(biome);
  if (g) return g;
  const entries = (biome.props || []).map((e) => (typeof e === 'string'
    ? { name: e, tier: 'scatter', density: 1 }
    : { tier: 'scatter', density: 1, ...e }));
  // `edge` is a preference about the row beside the road: 'only' for low things
  // that dress the verge, 'never' for anything tall enough to crowd it.
  const fits = (e, edge) => e.tier === 'scatter'
    && (e.edge === 'only' ? edge : e.edge === 'never' ? !edge : true);
  g = {
    features: entries.filter((e) => e.tier === 'feature'),
    edge: entries.filter((e) => fits(e, true)),
    open: entries.filter((e) => fits(e, false)),
    scatter: biome.scatter ?? SCATTER,
    edgeScatter: biome.edgeScatter ?? EDGE_SCATTER,
  };
  GRAMMAR.set(biome, g);
  return g;
}

/** Weighted choice from a tier, by a roll already made. */
function pick(list, r) {
  let total = 0;
  for (const e of list) total += e.density;
  let acc = r * total;
  for (const e of list) { acc -= e.density; if (acc <= 0) return e.name; }
  return list[list.length - 1].name;
}

/**
 * What stands at tile (x, y), if anything. Deterministic, so scenery never
 * pops or shifts as the camera scrolls past it.
 */
export function propAt(x, y, biome) {
  const ay = Math.abs(y);
  if (ay < HALF + 0.6) return null;             // keep the road itself clear
  if (ay > VERGE) return null;

  // Indoors *and unpainted* means a corridor: the vector renderer has a wall
  // piece and nothing else, so the verge has to be built out of it. A painted
  // indoor biome brings its own scenery and gets the open scatter instead —
  // the inferno is a cavern, not a hallway, and walling it in would throw away
  // eleven of its twelve props.
  if (biome.indoors && !biome.art) {
    // Indoors the verge is a wall, broken by the occasional sconce or urn.
    const h = hash2(x, y);
    if (ay < HALF + 1.8) {
      if (h > 0.93) return 'sconce';
      if (h > 0.88) return 'urn';
      return 'wall';
    }
    return null;
  }

  // A landmark clears its own tile. They are drawn from a separate pass, so
  // without this a windmill gets a tree standing inside it.
  if (landmarkAt(x, y, biome)) return null;

  const g = grammar(biome);
  // Features outrank scatter: a brazier is not overwritten by grass, and
  // earlier entries outrank later ones where two windows collide.
  for (let i = 0; i < g.features.length; i++) {
    const e = g.features[i];
    if (slotAt(x, y, e.every || 18, i * 131 + 17) !== null) return e.name;
  }

  const edge = ay < HALF + 1.8;
  const list = edge ? g.edge : g.open;
  if (!list.length) return null;
  // Written as a ceiling rather than a floor so the tiles that carry scenery
  // are the same ones they have always been: this used to read `h > 0.76`.
  if (hash2(x, y) <= 1 - (edge ? g.edgeScatter : g.scatter)) return null;
  return pick(list, hash2(x * 3 + 11, y * 7 + 5));
}

/** A flat marking on the road at this tile, or null. */
export function decalAt(x, y, biome) {
  if (!biome.art || !biome.art.decals) return null;
  // Road and its lip only, and it follows the *paint* rather than the walkable
  // band — a biome that narrows its painted road would otherwise scatter road
  // marks out across open ground.
  if (Math.abs(y) > HALF - (biome.art.roadInset || 0) + 1.2) return null;
  const h = hash2(x * 13 + 7, y * 5 + 3);
  if (h < 0.945) return null;
  const pool = biome.art.decals.pool;
  return pool[Math.floor(hash2(x + 313, y + 71) * pool.length) % pool.length];
}

/**
 * A landmark at this tile, or null.
 *
 * One per window of `landmarkEvery` tiles — the answer to "how often should a
 * windmill appear" is that number and nothing else. Kept further back from the
 * road than a feature, because their scale reads wrong up close.
 */
export function landmarkAt(x, y, biome) {
  const set = biome.art && biome.art.landmarks;
  if (!set) return null;
  const slot = slotAt(x, y, biome.art.landmarkEvery || 34, 7717, HALF + 2.5, VERGE - 1);
  if (slot === null) return null;
  const si = Math.floor(hash2(slot + 5, 13) * set.length) % set.length;
  const sheet = set[si];
  const n = sheet.cols * sheet.rows;
  return { sheet, cell: Math.floor(hash2(slot + 991, 17) * n) % n };
}

// Distance the hero marches between one encounter and the next.
export const MARCH = 7.5;
