# The camp, rendered instead of painted.
#
#   blender --background --python tools/bake-camp.py -- --out art/camp-wood.png
#
# The camp screen paints baked doll sheets over a painted backdrop, and the two
# have to agree about three things they were never asked to agree about: how
# big a man is, how far away the ground is, and where the light comes from. A
# painting negotiates all three by eye — that is what the 1.35 -> 2.6 figure
# multiplier and the `cover` -> 215% backdrop change were, one decision made
# twice. Rendered, none of it is negotiated: the set is built at the game's own
# metres-per-pixel, seen through the doll baker's own camera, and lit by the
# doll baker's own three lights plus the fire the screen already draws.
#
# `tools/bake-trees.py` is the template and the two share their reasoning about
# Blender; what is different here is that this is one framed picture rather
# than a lattice of cells, so the arithmetic below is about *framing* and the
# arithmetic there was about *slicing*.
#
# ## The three numbers this file exists to honour
#
# **A metre is 0.162 of the viewport's height.** `campGeom` in js/ui.js draws a
# body `44 * 0.92 * scale` tall with `scale = (H/300) * 2.6 * (1 - depth*0.34)`,
# so the figure standing at the middle of the ring (depth 0.5) is 0.291 * H
# pixels from sole to crown. A man is 1.8m. Everything else follows.
#
# **The camera is pitched, and the doll is not.** doll.html renders from a
# level orthographic camera — `camera.position.set(-8, 0, 0)` looking at the
# origin — because the sheets are one flat side view mirrored for facing. A
# level camera sees a flat ground plane edge-on, as a line, so a set rendered
# that way has no ground at all. The pitch is the one place the set deliberately
# departs from the doll, and it is small enough that a figure sprite standing
# unforeshortened on it reads as standing: at PITCH the set's own verticals lose
# `1 - cos(PITCH)` of their height, ~8%, which is under the difference between
# two of the pack's own trees.
#
# The number comes from the ring the party stands in. `campGeom` spreads them
# on an ellipse `rx = 0.30W` by `ry = 0.15H`, and a circle of radius r on the
# ground projects to exactly that ellipse when `sin(pitch) = 0.5 * H/W` — 16°
# on 16:9, 29° on a square window. It is a composition, not a projection, so it
# has no single answer; 24° sits in the middle of the range the game is
# actually played at and matches the painted camps' own horizon.
#
# **Nothing far away is small.** An orthographic camera has no vanishing point,
# so distance buys no shrinking and there is no horizon line — the ground plane
# would fill the frame to the top edge and there would be no sky for
# `drawStars` to draw into. Sky exists only where the ground *stops*, which is
# why this file builds a crest rather than a plane and why the treeline is a
# silhouette standing on it rather than a forest behind it.

import bpy
import sys
import os
import math
import random
from mathutils import Vector, Matrix

SRC = '/Volumes/Z-Drive/Youtube-game/crypt-heroes/art/world/camps/FBX'

# --- the game's constants, copied so the derivation can be read here ---------
FIG_M = 1.8                     # a man, in metres
CAMP_MUL = 2.6                  # `campGeom`'s figure multiplier
CAMP_DEPTH = 0.5                # the ring's middle: the figure used as the ruler
FIG_PX_PER_H = 44 * 0.92 * (1 / 300) * CAMP_MUL * (1 - CAMP_DEPTH * 0.34)
FIRE_Y = 0.72                   # `campGeom`'s `cy = H * 0.72`

PITCH = 24.0                    # degrees below the horizon; see above
RES_X, RES_Y = 3200, 1440       # 2.22:1, wide enough to cover a viewport at 100% height

# Where the ground stops. The painted camps put their horizon about 28% down;
# with the framing below that lands the crest a little under 6m behind the fire,
# which is a small clearing — but a 2.6x zoom *is* a close-up, and the alternative
# is a horizon so far back that the fire and the party are specks in it.
HORIZON = 0.28

# The party stands on `rx = 0.30W`, so the ground inside this radius belongs to
# the heroes and nothing may be placed in it but the fire.
CLEARING = 4.4


