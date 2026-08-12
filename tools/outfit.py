# The armoury, as five outfits from a modular kit, worn by the Mixamo doll.
#
#   blender --background --python tools/outfit.py -- --out art/armour/knight.glb
#   blender --background --python tools/outfit.py -- --out art/armour/knight.glb \
#     --fbx "art/mixamo/X Bot.fbx"
#
# **This supersedes the generated plates in `tools/armour.py`, and it is not a
# change of method but of what the hero *is*.** That script wraps cylinders
# around a character's limbs: at road size the five rungs read, and at any size
# larger they read as grey boxes, because a primitive is not armour.
# Quaternius' Modular Character Outfits are modelled and textured per slot, and
# the pack is built so an outfit *replaces* the body rather than sitting on it
# — its own readme says to keep only the head, because each outfit carries its
# own arms, legs and torso. So the tiers stop being five coats of paint on one
# doll and become five characters.
#
# **The outfits are bound to the Mixamo skeleton; the kit's own rig is thrown
# away.** The kit is skinned to an Unreal-style skeleton — `pelvis`,
# `spine_01`, `upperarm_l` — which is T-posed like Mixamo and maps one-for-one
# onto it, and the obvious move is to rename 62 bones and let the existing clip
# library drive it. That was tried and it fails: **the names match and the bone
# rolls do not**, so the first clip's hip rotation tips the entire figure and
# all five tiers bake lying on their backs. The bind pose is upright and
# perfect, which is what proves the geometry innocent and the retarget guilty.
#
# Binding to the real Mixamo skeleton removes the problem rather than solving
# it: no rest-pose algebra, no per-bone roll correction, and every clip drives
# the outfit exactly as it drives X Bot today. The weights come from the same
# Data Transfer that `tools/armour.py` documents — the body's own weights,
# copied by nearest face, never auto-generated.
#
# Only the head survives from the Mixamo character, per the kit's readme:
# keeping his whole body would clip through every outfit, and keeping none of
# it would leave the Peasant and the Noble — the two rungs with no helm — with
# no head at all.

import bpy
import bmesh
import sys
import os
from mathutils import Vector, Matrix

KIT = ('/Volumes/Z-Drive/Youtube-game/crypt-heroes/Modular Character Outfits - '
       'Fantasy[Source]/Exports/glTF (Godot-Unreal)/Modular Parts')
# The free Universal Base Characters pack, for the one part the outfits do not
# carry. Only the head above the neck is kept; see `base_head`.
HEAD = ('/Volumes/Z-Drive/Youtube-game/crypt-heroes/Universal Base Characters[Standard]/'
        'Base Characters/Godot - UE/Superhero_Male_FullBody.gltf')

# The armoury's other half: what he holds.
#
# **Real weapons, sized and hung off the hand bone in Blender.** Until now the
# knight swung a sword built out of primitives by `attachSword` in
# `tools/doll.html` — the same grey-box problem the plates had, and still
# visible in every sheet. These are modelled, and they arrive through the same
# door the outfits do: skinned rigidly to `mixamorig:RightHand`, named
# `T<n>_weapon`, so the tier that shows the armour shows the blade that goes
# with it and nothing downstream learns a new concept.
#
# `length` is the finished weapon in hero-heights, not in the pack's units: the
# pack ships a 5.5-unit sword and the hero is 1.8 tall, so a raw import is a
# telegraph pole. A longsword is a bit over half a man; a dagger a fifth.
# **No dagger.** Every idle and every attack clip in the library is a
# two-handed guard, and a knife held in both fists at chest height reads as a
# man about to peel something. Tier 1 gets the same blade as tier 2 at a
# shorter length — a shortsword — which is a real distinction and costs no
# extra model.
# **Bigger than life, on purpose.** Every clip in the library is a greatsword
# stance — both hands on the hilt, the blade held out from the body — and a
# realistically-proportioned sword in that pose reads as a man gripping a
# butter knife with unusual seriousness. These run from a bit over half a
# man's height to nearly all of it, which is what the animation was drawn for.
WEAPONS = [
    ('Sword', 0.58),
    ('Sword', 0.70),
    ('Sword_2', 0.80),
    ('Sword_Big', 0.96),
    ('Sword_Golden', 0.90),
]
WEAPON_DIR = ('/Volumes/Z-Drive/Youtube-game/crypt-heroes/art/Story/kit/waepons/FBX')

