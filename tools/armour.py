# The armoury, rebuilt in Blender and handed back to the baker as one GLB.
#
#   blender --background --python tools/armour.py -- \
#     --fbx "art/mixamo/X Bot.fbx" --out art/armour/warrior.glb
#   blender --background --python tools/armour.py -- \
#     --fbx "art/mixamo/X Bot.fbx" --out art/armour/warrior.glb \
#     --kit art/armour/kits/plate.glb
#
# **Why Blender at all.** The doll reads better than the paperdoll ever did and
# that trade cost the armoury: a Mixamo character cannot wear the five painted
# bands, so progression stopped being visible. Skinning a rigid plate to the
# `mixamorig` skeleton is minutes of work here and impossible in the browser,
# and the runtime already knows how to play the result — `tiered: true` and
# `row = wornTier - 1` ship today for the painted warrior. So five outfit rows
# in one sheet buy back visible tiers for no runtime change at all.
#
# **Weights are transferred, never auto-generated.** `Parent with automatic
# weights` on a solid pauldron is the classic mistake: the plate picks up a
# smooth falloff across the shoulder joint and bends like rubber. The Data
# Transfer modifier copies the *body's* weights onto the plate instead, so a
# vertex on the pauldron follows exactly the bone the shoulder under it
# follows, and the plate stays rigid because the vertices it covers all end up
# on the same bone.
#
# **Pieces are measured off the body, not typed in.** Every plate's radius
# comes from the vertices the body has weighted to that bone, so the same
# script fits X Bot, the Paladin, or anything else dropped into art/mixamo/
# without a table of magic numbers per character.
#
# Output is one GLB per class holding the body, the skeleton, and every tier's
# pieces named `T1_…` … `T5_…`. Nothing is deleted per tier and nothing is
# exported five times: `tools/doll.html?tier=N` shows one prefix and hides the
# rest, which is the cheapest possible thing for the baker to drive.

import bpy
import bmesh
import sys
import os
import math
from mathutils import Vector, Matrix


# ---------------------------------------------------------------- arguments

def parse_args():
    """Blender swallows everything before `--`; ours is everything after."""
    argv = sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else []
    out = {'fbx': None, 'out': None, 'kit': None}
    check = '--check' in argv
    i = 0
    while i < len(argv):
        k = argv[i].lstrip('-')
        if k in out:
            out[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    if not out['fbx'] or not out['out']:
        raise SystemExit('usage: armour.py -- --fbx <character.fbx> --out <sheet.glb> [--kit <kit.glb>]')
    out['check'] = check
    return out


ARGS = parse_args()
# `--check` prints the bones each plate actually ended up weighted to.
CHECK = ARGS.get('check')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
resolve = lambda p: p if os.path.isabs(p) else os.path.join(ROOT, p)


# ---------------------------------------------------------------- the scene

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_character(path):
    """The Mixamo download: one armature, one (or more) skinned meshes."""
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not arm or not meshes:
        raise SystemExit(f'{path} has no armature or no mesh')
    # **The body is the mesh weighted to the most bones, not the one with the
    # most vertices.** Vertex count was the first rule and it is wrong: the
    # Paladin's densest mesh is his head, which is weighted to `Head` and
    # nothing else, so every plate on him — boots included — transferred a
    # solid weight of 1.0 on `Head` and the whole armoury rode on his neck.
    # That failure is invisible in the bind pose and shows up as a box floating
    # beside the foot the moment a clip plays. Counting the bones a mesh
    # actually uses picks the torso every time, on any character.
    def reach(o):
        used = set()
        for v in o.data.vertices:
            for g in v.groups:
                if g.weight > 0.01:
                    used.add(g.group)
        return len(used)
    body = max(meshes, key=reach)

    # **The import's own correction is applied, not carried.** Blender takes a
    # Y-up Mixamo file in by *rotating the armature object* 90° about X and
    # scaling it by a hundredth, rather than baking either into the data. The
    # glTF exporter then applies its own Y-up conversion on top, the two do not
    # cancel, and the doll comes out of the baker lying on its back. Applying
    # them here leaves an identity transform for the exporter to convert
    # cleanly — and, incidentally, puts the plates in the same space as the
    # bones that measure them.
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return arm, body


# ------------------------------------------------------------- measurement

def bone_axis(arm, name):
    """A bone's head, tail and unit axis in world space, or None if absent."""
    # Blender's FBX importer keeps Mixamo's namespace, so `mixamorig:Head`.
    # `tools/doll.html` documents the other spelling; both are tried here for
    # the same reason — the two halves of this project see different names.
    b = arm.data.bones.get(name) or arm.data.bones.get(name.replace(':', ''))
    if not b:
        return None
    m = arm.matrix_world
    head, tail = m @ b.head_local, m @ b.tail_local
    axis = (tail - head)
    if axis.length < 1e-6:
        return None
    return head, tail, axis.normalized(), axis.length


def girth(arm, body, name, head, axis, t0, t1, pct=0.92):
    """
    How wide the body is around this bone, over the span the plate covers.

    Taken from the vertices the *body* weights to the bone, which is the only
    definition that survives changing character: a Paladin's chest and X Bot's
    are different numbers but the same query. `pct` trims the tail so one
    stray vertex on a belt or a strap does not inflate the whole plate.
    """
    gi = body.vertex_groups.get(name) or body.vertex_groups.get(name.replace(':', ''))
    if not gi:
        return None
    mw = body.matrix_world
    lo, hi = t0, t1
    radii = []
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == gi.index), 0.0)
        if w < 0.2:
            continue
        p = mw @ v.co
        d = (p - head).dot(axis)          # how far along the bone
        if d < lo or d > hi:
            continue
        radii.append(((p - head) - axis * d).length)
    if len(radii) < 8:
        return None
    radii.sort()
    return radii[min(len(radii) - 1, int(len(radii) * pct))]