def parse_args():
    argv = sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else []
    out = {'out': 'art/camp-wood.png', 'src': SRC, 'seed': '7',
           'light': '1', 'samples': '64', 'pitch': str(PITCH), 'res': f'{RES_X}x{RES_Y}',
           'vignette': '1.1', 'layers': '3'}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip('-')
        if k in out:
            out[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    return out


ARGS = parse_args()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
resolve = lambda p: p if os.path.isabs(p) else os.path.join(ROOT, p)
RES_X, RES_Y = (int(v) for v in ARGS['res'].split('x'))
PITCH = float(ARGS['pitch'])
LIGHT = float(ARGS['light'])
RNG = random.Random(int(ARGS['seed']))

# --- the frame, solved once --------------------------------------------------
# The viewport is `RES_Y` pixels tall and a metre is `FIG_PX_PER_H * RES_Y /
# FIG_M` of them, so the camera sees this many metres top to bottom — corrected
# by `cos(PITCH)`, because that is what a pitched camera does to a standing
# figure and the figure sprites drawn over this set do not do it to themselves.
SPAN_Y = math.cos(math.radians(PITCH)) * FIG_M / FIG_PX_PER_H
SPAN_X = SPAN_Y * RES_X / RES_Y
SIN_P, COS_P = math.sin(math.radians(PITCH)), math.cos(math.radians(PITCH))
# The fire sits at the world origin and must land at `FIRE_Y` down the frame,
# so the frame's centre is this far up-screen of it.
LIFT = (FIRE_Y - 0.5) * SPAN_Y
# Ground distance of the frame's centre, and of its two edges. Up the screen is
# away from the camera at `sin(PITCH)` metres of ground per metre of screen.
Y_MID = LIFT / SIN_P
Y_TOP = Y_MID + (SPAN_Y / 2) / SIN_P
Y_BOT = Y_MID - (SPAN_Y / 2) / SIN_P
CREST = Y_MID + ((0.5 - HORIZON) * SPAN_Y) / SIN_P


# The frame's own half-width in metres. Every hand-placed coordinate in this
# file is checked against it — see the note in `scenery`.
HALF_W = SPAN_X / 2


def screen(y, z=0.0):
    """Height on screen, in metres from the frame's centre, of a point at ground
    distance `y` and height `z`. The whole layout is checked against this."""
    return (y - Y_MID) * SIN_P + z * COS_P


# --- materials ---------------------------------------------------------------
# **The pack ships meshes and no maps.** Same situation as the tree bake and the
# same answer: flat colours keyed off the material names the FBX already carry,
# replaced the day a `Textures` folder lands beside the models. Night colours,
# because the camp is a night scene and a daylight albedo lit by a campfire
# comes back orange sherbet.
PALETTE = {
    'Bark':   (0.070, 0.052, 0.040, 1.0),
    'Leaves': (0.030, 0.042, 0.026, 1.0),
    'Rock':   (0.072, 0.070, 0.074, 1.0),
    'Grass':  (0.048, 0.052, 0.030, 1.0),
    'Bush':   (0.034, 0.044, 0.028, 1.0),
}


def flat(name, colour, rough=0.92):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = colour
    b.inputs['Roughness'].default_value = rough
    return m


MATS = {}

# Filled as the scene is built. `bake()` turns these on and off between passes:
# the fire alone, the moon alone, and the two emissive surfaces that must appear
# in exactly one plate or be added to the frame once per plate.
FIRE_LIGHTS, SUNS, EMISSIVE = [], [], []


def family(mat_name):
    """Which flat colour a pack material gets. Names are `NormalTree_Bark.001`,
    `Bush_Leaves`, `Rock.003` — family first, Blender's uniquifying suffix last."""
    n = (mat_name or '').split('.')[0]
    for key in ('Bark', 'Leaves', 'Rock', 'Grass', 'Bush'):
        if key in n:
            return 'Bush' if key == 'Leaves' and n.startswith('Bush') else key
    return 'Bark'


def dress(obj):
    for i, m in enumerate(obj.data.materials):
        k = family(m.name if m else '')
        if k not in MATS:
            MATS[k] = flat(k, PALETTE[k])
        obj.data.materials[i] = MATS[k]
    if not obj.data.materials:
        if 'Grass' not in MATS:
            MATS['Grass'] = flat('Grass', PALETTE['Grass'])
        obj.data.materials.append(MATS['Grass'])


# --- the model library -------------------------------------------------------
LIB = {}


def load(name):
    """A pack model as a mesh datablock, origin at the centre of its footprint.

    Imported once and instanced after: the copies share their mesh data, so
    forty grass tufts cost one mesh. The import transform is baked into the
    vertices and the origin moved to the base, because every placement below
    says "stand this here" and a model whose origin is anywhere else has to be
    corrected by its own bounding box at every call site."""
    if name in LIB:
        return LIB[name]
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(ARGS['src'], f'{name}.fbx'))
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    if not meshes:
        raise SystemExit(f'{name}: no mesh in the FBX')
    obj = meshes[0]
    mw = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = mw
    obj.data.transform(mw)                 # bake the import transform into the mesh
    obj.matrix_world = Matrix.Identity(4)
    pts = [v.co for v in obj.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    obj.data.transform(Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))))
    dress(obj)
    LIB[name] = (obj.data, hi.z - lo.z)
    for o in fresh:                        # the template itself never renders
        bpy.data.objects.remove(o, do_unlink=True)
    return LIB[name]


def put(name, x, y, z=0.0, height=None, spin=None, tilt=0.0):
    """Stand a model on the ground at (x, y). `height` is in metres and is what
    the layout below actually specifies — the pack's own sizes are its business."""
    data, native = load(name)
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    s = (height / native) if height else 1.0
    ob.scale = (s, s, s)
    ob.rotation_euler = (tilt, 0, RNG.uniform(0, math.tau) if spin is None else spin)
    ob.location = (x, y, z)
    return ob


# --- the scene ---------------------------------------------------------------
def ground():
    """The clearing, and the crest it stops at.

    **The crest is bent down, not cut off.** The first pass deleted the faces
    beyond an undulating line, which is the obvious way to end a ground plane and
    is wrong: the boundary then follows the grid, and a grid boundary seen at 24°
    is a staircase four pixels a step. Bending the ground steeply down past the
    line instead means the silhouette is the *curve*, sampled as densely as the
    grid is wide rather than as coarsely as it is deep.

    The rise into it is gentle and the noise on it is centimetres: this ground is
    seen at a glancing 24°, where a bump a hand high covers a foot of screen."""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=260, y_subdivisions=160, size=1)
    g = bpy.context.object
    g.name = 'ground'
    W, D = 34.0, 26.0
    for v in g.data.vertices:
        x = v.co.x * W
        y = v.co.y * D + (D / 2) - 9.0      # from 9m in front of the fire, back
        # A slow rise towards the crest, and two octaves of shallow noise so the
        # firelight has something to catch. Deterministic: the same seed lays the
        # same ground every time, which is what makes a re-render comparable.
        z = max(0.0, y - 1.0) * 0.022
        z += 0.055 * math.sin(x * 0.9 + 0.7) * math.sin(y * 0.8)
        z += 0.022 * math.sin(x * 3.1 + 2.2) * math.sin(y * 2.7 + 1.1)
        # …and then the far side of the hill, which nothing ever sees.
        over = y - ridge(x)
        if over > 0:
            z -= over * over * 0.9
        v.co = (x, y, z)
    g.data.materials.append(earth())
    for p in g.data.polygons:
        p.use_smooth = True
    return g


