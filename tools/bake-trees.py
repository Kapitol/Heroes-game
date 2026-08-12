# Scenery, rendered at the road's own angle into a prop sheet.
#
#   blender --background --python tools/bake-trees.py -- --out art/props-trees.png
#
# The verge is painted and the hero is rendered, and they have never quite
# agreed about where the light is or how far away the ground is. This puts the
# scenery on the hero's footing: same renderer, same projection, sliced by
# `js/atlas.js` exactly like a generated sheet, so nothing at runtime learns
# that a tree was ever a mesh.
#
# **The camera is the game's projection, not "an isometric angle".** js/iso.js
# maps a tile to a diamond 64 wide and 32 tall, so the elevation is
# `atan(32/64)` — 26.565° above the horizon, or 63.435° of camera pitch — and
# the yaw is 45°. True isometric is 54.736° and would put every tree at a
# subtly different angle from the ground it stands on, which reads as scenery
# pasted onto a photograph.
#
# **All twenty are rendered in one pass, laid out on the screen grid.** The
# obvious build is one render per model and a compositing step; placing them
# along the camera's own right and up vectors instead means the cells land on
# an exact lattice in a single image, and there is no compositor to disagree
# with `sliceGrid` about where a cell begins.

import bpy
import sys
import os
import math
from mathutils import Vector

SRC = '/Volumes/Z-Drive/Youtube-game/crypt-heroes/art/world/trees/FBX'

# Only the dead. The road starts outside a town and works its way underground;
# a birch in leaf belongs to a different game, and the painted verge this has
# to sit beside is bare wood throughout.
FAMILIES = ('DeadTree_', 'DeadBirch_')

COLS, ROWS = 5, 4
CELL = 256                      # pixels per cell in the finished sheet
# How much of a cell the tallest tree fills. Slack matters: `sliceGrid` trims
# each cell to its own content, so headroom costs file size and nothing else,
# while a tree touching the cell edge gets clipped by the very trim meant to
# tidy it.
FILL = 0.86


def parse_args():
    argv = sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else []
    out = {'out': 'art/props-trees.png', 'src': SRC}
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


def models():
    """The dead trees, in a stable order — the sheet's cell indices are config."""
    names = [f[:-4] for f in os.listdir(ARGS['src']) if f.endswith('.fbx')]
    keep = [n for n in names if n.startswith(FAMILIES)]
    # `DeadTree_10` must not sort between 1 and 2: the cell index is written
    # into js/world.js by hand and a resort would silently rearrange the verge.
    return sorted(keep, key=lambda n: (n.rsplit('_', 1)[0], int(n.rsplit('_', 1)[1])))


def bounds(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    names = models()
    if not names:
        raise SystemExit(f'no dead trees in {ARGS["src"]}')

    # The camera's basis, derived from the projection rather than typed in.
    pitch, yaw = math.radians(63.435), math.radians(45)
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.rotation_euler = (pitch, 0, yaw)
    cam_data.type = 'ORTHO'
    # **`matrix_world` is stale until the view layer is updated.** Setting
    # `rotation_euler` does not recompute it, so reading the camera's basis on
    # the next line hands back the identity — the grid gets laid out on the
    # world axes, the camera looks somewhere else entirely, and the render is a
    # blank frame with no error to explain it.
    bpy.context.view_layer.update()
    right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
    up = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
    back = cam.matrix_world.to_quaternion() @ Vector((0, 0, 1))

    # One pass over the models to learn how big the biggest is, so every tree
    # is scaled by the *same* factor and a big oak still reads as bigger than a
    # sapling. Scaling each to fill its own cell would flatten the set into
    # twenty trees of identical height, which is the tell of a generated sheet.
    placed, tallest = [], 0.0
    for name in names:
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.fbx(filepath=os.path.join(ARGS['src'], f'{name}.fbx'))
        fresh = [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']
        if not fresh:
            continue
        lo, hi = bounds(fresh)
        tallest = max(tallest, hi.z - lo.z)
        placed.append((name, fresh, lo, hi))

    # **Untextured geometry reads as bone, not wood.** Only the pack's FBX
    # folder is on disk, so every model arrives on a default grey material and
    # the first sheet came back looking bleached — bright branches against a
    # tan verge, more skeleton than tree. A dark bark colour costs nothing and
    # is replaced the moment the pack's textures land beside the meshes.
    bark = bpy.data.materials.new('Bark')
    bark.use_nodes = True
    bsdf = bark.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.105, 0.078, 0.056, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.92
    for _, objs, *_ in placed:
        for o in objs:
            if any(m and m.node_tree and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes)
                   for m in o.data.materials):
                continue                       # it brought its own maps; leave it
            o.data.materials.clear()
            o.data.materials.append(bark)

    span = tallest / FILL                      # world units a cell must cover
    for i, (name, objs, lo, hi) in enumerate(placed):
        col, row = i % COLS, i // COLS
        # Centred on its cell, standing on the cell's floor: the trees line up
        # by their roots, not by their middles, or they appear to hover at
        # different heights along a row.
        centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
        target = right * ((col - (COLS - 1) / 2) * span) \
            + up * (((ROWS - 1) / 2 - row) * span - span * 0.34)
        for o in objs:
            o.location += target - centre

    cam_data.ortho_scale = span * COLS
    # Far enough back to clear the tallest tree, and **the clip range has to
    # follow it**: Blender's default far plane is 100 units, so a camera parked
    # at 200 renders a perfectly empty frame with no error and no warning.
    cam.location = back * 200
    cam_data.clip_start, cam_data.clip_end = 1, 600
    bpy.context.scene.camera = cam

    # Lighting to match the doll's: a warm key from the same side, a cool fill,
    # and a rim. The hero and the tree beside him have to be lit by one sun.
    for pos, energy, colour in [((-4, -5, 8), 3.4, (1.0, 0.94, 0.82)),
                                ((5, -3, 3), 1.1, (0.62, 0.69, 0.86)),
                                ((2, 6, 4), 1.6, (1.0, 0.86, 0.66))]:
        light = bpy.data.lights.new('l', 'SUN')
        light.energy, light.color = energy, colour
        ob = bpy.data.objects.new('l', light)
        bpy.context.scene.collection.objects.link(ob)
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()

    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = COLS * CELL, ROWS * CELL
    sc.render.film_transparent = True          # the sheet needs real alpha
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    out = resolve(ARGS['out'])
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    lo, hi = bounds([o for _, objs, *_ in placed for o in objs])
    print(f'trees: bbox {[round(v, 1) for v in lo]} .. {[round(v, 1) for v in hi]}'
          f' ortho {cam_data.ortho_scale:.1f} cam {[round(v, 1) for v in cam.location]}')
    print(f'trees: {len(placed)} in {COLS}x{ROWS}, {os.path.relpath(out, ROOT)}')
    print('trees: ' + ', '.join(f'{i}={n}' for i, n in enumerate(n for n, *_ in placed)))


main()