# --------------------------------------------------------------- the plates

def frame_at(axis):
    """A right-handed basis with `axis` as +Y, for orienting a cylinder."""
    up = Vector((0, 0, 1))
    if abs(axis.dot(up)) > 0.95:
        up = Vector((0, 1, 0))
    x = axis.cross(up).normalized()
    z = x.cross(axis).normalized()
    return Matrix((x, axis, z)).transposed().to_4x4()


def plate(name, arm, body, bone, t0, t1, pad=1.10, sides=12, flat=1.0, taper=1.0):
    """
    One rigid piece wrapped around a span of one bone.

    `t0`/`t1` are fractions of the bone's length, `pad` is how far the plate
    stands off the flesh, and `flat` squashes it across the body — a pauldron
    is rounder than a greave. The radius itself is never passed in; it is
    measured (see `girth`).
    """
    ax = bone_axis(arm, bone)
    if not ax:
        return None
    head, tail, axis, length = ax
    a, b = length * t0, length * t1
    r = girth(arm, body, bone, head, axis, a, b)
    if not r:
        return None

    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=sides,
                          radius1=r * pad, radius2=r * pad * taper,
                          depth=(b - a))
    # `create_cone` builds along +Z at the origin; the basis below turns +Y
    # into the bone, so the cylinder is made +Y-long first.
    bmesh.ops.rotate(bm, verts=bm.verts,
                     matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    bmesh.ops.scale(bm, verts=bm.verts, vec=Vector((1.0, 1.0, flat)))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=r * 0.06)
    bm.to_mesh(me)
    bm.free()

    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = (Matrix.Translation(head + axis * ((a + b) / 2))
                       @ frame_at(axis))
    return ob


def dome(name, arm, body, bone, pad=1.12, cut=-0.15):
    """A helm: the top of a sphere sized to the head, opened below `cut`."""
    ax = bone_axis(arm, bone)
    if not ax:
        return None
    head, tail, axis, length = ax
    r = girth(arm, body, bone, head, axis, -length, length * 2, pct=0.95)
    if not r:
        return None
    centre = head + axis * (length * 0.55)

    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r * pad)
    # Everything below the brow line is inside the head and never seen; cutting
    # it keeps the helm from z-fighting the jaw when the clip tilts the neck.
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < r * cut], context='VERTS')
    bmesh.ops.rotate(bm, verts=bm.verts,
                     matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=r * 0.05)
    bm.to_mesh(me)
    bm.free()

    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = Matrix.Translation(centre) @ frame_at(axis)
    return ob


# ----------------------------------------------------------------- skinning

def skin(ob, arm, body):
    """
    Give the piece the body's weights, then the body's armature.

    **Data Transfer, not automatic weights.** Automatic weights would compute a
    fresh smooth falloff for the plate and bend it across the joint; this
    copies whatever the body already does, so the plate moves exactly with the
    flesh it covers and stays rigid where that flesh is rigid.
    `POLYINTERP_NEAREST` samples the nearest body face rather than the nearest
    vertex, which matters at a shoulder where two bones meet within a
    centimetre of each other.
    """
    # The operator reads the *active* object and writes the selected ones, so
    # the body is made active and the plate is merely selected. Doing it the
    # other way round needs `use_reverse_transfer`, which then swaps the two
    # layer-select enums under you and rejects `ALL` as a destination.
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    bpy.ops.object.data_transfer(
        data_type='VGROUP_WEIGHTS',
        use_create=True,
        vert_mapping='POLYINTERP_NEAREST',
        layers_select_src='ALL',        # every bone the body knows about
        layers_select_dst='NAME',       # matched onto the plate by bone name
        mix_mode='REPLACE')

    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    ob.parent = arm
    ob.matrix_parent_inverse = arm.matrix_world.inverted()
    return weights(ob)


def weights(ob):
    """
    The three bones this piece leans on hardest, and how hard.

    Printed by `--check` because a failed transfer is invisible: a plate with
    no weights at all still exports, still renders, and still stands in
    roughly the right place in the bind pose — it only reveals itself as a
    box floating beside the foot once a clip moves the skeleton.
    """
    tot = {}
    for v in ob.data.vertices:
        for g in v.groups:
            n = ob.vertex_groups[g.group].name
            tot[n] = tot.get(n, 0) + g.weight
    return sorted(tot.items(), key=lambda kv: -kv[1])[:3]