def earth():
    """Dirt, which is the one surface in this frame that cannot be a flat colour.

    Everything else here is a low-poly model whose facets give the light
    something to break on. The ground is a smooth 260x160 grid, and at a flat
    albedo it came back as moulded clay — the fire's pool landed on it as a
    perfect ellipse with nothing in the way. Two noises fix it: a coarse one
    mottling the colour, a fine one as bump. Both are procedural, so this holds
    at any resolution and needs no map on disk."""
    m = bpy.data.materials.new('Earth')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 1.0

    coarse = nt.nodes.new('ShaderNodeTexNoise')
    coarse.inputs['Scale'].default_value = 9.0
    coarse.inputs['Detail'].default_value = 8.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.34
    ramp.color_ramp.elements[0].color = (0.026, 0.021, 0.017, 1)
    ramp.color_ramp.elements[1].position = 0.68
    ramp.color_ramp.elements[1].color = (0.092, 0.071, 0.051, 1)
    nt.links.new(coarse.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])

    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 70.0
    fine.inputs['Detail'].default_value = 10.0
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.85
    bump.inputs['Distance'].default_value = 0.30
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def ridge(x):
    """Where the ground turns over, per metre across. Two waves rather than one,
    so the horizon has a high side and a low side and does not read as a dome."""
    return CREST + 0.55 * math.sin(x * 0.55) + 0.30 * math.sin(x * 1.7 + 1.9)


def fire():
    """**The pit, and not the fire.**

    `paintCamp` draws `drawCampfire` and `drawCookpot` live at `(W/2, H*0.72)`,
    which is this origin, and it draws them *inside* the depth sort so the two
    heroes who wrap forward stand in front of the flame. `drawCampfire` is not
    just a flame either — it is an ember bed, **three logs** and three tongues.
    So anything this file builds in the middle of the ring is a second fire in
    the same grate: the first pass rendered a flame and got a white triangle
    behind a real fire, the second rendered five logs and got a woodpile with a
    campfire drawn on top of it.

    What is left for the render is everything the canvas fire cannot do: a ring
    of stones lit from inside, their shadows thrown outwards, a scorched patch
    of ground under it, and the pool of light the party stands in. Measured
    against `drawCampfire`'s own size — its logs reach 15px at `scale = H/190`,
    which is 0.079 of the viewport's height, against a 0.60m stone ring at
    0.097 — the drawn fire lands just inside the ring, which is what a ring of
    stones is for.

    The rule for anyone extending this: **the middle 0.5m is the canvas's.**"""
    for i in range(11):
        a = (i / 11) * math.tau + 0.2
        r = 0.62 + RNG.uniform(-0.05, 0.05)
        put(f'Rock_{1 + i % 5}', math.cos(a) * r, math.sin(a) * r,
            height=RNG.uniform(0.15, 0.25), tilt=RNG.uniform(-0.2, 0.2))

    # The tripod and its pot, over the flame. `drawCookpot` used to draw these
    # in flat black on the canvas; a black outline over a lit set is the same
    # mismatch the vector fire was. Rendered, the pot takes the firelight from
    # underneath, which is the only interesting thing about a pot on a fire.
    iron = flat('Iron', (0.030, 0.028, 0.026, 1.0), rough=0.62)
    for dx, dy in ((-0.30, -0.24), (0.34, -0.16), (0.02, 0.36)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.034, depth=1.06, vertices=6)
        c = bpy.context.object
        c.location = (dx * 0.5, dy * 0.5, 0.50)
        c.rotation_euler = (math.atan2(math.hypot(dx, dy), 1.06) * 1.05,
                            0, math.atan2(dy, dx) - math.pi / 2)
        c.data.materials.append(iron)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, segments=14, ring_count=8)
    pot = bpy.context.object
    pot.location = (0, 0, 0.62)
    pot.scale = (1, 1, 0.78)
    pot.data.materials.append(iron)

    # Charcoal, and **no ash disc**. A flat disc inside the ring is 0.4m from a
    # 165W lamp pointing straight down it, so it takes ~70 W/m² square on: even
    # at an albedo of 0.013 it came back a pale plate, brighter than the dirt
    # around it and reading as a puddle rather than a burn. Burnt ground is not
    # a surface here, it is the absence of one — the stones say where the pit is
    # and `drawCampfire`'s own ember bed lays the glow inside it.
    char = flat('Char', (0.015, 0.013, 0.011, 1.0), rough=1.0)
    for _ in range(7):
        a, r = RNG.uniform(0, math.tau), RNG.uniform(0.05, 0.45)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.16, vertices=6)
        c = bpy.context.object
        c.rotation_euler = (math.radians(84), 0, RNG.uniform(0, math.tau))
        c.location = (math.cos(a) * r, math.sin(a) * r, 0.035)
        c.data.materials.append(char)

    # Two lights, not one: a small bright one at the flame for the stones and the
    # ground under them, and a wide soft one above it so the far side of the
    # clearing is lit at all. One light strong enough to reach the treeline burns
    # the fire ring out entirely — measured on the first pass, where the stones
    # came back white.
    for z, energy, radius, colour in ((0.42, 240.0, 0.14, (1.0, 0.57, 0.23)),
                                      (1.30, 105.0, 1.10, (1.0, 0.49, 0.19))):
        l = bpy.data.lights.new('fire', 'POINT')
        l.energy, l.color, l.shadow_soft_size = energy * LIGHT, colour, radius
        ob = bpy.data.objects.new('fire', l)
        ob.location = (0, 0, z)
        # Stashed on the object so `bake()` can move the flame and put it back
        # without a second table to keep in step with this one.
        ob['home'] = (0.0, 0.0, z)
        ob['watts'] = energy * LIGHT
        bpy.context.scene.collection.objects.link(ob)
        FIRE_LIGHTS.append(ob)