# The ladder, ordered by how much metal is on it rather than by the pack's own
# naming: cloth, leather with a pauldron, court dress with a gorget, mail under
# plate, and full plate with horns. The runtime's `row = wornTier - 1` indexes
# these, so tier 1 is row 0.
TIERS = [
    ['Male_Peasant_Body', 'Male_Peasant_Arms', 'Male_Peasant_Legs', 'Male_Peasant_Feet'],
    ['Male_Ranger_Body', 'Male_Ranger_Arms', 'Male_Ranger_Legs', 'Male_Ranger_Feet_Boots',
     'Male_Ranger_Head_Hood', 'Male_Ranger_Acc_Pauldron'],
    ['Male_Noble_Body', 'Male_Noble_Arms', 'Male_Noble_Legs', 'Male_Noble_Feet',
     'Male_Noble_Acc_Gorget', 'Male_Noble_Acc_Pauldron'],
    ['Male_Knight_Body_Cloth', 'Male_Knight_Arms', 'Male_Knight_Legs_Armor',
     'Male_Knight_Feet_Armor', 'Male_Knight_Acc_Pauldron_Round', 'Male_Knight_Head_Armet'],
    ['Male_Knight_Body_Armor', 'Male_Knight_Arms', 'Male_Knight_Legs_Armor',
     'Male_Knight_Feet_Armor', 'Male_Knight_Acc_Pauldron_Spike', 'Male_Knight_Head_Armet',
     'Male_Knight_Head_Horns'],
]