def material(name, colour, metal, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*colour, 1.0)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return m


# ------------------------------------------------------------------- tiers
#
# Five rungs that read as *more* armour, not merely better-coloured armour —
# the tier has to be legible at road size, where a hue change is nothing and a
# new silhouette is everything. So each rung adds a piece as well as changing
# the metal, and T1 is deliberately near-bare: the joints it leaves uncovered
# are the character's own cloth, which is the same rule the painted bands
# followed.

TIERS = [
    # name,        colour,                 metal, rough,  pieces
    ('T1', (0.21, 0.14, 0.09), 0.05, 0.80, ['boots', 'belt']),
    ('T2', (0.30, 0.29, 0.31), 0.55, 0.62, ['boots', 'belt', 'chest']),
    ('T3', (0.44, 0.45, 0.49), 0.85, 0.42, ['boots', 'belt', 'chest', 'pauldrons', 'gauntlets']),
    ('T4', (0.58, 0.60, 0.66), 0.95, 0.28, ['boots', 'belt', 'chest', 'pauldrons', 'gauntlets', 'greaves', 'helm']),
    ('T5', (0.72, 0.60, 0.28), 1.00, 0.18, ['boots', 'belt', 'chest', 'pauldrons', 'gauntlets', 'greaves', 'helm']),
]

# Each piece is one or more spans of one bone. Left and right are separate
# objects rather than one mirrored mesh, because the transfer reads the body
# under each and the two sides are not identical on every character.
PIECES = {
    'chest':     [('mixamorig:Spine1', 0.0, 1.0, 1.16, 14, 0.86, 1.0),
                  ('mixamorig:Spine2', 0.0, 1.0, 1.14, 14, 0.86, 0.94)],
    'belt':      [('mixamorig:Hips', 0.0, 0.8, 1.14, 14, 0.90, 1.0)],
    'pauldrons': [('mixamorig:LeftArm', -0.05, 0.34, 1.34, 12, 1.0, 0.78),
                  ('mixamorig:RightArm', -0.05, 0.34, 1.34, 12, 1.0, 0.78)],
    'gauntlets': [('mixamorig:LeftForeArm', 0.45, 1.05, 1.18, 10, 1.0, 0.92),
                  ('mixamorig:RightForeArm', 0.45, 1.05, 1.18, 10, 1.0, 0.92)],
    'greaves':   [('mixamorig:LeftLeg', 0.05, 0.75, 1.16, 10, 1.0, 0.86),
                  ('mixamorig:RightLeg', 0.05, 0.75, 1.16, 10, 1.0, 0.86)],
    # A boot is the one plate whose bone runs *along* the camera rather than
    # across it, so it is the one that reads as a plank if it is too long or
    # too proud: the first bake put a brown board under each foot. Short of the
    # toe, close to the flesh, and slightly flattened.
    'boots':     [('mixamorig:LeftFoot', -0.15, 0.72, 1.10, 10, 0.88, 0.86),
                  ('mixamorig:RightFoot', -0.15, 0.72, 1.10, 10, 0.88, 0.86)],
    # The helm is a dome and ignores every field but the bone and the padding.
    'helm':      [('mixamorig:Head', 0.0, 1.0, 1.12, 16, 1.0, 1.0)],
}


def build(arm, body):
    made, missing = 0, set()
    for tier, colour, metal, rough, pieces in TIERS:
        mat = material(f'{tier}_metal', colour, metal, rough)
        for piece in pieces:
            for n, spec in enumerate(PIECES[piece]):
                bone, t0, t1, pad, sides, flat, taper = spec
                name = f'{tier}_{piece}{n}'
                ob = (dome(name, arm, body, bone, pad)
                      if piece == 'helm' else
                      plate(name, arm, body, bone, t0, t1, pad, sides, flat, taper))
                if not ob:
                    missing.add(f'{piece}:{bone}')
                    continue
                ob.data.materials.append(mat)
                top = skin(ob, arm, body)
                if CHECK:
                    print(f'check {name}: ' + (', '.join(f'{n}={w:.1f}' for n, w in top) or 'NO WEIGHTS'))
                made += 1
    return made, missing


def main():
    fbx, out = resolve(ARGS['fbx']), resolve(ARGS['out'])
    clear()
    arm, body = import_character(fbx)
    if ARGS['kit']:
        # A kit dropped into art/armour/ joins the scene alongside the
        # generated plates; its pieces are skinned by the same transfer, and
        # naming them `T3_helm` in the kit file is all it takes to place them.
        bpy.ops.import_scene.gltf(filepath=resolve(ARGS['kit']))
        for ob in bpy.context.selected_objects:
            if ob.type == 'MESH' and ob.name[:2] in ('T1', 'T2', 'T3', 'T4', 'T5'):
                skin(ob, arm, body)

    made, missing = build(arm, body)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_visible=False,            # every tier ships; the baker hides four
        export_skins=True,
        export_animations=False,      # clips still come from art/mixamo/*.fbx
        export_apply=False)
    print(f'armour: {made} pieces, {os.path.relpath(out, ROOT)}')
    if missing:
        print(f'armour: no body weights for {", ".join(sorted(missing))}')


main()