def up_gradient(nt):
    """A 0-at-the-bottom, 1-at-the-top factor for a standing plane.

    **Not a Gradient Texture.** A Gradient reads the *x* of whatever vector it is
    handed, and a plane's Generated coordinates are flat in local z, so steering
    it up the plane means rotating the mapping into an axis the plane has no
    extent along — which is how the first sky came back one flat black. Reading
    the y component of Generated directly is the same result with nothing to get
    backwards."""
    tex = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tex.outputs['Generated'], sep.inputs['Vector'])
    return sep.outputs['Y']


def sky():
    """A backdrop, square to the camera and behind everything.

    Not a world background: the game paints stars over the top third of this
    image and the band they sit in has to be a *sky*, dark at the crown and
    lifting towards the crest, rather than one flat grey. Emission, so no light
    in the scene can change it — it is the one part of the frame that is a
    painting and should behave like one."""
    m = bpy.data.materials.new('Sky')
    m.use_nodes = True
    nt = m.node_tree
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    # **Bottom of the plane is the horizon.** Generated coordinates run 0 at the
    # bottom of the mesh and 1 at the top, and the first pass had these the other
    # way round — which put the warm band above the frame and left a black sky
    # that looked exactly like a plane that had failed to render.
    ramp.color_ramp.elements[0].position = 0.0
    # **Cold all the way down.** The first pass put a warm tan at the horizon,
    # on the reasoning that a sky lifts towards the ground — and it does, at
    # dusk and at dawn. At one in the morning there is no warm end: the lift is
    # into a colder, paler blue, and the only warm light in the frame is the
    # one the camp lit itself. A tan horizon band reads as sunrise no matter
    # what the rest of the picture is doing.
    ramp.color_ramp.elements[0].color = (0.031, 0.040, 0.058, 1)   # at the crest
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.005, 0.007, 0.016, 1)   # the crown
    mid = ramp.color_ramp.elements.new(0.45)
    mid.color = (0.013, 0.018, 0.032, 1)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(up_gradient(nt), ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    bpy.ops.mesh.primitive_plane_add(size=1)
    p = bpy.context.object
    p.name = 'sky'
    p.scale = (SPAN_X * 1.4, SPAN_Y * 1.4, 1)
    # Standing up, square to the camera, far enough back that nothing reaches it.
    # **Forward along the view axis is downward.** The camera looks along
    # `(0, cos PITCH, -sin PITCH)`, so a backdrop 40m in front of the aim point
    # is 16m *below* ground, not above it. Signing that the other way put the sky
    # 32m over the top of the frame, and a sky that is not in shot is
    # indistinguishable from a sky that failed to render — which is exactly how
    # it was diagnosed twice.
    p.rotation_euler = (math.radians(90 - PITCH), 0, 0)
    p.location = (0, Y_MID + 40 * COS_P, -40 * SIN_P)
    p.data.materials.append(m)
    EMISSIVE.append(p)


def mist():
    """Three cards of haze at the crest.

    The crest is a cut edge and a cut edge is a hard line; the painted camps put
    fog exactly there for exactly that reason. Cards rather than a volume — EEVEE
    volumetrics at this scale cost more than the whole render and buy something
    nobody can point at in a 1440-pixel image."""
    m = bpy.data.materials.new('Mist')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.055, 0.066, 0.092, 1)
    b.inputs['Emission Color'].default_value = (0.026, 0.033, 0.050, 1)
    b.inputs['Emission Strength'].default_value = 1.0
    b.inputs['Roughness'].default_value = 1.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.02
    ramp.color_ramp.elements[0].color = (0.45, 0.45, 0.45, 1)
    ramp.color_ramp.elements[1].position = 0.80
    ramp.color_ramp.elements[1].color = (0.0, 0.0, 0.0, 1)
    nt.links.new(up_gradient(nt), ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Alpha'])
    # Blender 4.2 renamed EEVEE's blend controls; both spellings are set so this
    # runs on either side of that change rather than silently rendering opaque.
    try:
        m.surface_render_method = 'BLENDED'
    except (AttributeError, TypeError):
        pass
    try:
        m.blend_method = 'BLEND'
    except (AttributeError, TypeError):
        pass
    m.show_transparent_back = False
    for i, (dy, h) in enumerate(((-0.9, 1.5), (0.2, 2.1), (1.4, 2.8))):
        bpy.ops.mesh.primitive_plane_add(size=1)
        p = bpy.context.object
        p.name = f'mist{i}'
        p.scale = (34.0, h, 1)
        p.rotation_euler = (math.radians(90 - PITCH * 0.35), 0, 0)
        p.location = (0, CREST + dy, h * 0.30)
        p.data.materials.append(m)
        EMISSIVE.append(p)


def treeline():
    """The silhouette above the crest.

    Nothing far away is small here, so this is not a distant forest — it is a
    row of trees standing *just* behind the crest, sunk into the ground by the
    height of their own trunks so that only the crown clears the ridge. Sunk,
    not scaled: a scaled dead tree has scaled branches and reads as a shrub."""
    for i in range(16):
        x = -15.5 + i * 2.05 + RNG.uniform(-0.6, 0.6)
        y = ridge(x) + RNG.uniform(0.4, 2.2)
        clear = RNG.uniform(0.35, 1.5)         # metres of crown above the ridge
        name = f'DeadTree_{1 + (i * 3) % 10}'
        _, native = load(name)
        # Solve the sink from the projection: a tree based at (y, z) tops out at
        # `screen(y, z + native)`, and the ridge here is at `screen(ridge(x))`.
        z = (screen(ridge(x)) + clear - native * COS_P - (y - Y_MID) * SIN_P) / COS_P
        put(name, x, y, z=z, tilt=RNG.uniform(-0.05, 0.05))


def scenery():
    """What stands around the clearing.

    The rules are the frame's, not taste's: nothing inside `CLEARING`, because
    the party stands there; nothing in front of the fire unless it is out at the
    edges, because the camera is there and a trunk down the middle of the frame
    is a trunk in front of the hero you are choosing; and the two big framing
    trees are deliberately cropped by the top of frame, which at this zoom is
    what a 6m tree does whether or not it was planned."""
    # The two that frame the shot. A dead tree is 6.2m and the frame is
    # SPAN_Y (~5.7m) tall, so these are trunks and low branches — the same crop
    # the painted camp uses at its left and right edges.
    put('DeadTree_2', -6.4, -2.6, tilt=0.04)
    put('DeadTree_5', 6.9, -1.9, tilt=-0.05)
    put('DeadTree_7', -8.6, 2.4)
    put('DeadTree_9', 5.2, -3.4, tilt=0.03)

    kinds = ['DeadTree_1', 'DeadTree_3', 'DeadTree_4', 'DeadTree_6',
             'DeadTree_8', 'DeadTree_9', 'DeadTree_10']
    for i in range(8):
        for _ in range(40):
            x, y = RNG.uniform(-13, 13), RNG.uniform(-4, CREST - 0.6)
            if math.hypot(x, y) < CLEARING + 1.6:
                continue
            if y < 0.5 and abs(x) < 5.2:       # never in front of the party
                continue
            break
        put(kinds[i % len(kinds)], x, y, tilt=RNG.uniform(-0.06, 0.06))

    # **The right slope, filled deliberately rather than by more scatter.**
    # Two locked classes stand over there — Warlock and Druid — and the ground
    # behind them came back as bare hillside, which read as an unfinished half
    # of the picture rather than as open country. A random scatter does not fix
    # that: it thins out with radius like everything else, and the hole is at a
    # radius the scatter is already thin at. So this is a placed stand of trees
    # and a bank of scrub, sized to close the frame at the right edge the way
    # the two framing trunks close it at the left.
    #
    # **Every coordinate here is inside `SPAN_X / 2`.** The first attempt at this
    # put the stand at x = 8 to 12, which is off the side of a frame 12.55m wide,
    # and rendered a picture identical to the one it was meant to fix. The frame
    # is metres, not "the right-hand side" — check against `HALF_W` below.
    for x, y, tilt in ((6.1, 1.0, -0.04), (6.0, 5.1, 0.05),
                       (1.6, 5.4, 0.02), (5.4, 3.1, -0.03)):
        put(f'DeadTree_{RNG.randint(1, 10)}', x, y, tilt=tilt)
    for x, y, h in ((5.9, -0.4, 0.75), (3.6, 3.9, 0.85), (6.2, 2.0, 0.90)):
        put(RNG.choice(['Bush', 'Bush_Large', 'Bush_Small']), x, y, height=h)
    for x, y, h in ((4.6, 0.6, 0.42), (5.9, 4.0, 0.50), (3.2, 4.7, 0.30)):
        put(f'Rock_{RNG.randint(1, 5)}', x, y, z=-0.04, height=h,
            tilt=RNG.uniform(-0.2, 0.2))

    # Undergrowth. Bushes and rocks are allowed nearer than the trees are — they
    # are below knee height at this scale and the clearing needs an edge rather
    # than a boundary.
    for _ in range(14):
        a, r = RNG.uniform(0, math.tau), RNG.uniform(CLEARING - 0.5, 11)
        x, y = math.cos(a) * r, math.sin(a) * r
        if y > CREST - 0.4 or (y < -1.5 and abs(x) < 4.5):
            continue
        put(RNG.choice(['Bush', 'Bush_Small', 'Bush_Large']), x, y,
            height=RNG.uniform(0.45, 1.05))
    for _ in range(18):
        a, r = RNG.uniform(0, math.tau), RNG.uniform(1.8, 12)
        x, y = math.cos(a) * r, math.sin(a) * r
        if y > CREST - 0.3:
            continue
        put(f'Rock_{RNG.randint(1, 5)}', x, y, z=-0.05,
            height=RNG.uniform(0.12, 0.55), tilt=RNG.uniform(-0.25, 0.25))
    for _ in range(120):
        a, r = RNG.uniform(0, math.tau), RNG.uniform(1.3, 13)
        x, y = math.cos(a) * r, math.sin(a) * r
        if y > CREST - 0.2:
            continue
        put(RNG.choice(['Grass_Small', 'Grass_Large', 'Plant_1', 'Plant_2']), x, y,
            height=RNG.uniform(0.12, 0.34))


def camp_kit():
    """The signs of people, since the pack has none.

    Quaternius' nature set is trees, rocks and grass — no tent, no cart, no
    crates — so everything that says *camp* rather than *clearing* is built from
    primitives here. All of it is a stand-in, in the same sense the tree bake's
    bark colour is a stand-in: a prop pack replaces this one function and touches
    nothing else in the file.

    **A clearing with a fire in it is not a camp.** Two renders were spent
    finding that out. What reads is not detail — at this size nobody can see a
    buckle — it is the *shapes people leave*: something slept under, something
    stacked, something driven into the ground. Three silhouettes did more than
    twenty props' worth of scatter."""
    wood = flat('Wood2', (0.058, 0.040, 0.028, 1.0), rough=0.95)
    plank = flat('Plank', (0.046, 0.033, 0.023, 1.0), rough=0.9)
    cloth = flat('Canvas', (0.052, 0.043, 0.031, 1.0), rough=1.0)

    # **The two halves are given different jobs.** The camp used to have its
    # stores on the left and its shelter on the left as well, which left the
    # right a bare slope with two locked classes standing on it. Firewood and
    # crates are a stores corner now and they stay left; the lean-to crosses to
    # the right. Both sides then have a built silhouette against the trees,
    # which is what stops the frame reading as one dressed half and one empty.
    for row in range(3):
        for i in range(4 - row):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=1.15, vertices=10)
            c = bpy.context.object
            c.rotation_euler = (math.radians(90), 0, math.radians(96))
            c.location = (-5.0 + i * 0.20 + row * 0.10, 3.35 + row * 0.02,
                          0.09 + row * 0.17)
            c.data.materials.append(wood)

    # Crates, sunk a centimetre so they sit *in* the ground rather than on it —
    # the ground has bump on it now and a flat-bottomed box floats visibly.
    for x, y, s, rot in ((-3.9, 2.6, 0.58, 0.3), (-3.3, 3.15, 0.46, -0.7)):
        bpy.ops.mesh.primitive_cube_add(size=s)
        b = bpy.context.object
        b.location = (x, y, s / 2 - 0.02)
        b.rotation_euler = (0, 0, rot)
        bpy.ops.object.modifier_add(type='BEVEL')
        b.modifiers[-1].width = 0.015
        b.data.materials.append(plank)

    # A lean-to: a ridge pole between two forks, and a sheet of canvas over it.
    # Its open side faces the fire, which is both what anyone camping would do
    # and what keeps its silhouette readable — a closed tent at this angle is a
    # triangle with no story in it. Mirrored across the fire from where it
    # started, so the poles and the sheet's slope swap hands with it.
    lx, ly = 3.5, 4.7
    for dx, dy in ((0.95, -0.7), (-0.95, 0.55)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=1.36, vertices=7)
        c = bpy.context.object
        c.location = (lx + dx * 0.86, ly + dy * 0.86, 0.64)
        c.rotation_euler = (math.radians(6), math.radians(4), 0)
        c.data.materials.append(wood)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.1, vertices=7)
    ridge_pole = bpy.context.object
    ridge_pole.rotation_euler = (math.radians(90), 0, math.radians(38))
    ridge_pole.location = (lx, ly, 1.30)
    ridge_pole.data.materials.append(wood)
    # The canvas is a subdivided plane with its far edge pegged to the ground and
    # a sag across the middle, because a flat one reads as a ramp.
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=8, size=1)
    sheet = bpy.context.object
    for v in sheet.data.vertices:
        u, w = v.co.x + 0.5, v.co.y + 0.5          # 0..1 across, 0..1 down the slope
        v.co = (v.co.x * 1.9,
                -w * 1.55,
                1.28 * (1 - w) - 0.14 * math.sin(u * math.pi) * math.sin(w * math.pi))
    sheet.location = (lx, ly + 0.85, 0)
    sheet.rotation_euler = (0, 0, math.radians(38))
    for p in sheet.data.polygons:
        p.use_smooth = True
    bpy.ops.object.modifier_add(type='SOLIDIFY')
    sheet.modifiers[-1].thickness = 0.02
    sheet.data.materials.append(cloth)

    # Two spears driven into the ground beside it. A stake in the earth is the
    # cheapest mark of occupation there is, and the only vertical in the frame
    # that is neither a tree nor a tent.
    for x, y, lean, spin in ((-3.05, 0.6, 0.16, 0.4), (-2.75, 0.95, -0.11, 2.1)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.028, depth=2.0, vertices=6)
        c = bpy.context.object
        c.rotation_euler = (lean, 0, spin)
        c.location = (x, y, 0.86)
        c.data.materials.append(wood)