def parse_args():
    argv = sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else []
    out = {'out': None, 'kit': KIT, 'fbx': 'art/mixamo/X Bot.fbx', 'tex': '512', 'head': HEAD,
           'subdiv': '1'}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip('-')
        if k in out:
            out[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    if not out['out']:
        raise SystemExit('usage: outfit.py -- --out <file.glb> [--kit <parts dir>] [--fbx <character>]')
    return out


ARGS = parse_args()
TEX = int(ARGS['tex'])          # the size every texture is taken down to
SUBDIV = int(ARGS['subdiv'])    # smoothing passes before export; see `smooth`
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
resolve = lambda p: p if os.path.isabs(p) else os.path.join(ROOT, p)


# ------------------------------------------------------------- the character

def import_character(path):
    """The Mixamo skeleton, and the body whose weights every outfit copies."""
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']

    # The body is the mesh weighted to the most bones, not the one with the
    # most vertices — the Paladin's densest mesh is his head, weighted to
    # `Head` alone, and picking it put his entire armoury on his neck.
    def reach(o):
        used = set()
        for v in o.data.vertices:
            for g in v.groups:
                if g.weight > 0.01:
                    used.add(g.group)
        return len(used)
    body = max(meshes, key=reach)

    # Blender takes a Y-up Mixamo file in by rotating the armature object 90°
    # about X and scaling it by a hundredth; the glTF exporter then applies its
    # own conversion on top and the two do not cancel, so the doll bakes lying
    # on its back. Applying them here leaves an identity transform to convert.
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return arm, body


def bounds(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def base_head(path, xf):
    """
    The kit's own head, taken off its base character and kept alone.

    **The head has to come from the kit, not from the Mixamo doll.** X Bot's
    head is a different sculpt at a different scale, and dropped into these
    outfits it reads as a pale balloon sitting on the collar — at road size it
    was the loudest thing on the figure. This one is modelled to the same
    proportions as the shoulders it sits on.

    The free pack ships only the `Superhero` base characters rather than the
    `Regular` ones the outfits' skin maps were painted for. That costs nothing
    here: everything below the neck is deleted, and a head is a head.
    """
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH' and o.vertex_groups]
    if not meshes:
        raise SystemExit(f'no skinned mesh in {path}')
    head = max(meshes, key=lambda o: len(o.data.vertices))

    keep = {g.index for g in head.vertex_groups if g.name in ('Head', 'neck_01')}
    bm = bmesh.new()
    bm.from_mesh(head.data)
    layer = bm.verts.layers.deform.active
    doomed = [v for v in bm.verts
              if sum(w for gi, w in v[layer].items() if gi in keep) < 0.5] if layer else []
    bmesh.ops.delete(bm, geom=doomed, context='VERTS')
    bm.to_mesh(head.data)
    bm.free()

    head.modifiers.clear()
    head.vertex_groups.clear()
    mw = head.matrix_world.copy()
    head.parent = None
    head.matrix_world = mw
    head.name = 'Head'
    apply_fit([head], xf)

    spare = [o for o in fresh if o is not head]
    for o in spare:
        bpy.data.objects.remove(o, do_unlink=True)
    return head


def head_only(body, arm):
    """
    A copy of the character's head, and nothing below the collar.

    The kit's readme asks for exactly this — the outfits carry their own torso
    and limbs, so a whole body underneath pokes through every one of them —
    and it is also what keeps two rungs from baking headless, since the Peasant
    and the Noble cover nothing above the shoulders.

    It doubles as the doll's *ruler*: `tools/doll.html` sizes the figure from
    the meshes that are not tiered, and the head is the only untiered mesh
    left, so crown-to-sole cannot drift when a helmet appears.
    """
    head = body.copy()
    head.data = body.data.copy()
    head.name = 'Head'
    bpy.context.scene.collection.objects.link(head)

    keep = {g.index for g in head.vertex_groups
            if g.name in ('mixamorig:Head', 'mixamorig:HeadTop_End', 'mixamorig:Neck')}
    bm = bmesh.new()
    bm.from_mesh(head.data)
    bm.verts.ensure_lookup_table()
    layer = bm.verts.layers.deform.active
    doomed = []
    for v in bm.verts:
        w = sum(wt for gi, wt in v[layer].items() if gi in keep) if layer else 0
        if w < 0.6:
            doomed.append(v)
    bmesh.ops.delete(bm, geom=doomed, context='VERTS')
    bm.to_mesh(head.data)
    bm.free()
    return head


# ------------------------------------------------------------- the outfits

def import_parts():
    """Every tier's parts, stripped of the kit's own rig, tagged `T<n>_`."""
    worn, missing = [], []
    for n, parts in enumerate(TIERS, start=1):
        for part in parts:
            path = os.path.join(ARGS['kit'], f'{part}.gltf')
            if not os.path.exists(path):
                missing.append(part)
                continue
            before = set(bpy.context.scene.objects)
            bpy.ops.import_scene.gltf(filepath=path)
            fresh = [o for o in bpy.context.scene.objects if o not in before]

            # **Every part file ships a 42-vertex `Icosphere` alongside the
            # armour, spanning z −1…1 and skinned to nothing.** It is invisible
            # in a viewport and ruinous to a measurement: counted in, the kit
            # reads 2.84 units tall instead of 1.84, `fit` shrinks every outfit
            # by a third, and the boots come to rest on the thighs — which is
            # what the weights said before this line existed
            # (`Feet: LeftUpLeg=851`). A real part is skinned; the helper is not.
            meshes = [o for o in fresh if o.type == 'MESH'
                      and (o.vertex_groups or any(d.type == 'ARMATURE' for d in o.modifiers))]
            # Everything to delete is listed before anything is deleted:
            # removing an object invalidates every Python reference to it, and
            # a later `o.type` on a stale one raises `ReferenceError: StructRNA
            # of type Object has been removed`.
            spare = [o for o in fresh
                     if o.type in ('ARMATURE', 'EMPTY') or (o.type == 'MESH' and o not in meshes)]
            for o in spare:
                bpy.data.objects.remove(o, do_unlink=True)
            for m in meshes:
                # The kit's armature modifier and its vertex groups go with the
                # kit's rig. What is kept is the mesh in its bind pose, which is
                # a T-pose — the same T-pose the Mixamo skeleton rests in, and
                # the entire reason this fit works without posing anything.
                m.modifiers.clear()
                m.vertex_groups.clear()
                mw = m.matrix_world.copy()
                m.parent = None                       # unparenting drops the
                m.matrix_world = mw                   # transform; put it back
                m.name = f'T{n}_{part}'
                worn.append(m)

    return worn, missing


def fit(worn, body):
    """
    Scale the outfits onto this character's proportions.

    One uniform factor, from crown-to-sole of the kit against crown-to-sole of
    the body, applied about the floor so the feet stay on it. Uniform and not
    per-axis on purpose: a shoulder width matched by squashing turns a round
    pauldron into an oval, and the two figures are both realistic humanoids
    within a few percent to begin with. The Data Transfer that follows absorbs
    what is left, because it asks *which bone is nearest*, not *how far*.
    """
    klo, khi = bounds(worn)
    blo, bhi = bounds([body])
    xf = {
        's': (bhi.z - blo.z) / (khi.z - klo.z),
        'from': Vector(((klo.x + khi.x) / 2, (klo.y + khi.y) / 2, klo.z)),
        'to': Vector(((blo.x + bhi.x) / 2, (blo.y + bhi.y) / 2, blo.z)),
    }
    apply_fit(worn, xf)
    return xf


def apply_fit(objs, xf):
    """
    Baked into the vertices rather than left on the object, so the export
    carries no transform for three to disagree about — and so the head can be
    put through the *same* fit as the outfits, which is the only way it lands
    on the right shoulders.
    """
    for m in objs:
        mw = m.matrix_world.copy()
        inv = mw.inverted()
        for v in m.data.vertices:
            p = mw @ v.co
            v.co = inv @ ((p - xf['from']) * xf['s'] + xf['to'])


def hand_grip(arm):
    """
    Where a weapon sits in the fist, and which way it points.

    Measured off the hand's own bones rather than typed in, the same way
    `attachSword` does it in tools/doll.html: **the grip runs across the fist
    along the knuckles**, index to little finger, and the blade leaves on the
    index side. Everything is derived from that one measurement, so a weapon is
    the right size and angle for whatever hand it is put in.
    """
    bone = lambda n: arm.data.bones.get(n) or arm.data.bones.get(n.replace(':', ''))
    hand = bone('mixamorig:RightHand')
    index = bone('mixamorig:RightHandIndex1')
    pinky = bone('mixamorig:RightHandPinky1')
    middle = bone('mixamorig:RightHandMiddle1')
    if not (hand and index and pinky and middle):
        return None
    m = arm.matrix_world
    pi, pp, pm = m @ index.head_local, m @ pinky.head_local, m @ middle.head_local
    grip = (pi - pp).normalized()                       # little finger → index
    fingers = (pm - (m @ hand.head_local)).normalized()
    flat = grip.cross(fingers).normalized()             # across the palm
    side = flat.cross(grip).normalized()

    # **Right-handed, or the weapon renders as nothing.** A basis with a
    # negative determinant is a mirror: it flips every face's winding, and with
    # ordinary front-face culling the mesh becomes invisible rather than
    # obviously wrong. The first pass built `side = grip × flat`, whose
    # determinant is −1, and the sword was in the fist at the right size and
    # simply could not be seen. `attachSword` in tools/doll.html carries the
    # same warning for the same reason.
    if side.cross(flat).dot(grip) < 0:
        side = -side
    # The palm's centre as well as the knuckle line: a weapon seated on the
    # knuckles alone sits on top of the hand rather than in it.
    palm = (pi + pp + pm + (m @ hand.head_local)) / 4
    return (pi + pp) / 2, grip, flat, side, palm


def add_weapon(name, length, tier, arm, body):
    """One weapon, scaled to the hero and rigid in his fist."""
    path = os.path.join(WEAPON_DIR, f'{name}.fbx')
    if not os.path.exists(path):
        return None
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    if not meshes:
        return None

    # One object, whatever the file split it into.
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    for o in fresh:
        if o.type != 'MESH' and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    # **The pack models blade-along-+Z with the grip at the origin**, which is
    # what makes this placeable at all: the origin is the thing to put in the
    # fist and +Z is the direction to point out of it.
    pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
    span = max(p.z for p in pts) - min(p.z for p in pts)
    body_h = bounds([body])[1].z - bounds([body])[0].z
    s = (length * body_h) / max(1e-6, span)

    grip = hand_grip(arm)
    if not grip:
        return None
    at, along, flat, side, palm = grip

    # **The fist has to close *around* the grip, not beside the pommel.** Two
    # corrections, and the first render needed both. The knuckle midpoint is the
    # top of the fist, so the hilt is pulled back a third of the way towards the
    # wrist to pass through the palm; and the pack models the grip *above* its
    # origin, so placing the origin in the hand leaves the hand holding the
    # pommel with the whole hilt sticking out. Sliding it back along its own
    # axis by a twelfth of its length puts the wrapped part in the fingers.
    seat = at + (palm - at) * 0.32 - along * (length * body_h * 0.085)
    ob.matrix_world = (Matrix.Translation(seat)
                       @ Matrix((side, flat, along)).transposed().to_4x4()
                       @ Matrix.Scale(s, 4))
    ob.name = f'T{tier}_weapon'

    # **The pack's materials arrive with an alpha of zero.** Blender's FBX
    # importer reads a transparency factor these files did not mean, the glTF
    # exporter writes `baseColorFactor` alpha 0, and three obeys it — so the
    # weapon renders lit, depth-written and completely invisible, because the
    # doll bakes on a transparent background and zero-alpha pixels take the
    # background's nothing with them. It is the most confusing possible failure:
    # the mesh is in the fist, the right size, `visible === true`, and not there.
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:
            continue
        mat.blend_method = 'OPAQUE'
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Alpha'].default_value = 1.0

    # Rigid: every vertex on the hand bone, no transfer and no falloff. A
    # weapon that flexes is a weapon made of rubber, and Data Transfer would
    # give it the flesh's weights — which is exactly the wrong answer here.
    g = ob.vertex_groups.new(name='mixamorig:RightHand')
    g.add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    ob.parent = arm
    return ob


def skin(ob, arm, body):
    """
    Give the outfit the body's weights, then the body's armature.

    **Data Transfer, not automatic weights.** Automatic weights compute a fresh
    smooth falloff and bend a rigid plate across the joint like rubber; this
    copies whatever the body already does, so a pauldron follows exactly the
    bone the shoulder under it follows. `POLYINTERP_NEAREST` samples the
    nearest body *face* rather than the nearest vertex, which matters where two
    bones meet within a centimetre of each other.
    """
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body     # active is the source
    bpy.ops.object.data_transfer(
        data_type='VGROUP_WEIGHTS', use_create=True,
        vert_mapping='POLYINTERP_NEAREST',
        layers_select_src='ALL', layers_select_dst='NAME', mix_mode='REPLACE')

    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    ob.parent = arm

    tot = {}
    for v in ob.data.vertices:
        for g in v.groups:
            n = ob.vertex_groups[g.group].name
            tot[n] = tot.get(n, 0) + g.weight
    return sorted(tot.items(), key=lambda kv: -kv[1])[:2]


def dedupe_images():
    """
    One copy of each texture, however many parts asked for it.

    **Every part file embeds its own copy of the pack's 2048 maps**, and the
    Knight's base colour, normal and ORM arrive once per part that wears them.
    Imported blind, the five tiers exported to a **149 MB** GLB — which the
    game never sees, but the baker parses once per tier per sheet, so it is the
    difference between a bake measured in minutes and one measured in an hour.
    Blender names the duplicates `T_Knight_BaseColor.001`, so the base name is
    the identity and the suffix is the copy.
    """
    first = {}
    for img in bpy.data.images:
        first.setdefault(img.name.split('.')[0], img)
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                node.image = first[node.image.name.split('.')[0]]
    for img in list(bpy.data.images):
        if img.users == 0:
            bpy.data.images.remove(img)

    # **And every map comes down to 512.** The pack ships 4096² textures, which
    # is right for a character filling a screen and ludicrous for one standing
    # 230 pixels tall in a sprite cell: sixteen of them are 150 MB, and the
    # cell cannot resolve a hundredth of it. Dedupe alone did not shrink the
    # file at all — the duplicates were never the weight, the resolution was.
    for img in bpy.data.images:
        if img.size[0] > TEX:
            img.scale(TEX, TEX)


def smooth(objs):
    """
    Subdivide everything before it is exported.

    **The renderer is offline, so polygons are free.** The kit is stylised
    low-poly — 129,000 triangles across all five tiers, and already 96% smooth
    shaded, so the faceting that shows at portrait size is real geometry and
    not a shading bug. Nothing downstream ever sees a triangle: the GLB is
    rendered to a sprite sheet once and the game draws pixels. So the only cost
    of a subdivision pass is bake time, and the return is a silhouette that
    stops reading as a cut gem at four hundred pixels tall.

    Catmull-Clark rather than simple: simple subdivision adds vertices without
    moving them, which is more triangles and exactly the same outline.
    """
    if not SUBDIV:
        return
    for o in objs:
        if o.type != 'MESH':
            continue
        mod = o.modifiers.new('Subdivision', 'SUBSURF')
        mod.levels = mod.render_levels = SUBDIV
        # Keeps plate edges from melting: the limit surface rounds every
        # corner, and armour is meant to have corners.
        mod.use_limit_surface = False


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, body = import_character(resolve(ARGS['fbx']))
    worn, missing = import_parts()
    if not worn:
        raise SystemExit('no parts imported — check --kit')

    xf = fit(worn, body)
    for m in worn:
        top = skin(m, arm, body)
        print(f'outfit {m.name}: ' + (', '.join(f'{n}={w:.0f}' for n, w in top) or 'NO WEIGHTS'))

    for n, (name, length) in enumerate(WEAPONS, start=1):
        w = add_weapon(name, length, n, arm, body)
        print(f'outfit T{n} weapon: {name}' + ('' if w else ' — MISSING'))

    head = base_head(ARGS['head'], xf)
    skin(head, arm, body)
    dedupe_images()
    bpy.data.objects.remove(body, do_unlink=True)

    smooth([o for o in bpy.context.scene.objects if o.type == 'MESH'])

    out = resolve(ARGS['out'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_visible=False,
        export_skins=True, export_animations=False,
        # **Applied, or the subdivision never leaves Blender.** The exporter
        # evaluates every modifier except the armature, which is exactly the
        # split wanted here: denser meshes, skinning untouched.
        export_apply=True)
    print(f'outfit: {len(worn)} parts over {len(TIERS)} tiers, fitted x{xf["s"]:.3f}, '
          f'{os.path.relpath(out, ROOT)}')
    if missing:
        print(f'outfit: missing from the kit — {", ".join(missing)}')


main()