def lights():
    """The doll baker's own three, turned into Blender's axes.

    doll.html looks along +X with +Y up, so screen-right there is +Z; this camera
    looks along +Y with +Z up, so screen-right here is +X. That makes the map
    `blender = (three.z, three.x, three.y)`, and the three positions come across
    as key (3, -3, 5), fill (-3, -2, 1), rim (-2, 2, 2). Same directions on the
    figure, same directions on the set — which is the whole point, and is why
    they are written as the conversion rather than as three tidy numbers.

    Their energies are not the doll's. three.js directional intensity and
    Blender sun irradiance are different units, and this is a night scene lit by
    a fire: these are the moon behind the doll's key, not the doll's key."""
    # **Raised from 1.50/0.45/0.90.** The set was tuned when the fire was baked
    # into the same render; split into plates, the base is the whole of the
    # picture wherever the fire does not reach, and at those energies two thirds
    # of the frame was black rather than dark. Moonlight has to *show* the
    # treeline, the crest and the shelter — the fire's job is the clearing.
    # **Down again, and colder.** These were raised to 3.10 while the base plate
    # was invisible, then to 1.95 once it was not, and both readings were taken
    # against a sky with a sunrise in it. Moonlight at one in the morning shows
    # you the shape of the treeline and the colour of nothing; anything brighter
    # and the frame reads as an hour before dawn, which is a different scene.
    # **An accent, not a key.** The fire is the light in this picture and the
    # moon is what proves the rest of the world is still there — a rim on the
    # crest, a cold edge on the treeline, nothing in the clearing that the fire
    # has not put there. Every drop in these numbers has been a drop: 3.10 while
    # the base plate was invisible, 1.95 once it was not, 1.05 for a sky with
    # the sunrise taken out of it, and 0.52 to stop it competing with the fire.
    for pos, energy, colour in (((3, -3, 5), 0.52, (0.44, 0.56, 0.94)),
                                ((-3, -2, 1), 0.13, (0.30, 0.40, 0.72)),
                                ((-2, 2, 2), 0.30, (0.40, 0.51, 0.86))):
        l = bpy.data.lights.new('l', 'SUN')
        l.energy, l.color, l.angle = energy * LIGHT, colour, math.radians(6)
        ob = bpy.data.objects.new('l', l)
        bpy.context.scene.collection.objects.link(ob)
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        SUNS.append(ob)


def camera():
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam_data.type = 'ORTHO'
    # `ortho_scale` is the *larger* dimension of the frame, and this render is
    # wider than it is tall — set it from SPAN_Y and every metre in the picture
    # is 2.2x wrong with nothing to show for it but a mystery.
    cam_data.ortho_scale = SPAN_X
    cam.rotation_euler = (math.radians(90 - PITCH), 0, 0)
    # Back off along the view axis, and take the clip plane with it. Blender's
    # far plane is 100 by default; the sky sits at 40 and the camera at 60, which
    # is inside it — but only just, and a set that grows renders black without a
    # word of explanation.
    dist = 60.0
    cam.location = (0, Y_MID - dist * COS_P + 0 * SIN_P, LIFT * 0 + dist * SIN_P)
    # The look-at point is the ground at Y_MID; place the camera by walking back
    # from it along the view direction rather than by guessing a height.
    cam.location = (0, Y_MID - dist * COS_P, dist * SIN_P)
    cam_data.clip_start, cam_data.clip_end = 1.0, 200.0
    bpy.context.scene.camera = cam
    return cam


def post():
    """Bloom on the flame, and the vignette the frame is built to have.

    EEVEE's own bloom went away in 4.2 and the fire needs one — an emissive cone
    with no glare is a paper cutout of a fire. Threshold high enough that only
    the flame itself blooms; the ground it lights must not.

    The vignette is not decoration. The camp screen is full-bleed and the plate,
    the roster and the road button all sit over the bottom and the edges of this
    image; the painted camps go to near-black there, and every piece of UI on
    this screen was contrasted against that. A rendered set that stays evenly lit
    to the corners is brighter than the thing the type was designed against."""
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers')
    gl = nt.nodes.new('CompositorNodeGlare')
    kinds = {e.identifier for e in gl.bl_rna.properties['glare_type'].enum_items}
    gl.glare_type = 'BLOOM' if 'BLOOM' in kinds else 'FOG_GLOW'
    gl.quality = 'HIGH'
    gl.threshold = 1.6
    gl.mix = -0.45

    out = nt.nodes.new('CompositorNodeComposite')
    nt.links.new(rl.outputs['Image'], gl.inputs['Image'])
    nt.links.new(gl.outputs['Image'], out.inputs['Image'])


def vignette(path, strength):
    """Darken towards the frame's edges, over the finished pixels.

    **Not in the compositor.** The obvious build is an ellipse mask, a blur and a
    multiply, and it came back with the mask itself printed across the middle of
    the frame: `CompositorNodeMixRGB` in 4.x resolves to the new multi-type Mix
    node, whose numbered inputs are no longer (Fac, Image, Image), so the links
    landed on sockets that were never colour. Rather than guess at socket indices
    that have already moved once, this is arithmetic on the rendered image — a
    thing that cannot silently mean something else in the next release.

    Multiplied in the display's own space rather than in light: a vignette is a
    thing a painter does to a picture, and the painted camps' one was done there
    too."""
    import numpy as np
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    ys, xs = np.mgrid[0:h, 0:w]
    # Elliptical, and centred a little above the middle: the fire sits at 72%
    # down the frame and the corner that most needs holding is the bottom one,
    # under the plate and the roster.
    dx = (xs / (w - 1) - 0.5) / 0.62
    dy = (ys / (h - 1) - 0.56) / 0.60
    r = np.sqrt(dx * dx + dy * dy)
    fall = np.clip(1.0 - strength * np.clip(r - 0.55, 0, None) ** 1.5, 0.0, 1.0)
    px[:, :, :3] *= fall[:, :, None]
    img.pixels = px.reshape(-1).tolist()
    img.file_format = 'PNG'
    img.save(filepath=path)
    return float(fall.min())


def flames(layers):
    """One flame per firelight plate, each a different shape.

    **The flame is rendered now, and the canvas one is gone.** `drawCampfire`
    drew logs and three quadratic tongues in flat colour over a lit set, which
    is the same mismatch the vector cookpot was: an outline sitting on top of a
    photograph. The reason it was kept through two passes is that a rendered
    flame is *still* — and a fire that does not move is the worst thing that can
    be on this screen.

    The plates answer that. There is one flame per plate and no two are the same
    shape, so the cross-fade that already swings the light also plays the fire:
    the tongues rise and fall because plate 2 is fading up while plate 1 fades
    down, on the same clock, from the same weights. No extra machinery, and the
    flame and the light it casts can never fall out of step — they are the same
    render.

    Hidden in the base plate on purpose. The base is the fire *out*; if the
    flame lived there it would burn at full strength through every flicker."""
    em = bpy.data.materials.new('Flame')
    em.use_nodes = True
    nt = em.node_tree
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (1.0, 0.42, 0.10, 1.0)
    e.inputs['Strength'].default_value = 2.1
    nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    core = bpy.data.materials.new('FlameCore')
    core.use_nodes = True
    nt2 = core.node_tree
    e2 = nt2.nodes.new('ShaderNodeEmission')
    e2.inputs['Color'].default_value = (1.0, 0.74, 0.34, 1.0)
    e2.inputs['Strength'].default_value = 3.8
    nt2.links.new(e2.outputs['Emission'], nt2.nodes['Material Output'].inputs['Surface'])

    sets = []
    for i in range(layers):
        group = []
        for j in range(4):
            h = RNG.uniform(0.30, 0.62)
            r = RNG.uniform(0.07, 0.15)
            bpy.ops.mesh.primitive_cone_add(radius1=r, depth=h, vertices=7)
            c = bpy.context.object
            off = RNG.uniform(0, math.tau)
            d = RNG.uniform(0, 0.13)
            c.location = (math.cos(off) * d, math.sin(off) * d, 0.08 + h / 2)
            # Leaned and twisted, so no tongue is a cone standing to attention.
            c.rotation_euler = (RNG.uniform(-0.22, 0.22), RNG.uniform(-0.22, 0.22),
                                RNG.uniform(0, math.tau))
            c.data.materials.append(core if j == 0 else em)
            group.append(c)
        sets.append(group)
    return sets


def moon():
    """A moon, and the light that comes off it.

    The suns are already named for it — `lights()` calls them the moon behind
    the doll's key — but there was nothing in the sky to have thrown them, and a
    night scene lit from a source the picture never shows is a night scene that
    reads as underexposed rather than as night. A disc, low over the crest and
    on the side the key comes from, is the whole fix: it costs one plane and it
    tells the eye that the cold light on the treeline is *supposed* to be there.

    Emissive and unlit, like the sky it sits on, and in the base plate only."""
    m = bpy.data.materials.new('Moon')
    m.use_nodes = True
    nt = m.node_tree
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (0.80, 0.86, 1.0, 1.0)
    e.inputs['Strength'].default_value = 0.92
    nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    bpy.ops.mesh.primitive_circle_add(radius=0.29, vertices=48, fill_type='NGON')
    d = bpy.context.object
    d.name = 'moon'
    # The key is at blender (3, -3, 5) — up and to the right — so the moon goes
    # to that side, or the shadows in the frame point away from a light nobody
    # can see. Not as far right as the key itself: the shelter and the two
    # right-hand trunks own that corner of the sky, and a moon behind a tree is
    # a moon that was never rendered.
    d.rotation_euler = (math.radians(90 - PITCH), 0, 0)
    d.location = (1.0, Y_MID + 38 * COS_P, -38 * SIN_P + 2.25)
    d.data.materials.append(m)
    EMISSIVE.append(d)
    return d


def bake(out, layers, torch):
    """The base plate, then one firelight plate per flame position.

    **This is the difference between a picture of a camp and a camp.** A single
    render bakes the fire's light into the ground, and a baked highlight is a
    stain: it never moves, so the one warm thing on the screen is the only thing
    that is provably dead. Light is additive, so it can be *rendered* additively
    — the moon and the fire are separate passes over the same geometry, and the
    canvas adds them back at whatever weights it likes, thirty times a second.

    The base is the set with the fire out: moonlight, sky, mist, and a clearing
    with a cold pit in it. Each fire plate is the same geometry lit by the fire
    *alone*, on black, with the flame shifted a hand's width from where it was
    on the last one. Cross-fading between them at runtime does what no amount of
    canvas gradient can: the stones' shadows swing, the near faces of the rocks
    take the light and give it up, and the bushes at the clearing's edge come
    forward and go back.

    They are cheap. A fire plate is black over most of its area and PNG knows
    it: the base is megabytes and the plates are a fraction of that.

    **The plates carry no sky and no mist.** Both are emissive — they would
    arrive at full strength in every plate and be added three times over. They
    are hidden for these passes, which is also why the plates are black at the
    top rather than dark blue.
    """
    sc = bpy.context.scene
    stem = out[:-4] if out.endswith('.png') else out
    written = []

    for ob in FIRE_LIGHTS:
        ob.data.energy = 0.0
    for group in torch:
        for ob in group:
            ob.hide_render = True
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    darkest = vignette(out, float(ARGS['vignette']))
    written.append(out)

    for ob in SUNS:
        ob.data.energy = 0.0
    for ob in EMISSIVE:
        ob.hide_render = True
    for i in range(layers):
        # The flame walks a small circle. A hand's width at this scale is about
        # a quarter of the fire ring, which is enough to swing the stones'
        # shadows visibly and not enough to look like the fire is being carried.
        a = math.tau * i / layers
        for j, group in enumerate(torch):
            for ob in group:
                ob.hide_render = (j != i)
        for ob in FIRE_LIGHTS:
            base = ob['home']
            ob.location = (base[0] + math.cos(a) * 0.16,
                           base[1] + math.sin(a) * 0.11, base[2])
            ob.data.energy = ob['watts'] * (0.94 + 0.12 * ((i * 7) % 5) / 4)
        path = f'{stem}-fire{i + 1}.png'
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        vignette(path, float(ARGS['vignette']))
        written.append(path)

    return darkest, written


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ground()
    sky()
    treeline()
    scenery()
    camp_kit()
    fire()
    torch = flames(int(ARGS['layers']))
    moon()
    lights()
    cam = camera()
    post()

    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.eevee.taa_render_samples = int(ARGS['samples'])
    try:
        sc.eevee.use_shadows = True
        sc.eevee.use_raytracing = True
    except AttributeError:
        pass
    # Filmic-by-default turns a night scene grey. AgX holds the fire's colour at
    # the top end without washing the dark two thirds into mud, and the look is
    # pushed one stop of contrast because this image is seen behind figures.
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    out = resolve(ARGS['out'])
    darkest, written = bake(out, int(ARGS['layers']), torch)

    print(f'camp: {len(written)} plates — base + {len(written) - 1} firelight')
    print(f'camp: vignette to {darkest:.2f} at the corners')
    print(f'camp: in frame x +-{HALF_W:.2f}m, y {Y_BOT:.1f}..{Y_TOP:.1f}m')
    print(f'camp: {RES_X}x{RES_Y}, {SPAN_X:.2f}m x {SPAN_Y:.2f}m, '
          f'pitch {PITCH}deg, 1m = {RES_Y * FIG_PX_PER_H / FIG_M:.1f}px')
    print(f'camp: ground {Y_BOT:.1f}m .. {Y_TOP:.1f}m, crest {CREST:.1f}m '
          f'({screen(CREST) / SPAN_Y + 0.5:.2f} up the frame), cam {tuple(round(v, 1) for v in cam.location)}')
    print(f'camp: {os.path.relpath(out, ROOT)}')


main()
