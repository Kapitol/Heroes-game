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

# Hair, which the base pack ships separately and **already rigged to the head
# bone** — so it needs no weight transfer, only the same fit the head gets and a
# rigid bind to `mixamorig:Head`. `Hair_Long`, `Hair_SimpleParted`, `Hair_Buns`,
# `Hair_Buzzed`, `Hair_Beard` and `Eyebrows_Regular` are the set.
HAIR_DIR = ('/Volumes/Z-Drive/Youtube-game/crypt-heroes/Universal Base Characters[Standard]/'
            'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)')

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
           'subdiv': '1', 'parts': None, 'weapon': None, 'shield': None, 'grip': 'fist', 'stiff': None, 'hand': 'Right', 'hair': None, 'extra': None}
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

# **One named outfit instead of the five-rung ladder.** `--parts` takes a comma
# separated list of the kit's own part names and bakes exactly that, as a single
# tier. The ladder above is the *warrior's* progression and belongs to him; the
# other three at the fire are not tiers of anything — they are one character
# each, and asking for five rows of a druid would bake four rows nobody reads.
#
#   --parts Male_Wizard_Body,Male_Wizard_Arms,Male_Wizard_Legs,Male_Wizard_Feet
#
# The pack's parts are listed in `Exports/glTF (Godot-Unreal)/Modular Parts`.
if ARGS['parts']:
    TIERS = [[p.strip() for p in ARGS['parts'].split(',') if p.strip()]]

# **What the single-tier character holds**, since the ladder's five blades are
# the warrior's. `--weapon none` gives empty hands; `--weapon Spear@0.95` hangs
# one model at one length. The models are in `WEAPON_DIR`: Claymore, Scythe,
# Spear, Hammer_Double, the bows and shields, and the four swords the ladder
# already uses.
if ARGS['weapon']:
    if ARGS['weapon'].lower() == 'none':
        WEAPONS = []
    else:
        _name, _, _len = ARGS['weapon'].partition('@')
        WEAPONS = [(_name, float(_len or 0.8))]
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
    # **Every mesh the FBX brought, kept for deletion later.** X Bot ships two:
    # the body, and a `Beta_Joints` pad mesh with no texture and a flat dark red
    # base colour. Only `body` was ever removed, so the joint pads were being
    # subdivided, exported and *rendered* — dark red blobs poking through the
    # outfit at every elbow and knee. It is the same grey-box failure this file
    # opens by rejecting, smuggled in through the character rather than the kit.
    import_character.extras = [o for o in meshes if o is not body]

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
    # **The eyes and the brows are part of the head.** The pack splits the face
    # into three skinned meshes — body, `Eyes`, `Eyebrows` — and taking the one
    # with the most vertices takes the body and throws the other two away. Every
    # doll in the game has been baking with empty sockets and no brows, which is
    # invisible under an armet and is the entire face on the two tiers that have
    # no helm. They are joined in before the neck-down cull, which then leaves
    # them alone because they are already weighted to `Head`.
    face = [o for o in meshes if o is not head
            and any(m and m.name.split('.')[0] in ('MI_Eyes', 'MI_Hair_1')
                    for m in o.data.materials)]
    if face:
        bpy.ops.object.select_all(action='DESELECT')
        for o in face:
            o.select_set(True)
        head.select_set(True)
        bpy.context.view_layer.objects.active = head
        bpy.ops.object.join()

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

    # **Guarded, because the join above already removed some of these.**
    # `bpy.ops.object.join` deletes the objects it merges, and every Python
    # reference to one of them becomes a stale StructRNA that raises on touch —
    # not on access, on *use*. So the survivors are re-derived from the scene
    # rather than from the list `fresh` was built into.
    # **The pack's glTF asks for files that are not there.** It references
    # `T_Eye_Normal_png.png` and `T_Hair_1_Normal_png.png`; what is on disk is
    # `T_Eye_Normal.png` and `T_Hair_1_Normal.png`. Blender reports it as two
    # lines of `Error: Cannot read` in the middle of a long build and carries on
    # with a pink placeholder, which is easy to read as noise — and it is the
    # normal map for the eyes, on the one part of the figure a player looks at.
    for img in bpy.data.images:
        if img.filepath and not os.path.exists(bpy.path.abspath(img.filepath)):
            fixed = bpy.path.abspath(img.filepath).replace('_png.png', '.png')
            if os.path.exists(fixed):
                img.filepath = fixed
                img.reload()

    live = set(bpy.context.scene.objects)
    for o in [o for o in fresh if o in live and o is not head]:
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


def wire_pbr(meshes, path):
    """Hook a download's PBR maps up to its materials.

    **COLLADA arrives with no textures at all** — six materials at a flat 0.5
    grey, which is why the robe baked as a white sheet. The maps are on disk
    beside the model and named after the material that wants them
    (`lambert3_albedo.jpg`, `lambert3_normal.png`, `_roughness`, `_metallic`),
    which is the convention every Sketchfab export uses, so they can be found
    rather than configured.

    Colour space matters and is the one thing easy to get silently wrong: albedo
    is sRGB and everything else is raw data. A normal map read as sRGB is not
    obviously broken, it just lights slightly wrong everywhere.
    """
    root = os.path.dirname(path)
    dirs = [os.path.join(root, 'textures'),
            os.path.join(os.path.dirname(os.path.dirname(root)), 'textures'),
            root]
    def find(mat, kind):
        for d in dirs:
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                stem, ext = os.path.splitext(f)
                if ext.lower() not in ('.png', '.jpg', '.jpeg'):
                    continue
                if stem.lower() == f'{mat.lower()}_{kind}':
                    return os.path.join(d, f)
        return None

    done = set()
    for o in meshes:
        for m in o.data.materials:
            if not m or m.name in done:
                continue
            done.add(m.name)
            m.use_nodes = True
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not b:
                continue
            fam = m.name.split('.')[0]
            for kind, socket, srgb in (('albedo', 'Base Color', True),
                                       ('roughness', 'Roughness', False),
                                       ('metallic', 'Metallic', False),
                                       ('normal', None, False)):
                f = find(fam, kind)
                if not f:
                    continue
                tex = nt.nodes.new('ShaderNodeTexImage')
                tex.image = bpy.data.images.load(f, check_existing=True)
                tex.image.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
                if socket:
                    nt.links.new(tex.outputs['Color'], b.inputs[socket])
                else:
                    nm = nt.nodes.new('ShaderNodeNormalMap')
                    nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
                    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])


def import_extra(spec, body):
    """Garment meshes from a model file that is not part of the kit.

    **A robe from outside the pack is still just a mesh over a body**, which is
    exactly what `skin`'s Data Transfer already handles — it asks *which bone is
    nearest*, not what the garment came from. So an outside download needs no
    new machinery, only two things the kit gives for free and it does not:

    - **Units.** The kit is modelled at the character's own scale; a download is
      whatever the author worked in. This robe is 155 units tall against a
      1.81-unit man, so it is normalised by height rather than by a guessed unit
      factor — `path@0.86` says "this garment is 86% of a person", which is what
      a robe from shoulder to floor is.
    - **Where the floor is.** Its origin is wherever the author left it, so it is
      dropped onto the body's own feet and centred across them.

    Anything Blender can import: `.dae`, `.glb`/`.gltf`, `.fbx`, `.obj`.
    """
    path, _, frac = spec.partition('@')
    frac = float(frac or 0.86)
    path = resolve(path)
    if not os.path.exists(path):
        return []
    ext = os.path.splitext(path)[1].lower()
    before = set(bpy.context.scene.objects)
    if ext == '.dae':
        bpy.ops.wm.collada_import(filepath=path)
    elif ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f'extra: cannot import {ext}')
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    for o in fresh:
        if o.type != 'MESH' and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    if not meshes:
        return []

    # Bake whatever transform the file arrived with, then measure it as one
    # garment rather than piece by piece — a belt and a cape are one costume and
    # scaling them apart would take it to bits.
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    wire_pbr(meshes, path)

    lo, hi = bounds(meshes)
    blo, bhi = bounds([body])
    sc = ((bhi.z - blo.z) * frac) / max(1e-6, hi.z - lo.z)
    centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    to = Vector(((blo.x + bhi.x) / 2, (blo.y + bhi.y) / 2, blo.z))
    for o in meshes:
        mw = o.matrix_world.copy()
        inv = mw.inverted()
        for v in o.data.vertices:
            v.co = inv @ (((mw @ v.co) - centre) * sc + to)
    return meshes


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
            # **And some of them are skinned, which is how one got through.**
            # The `vertex_groups` test below is the right test for most of the
            # pack, but in several parts the helper carries the same 50 groups
            # every real piece does — so it was worn, renamed `T1_<part>.002`
            # like a real mesh, and exported. Only its *data* still said
            # `Icosphere`, which is the name glTF writes, which is why it turned
            # up in the finished GLB under a name nothing in this file uses.
            #
            # It cost more than a stray mesh. doll.html sizes a doll by the union
            # of its meshes, and a sphere spanning z -1..1 makes every character
            # measure 2.81 units instead of 1.81 — so every doll this project
            # has ever baked came out at 64% of the height its `--fh` asked for,
            # and by *different* amounts, since a hood or a raised weapon moves
            # the top of the union. That is why the Warlock stood a head shorter
            # than the Paladin beside him.
            helper = lambda o: (o.data.name.split('.')[0] == 'Icosphere'
                                or len(o.data.vertices) <= 48)
            meshes = [o for o in fresh if o.type == 'MESH' and not helper(o)
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


def hand_grip(arm, side_of='Right'):
    """
    Where a weapon sits in the fist, and which way it points.

    Measured off the hand's own bones rather than typed in, the same way
    `attachSword` does it in tools/doll.html: **the grip runs across the fist
    along the knuckles**, index to little finger, and the blade leaves on the
    index side. Everything is derived from that one measurement, so a weapon is
    the right size and angle for whatever hand it is put in.
    """
    bone = lambda n: arm.data.bones.get(n) or arm.data.bones.get(n.replace(':', ''))
    hand = bone(f'mixamorig:{side_of}Hand')
    index = bone(f'mixamorig:{side_of}HandIndex1')
    pinky = bone(f'mixamorig:{side_of}HandPinky1')
    middle = bone(f'mixamorig:{side_of}HandMiddle1')
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


def stance(arm):
    """Which way is up and which way the figure faces, off its own bones.

    A blade is placed entirely from the fist — a grip is a grip whatever the
    body is doing. A shield is not: it hangs on the forearm with its face across
    the front of the body, so placing it needs to know where the front *is*, and
    the hand alone cannot say. Both axes are measured rather than assumed,
    because the FBX import applies a rotation and a scale of its own and any
    guess about which world axis is up survives exactly until that changes.
    """
    bone = lambda n: arm.data.bones.get(n) or arm.data.bones.get(n.replace(':', ''))
    hips, head = bone('mixamorig:Hips'), bone('mixamorig:Head')
    la, ra = bone('mixamorig:LeftArm'), bone('mixamorig:RightArm')
    if not (hips and head and la and ra):
        return None
    m = arm.matrix_world
    up = ((m @ head.head_local) - (m @ hips.head_local)).normalized()
    across = ((m @ la.head_local) - (m @ ra.head_local)).normalized()   # right → left
    # Right-handed and forward: with `across` running to the left and `up` up,
    # their cross is the way the chest points.
    facing = across.cross(up).normalized()
    return up, across, facing


def add_shield(name, length, arm, body, tier):
    """A shield, on the forearm rather than in the fist.

    **The pack models a shield centred on its own origin**, face in the XZ
    plane with the normal on Y — nothing like the blades, which run out of the
    origin along +Z with the grip at zero. So it cannot go through `add_weapon`:
    seating its origin in the palm would bury half of it in the hand and point
    its face at the floor.

    Placed from `stance` instead: height up the figure, face across the front,
    and pushed out from the palm along the forearm so the arm is behind it
    rather than through it.
    """
    ob = import_prop(name)
    if not ob:
        return None
    pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
    span = max(p.z for p in pts) - min(p.z for p in pts)      # its height
    body_h = bounds([body])[1].z - bounds([body])[0].z
    s = (length * body_h) / max(1e-6, span)

    grip = hand_grip(arm, 'Left')
    if not grip:
        return None
    at, along, flat, side, palm = grip

    # **In the hand's frame, not the world's.** The first version placed it on
    # the skeleton's own up-and-facing, which is correct in the rest pose and
    # wrong in every other: the shield is bound rigidly to `LeftHand`, so
    # whatever the clip does to that hand it also does to the shield. A shield
    # idle turns the left hand to hold one, and a shield placed on world axes
    # came out lying flat like a tray at waist height.
    #
    # So it takes the hand's own basis, the same one the blades use: its face
    # points out of the palm, its height runs across the knuckles, and its width
    # runs along them. Then the hand can do whatever the animation asks and the
    # shield stays on the arm.
    # Turned to face out. Straps and enarmes are modelled on the near side of
    # the pack's shield, so the unflipped basis presents the *back* of it to the
    # camera — two leather bars where the boss should be. Both the width and the
    # normal are negated rather than one, which keeps the basis right-handed: a
    # mirrored basis flips every face winding and the shield disappears under
    # ordinary back-face culling, which is the same trap `hand_grip` documents.
    seat = palm + flat * (length * body_h * 0.14)
    ob.matrix_world = (Matrix.Translation(seat)
                       @ Matrix((-along, -flat, side)).transposed().to_4x4()
                       @ Matrix.Scale(s, 4))
    ob.name = f'T{tier}_shield'
    dress_prop(ob)
    bind_prop(ob, arm, 'mixamorig:LeftHand')
    return ob


def dress_prop(ob):
    """Alpha, metal and roughness for a pack model that carries no maps."""
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
        # **And they arrive as flat paint.** The weapon FBXs carry no textures
        # at all — seven materials with a diffuse colour and nothing else — so
        # next to armour built from 4096-sourced maps the blade was a solid grey
        # shape. There is no map to restore, but there is a material: steel and
        # gold are metal, wood is not, and saying so is the whole difference
        # between a prop and a blade. Keyed off the pack's own material names.
        family = mat.name.split('.')[0]
        metal = family in ('Steel', 'LightSteel', 'DarkSteel', 'Gold', 'LightGold')
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Alpha'].default_value = 1.0
                node.inputs['Metallic'].default_value = 1.0 if metal else 0.0
                node.inputs['Roughness'].default_value = 0.28 if metal else 0.74



def import_prop(name):
    """One model out of the weapon pack, joined into a single object."""
    path = os.path.join(WEAPON_DIR, f'{name}.fbx')
    if not os.path.exists(path):
        return None
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    if not meshes:
        return None
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
    # **Bake the import transform into the vertices.** Both callers measure the
    # model in world space and then *replace* `matrix_world` with a basis of
    # their own — which silently maps the model's *local* axes, not the ones
    # that were measured. For the blades the two happen to agree; for a shield
    # they do not, and it comes out lying flat like a tray, held out in front at
    # waist height. Applying the transform makes local and world the same frame
    # and the measurement mean what it says.
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def bind_prop(ob, arm, bone_name):
    """Rigid: every vertex on one bone, no transfer and no falloff.

    A weapon that flexes is a weapon made of rubber, and Data Transfer would
    give it the flesh's weights — exactly the wrong answer for a held object."""
    g = ob.vertex_groups.new(name=bone_name)
    g.add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    ob.parent = arm
    return ob


def add_weapon(name, length, tier, arm, body):
    """One weapon, scaled to the hero and rigid in his fist."""
    ob = import_prop(name)
    if not ob:
        return None

    # **The pack models blade-along-+Z with the grip at the origin**, which is
    # what makes this placeable at all: the origin is the thing to put in the
    # fist and +Z is the direction to point out of it.
    pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
    span = max(p.z for p in pts) - min(p.z for p in pts)
    body_h = bounds([body])[1].z - bounds([body])[0].z
    s = (length * body_h) / max(1e-6, span)

    # **Which fist.** A clip decides this, not the character: `Staff-Idle`
    # closes the *left* hand around a shaft and leaves the right open, and a
    # staff bound to the right hand therefore leaves a left hand curled around
    # nothing — three long fingers hooked shut, which at 300 pixels reads as a
    # claw. It was reported twice as a deformed hand and it is a grip with
    # nothing in it.
    hand = ARGS['hand'] if ARGS['hand'] in ('Left', 'Right') else 'Right'
    grip = hand_grip(arm, hand)
    if not grip:
        return None
    at, along, flat, side, palm = grip

    # **A polearm is carried, not pointed.** The fist seating below runs the
    # model out along the knuckle line, which is right for a sword — a blade
    # leaves the hand in the direction the fingers curl — and wrong for anything
    # with a shaft. On the staff idles it laid the Druid's spear flat across his
    # waist and hung the Warlock's scythe off his shoulder like a rifle, because
    # in those clips the knuckle line happens to run horizontally.
    #
    # A shaft stands up instead. Both models are already gripped near their own
    # origin — the spear's runs from 22% up its length, the scythe's from 40% —
    # so the origin goes near the palm and the shaft is stood along the figure's
    # own up, with the blade turned to face out. It is still bound to the hand,
    # so the clip still carries it; it simply starts upright rather than flat.
    if ARGS['grip'] == 'pole':
        st = stance(arm)
        if st:
            up, across, facing = st
            # Out from the body as well as down. A shaft seated on the palm
            # alone runs straight through the hip and the thigh — the Warlock's
            # scythe crossed his whole torso and the curl of the snath came out
            # at the far hip looking like a second, badly deformed hand. The
            # `across` runs right to left, so *away from the body* is `-across`
            # for the right fist and `+across` for the left.
            out = 1.0 if hand == 'Left' else -1.0
            seat = (palm - up * (length * body_h * 0.22)
                    + facing * (length * body_h * 0.05)
                    + across * (out * length * body_h * 0.07))
            ob.matrix_world = (Matrix.Translation(seat)
                               @ Matrix((facing, across, up)).transposed().to_4x4()
                               @ Matrix.Scale(s, 4))
            ob.name = f'T{tier}_weapon'
            dress_prop(ob)
            return bind_prop(ob, arm, f'mixamorig:{hand}Hand')

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

    dress_prop(ob)
    return bind_prop(ob, arm, f'mixamorig:{hand}Hand')


def add_hair(name, xf, arm, tier=None):
    """One hairstyle, fitted like the head and rigid on the head bone.

    **No weight transfer.** The pack exports these already rigged to the head
    bone, so there is exactly one bone involved and Data Transfer would only
    invent a falloff across a scalp that does not bend. It goes through the same
    `apply_fit` the head does — which is the only reason it lands on the skull
    rather than beside it — and is then bound rigidly, like a weapon in a fist.
    """
    path = os.path.join(HAIR_DIR, f'{name}.gltf')
    if not os.path.exists(path):
        return None
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    fresh = [o for o in bpy.context.scene.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    if not meshes:
        return None
    ob = max(meshes, key=lambda o: len(o.data.vertices))
    ob.modifiers.clear()
    ob.vertex_groups.clear()
    mw = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = mw
    # Untiered on purpose: the tier prefix is what hides a mesh on the other
    # four rungs, and a man does not change hair when he changes armour.
    # Untiered unless asked: the tier prefix is what hides a mesh on the other
    # rungs, and a man does not change hair when he changes armour — but he does
    # put a helmet over it.
    ob.name = f'T{tier}_hair_{name}' if tier else f'Hair_{name}'
    # **No tint, and the flag is gone rather than left lying.** The pack's hair
    # map is a greyscale meant to be coloured by the material, and two ways of
    # doing that both failed silently: a MixRGB between texture and Base Color
    # is not a pattern Blender's glTF writer recognises, so it exports the bare
    # texture; and multiplying the pixels of a copied image does not survive
    # either, because a copy still points at the file it came from. Every doll
    # therefore has silver hair. It suits the Warlock, it reads as a grey
    # veteran on the Warrior, and it is wrong as a *default* — but a switch that
    # quietly does nothing is worse than no switch.
    apply_fit([ob], xf)
    live = set(bpy.context.scene.objects)
    for o in [o for o in fresh if o in live and o is not ob]:
        bpy.data.objects.remove(o, do_unlink=True)
    return bind_prop(ob, arm, 'mixamorig:Head')


def stiffen_fingers(ob):
    """Make a sleeve follow the wrist instead of the fingers.

    **Data Transfer copies the nearest surface's weights, and a cuff is nearest
    the fingers.** The Wizard's sleeves fall past the wrist and end in a wide
    open cuff; the vertices of that cuff sit closest to the index and little
    finger, so they inherit those bones and the cuff is pulled apart into a pair
    of curved horns the moment the hand closes. Both of the Warlock's hands came
    out as hooks, which is what it looks like from the front.

    Collapsing every bone below the wrist into the wrist itself fixes it without
    touching anything else: cloth that hangs past the hand should move as one
    piece with the wrist, which is also true of a gauntlet cuff and a vambrace.
    Only applied where it is asked for — a glove with modelled fingers wants the
    fingers.
    """
    for hand in ('Left', 'Right'):
        want = f'mixamorig:{hand}Hand'
        wrist = ob.vertex_groups.get(want) or ob.vertex_groups.get(want.replace(':', ''))
        if not wrist:
            continue
        digits = [g for g in ob.vertex_groups
                  if g.name.replace(':', '').startswith(want.replace(':', ''))
                  and g is not wrist]
        if not digits:
            continue
        idx = {g.index for g in digits}
        for v in ob.data.vertices:
            extra = sum(g.weight for g in v.groups if g.group in idx)
            if extra <= 0:
                continue
            here = next((g.weight for g in v.groups if g.group == wrist.index), 0.0)
            wrist.add([v.index], min(1.0, here + extra), 'REPLACE')
        for g in digits:
            ob.vertex_groups.remove(g)


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
        # **Every kit part is an open shell** — cuffs, collar, waist, boot tops
        # — and Catmull-Clark's default `boundary_smooth='ALL'` rounds and pulls
        # in exactly those borders, which is where one part is meant to butt
        # against the next. It opens hairline gaps at the wrist and the neck and
        # shrinks the helmet rim.
        mod.boundary_smooth = 'PRESERVE_CORNERS'
        mod.uv_smooth = 'PRESERVE_CORNERS'


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, body = import_character(resolve(ARGS['fbx']))
    worn, missing = import_parts()
    if not worn:
        raise SystemExit('no parts imported — check --kit')

    # **Outside garments join the kit before the fit, not after.** `fit` measures
    # everything worn against the body and scales it as one; a robe added later
    # would be the only piece not put through that, and would sit at whatever
    # size it happened to arrive at.
    for spec in [e.strip() for e in (ARGS['extra'] or '').split(',') if e.strip()]:
        got = import_extra(spec, body)
        for o in got:
            o.name = f'T1_{o.name}'
        worn += got
        print(f'outfit extra: {spec} — {len(got)} meshes')

    xf = fit(worn, body)
    for m in worn:
        top = skin(m, arm, body)
        if ARGS['stiff']:
            stiffen_fingers(m)
        print(f'outfit {m.name}: ' + (', '.join(f'{n}={w:.0f}' for n, w in top) or 'NO WEIGHTS'))

    for n, (name, length) in enumerate(WEAPONS, start=1):
        w = add_weapon(name, length, n, arm, body)
        print(f'outfit T{n} weapon: {name}' + ('' if w else ' — MISSING'))

    # **The off hand.** `--shield Shield_Heater@0.42` hangs one on the left arm,
    # for a character whose idle is a shield stance — a shield idle with an
    # empty left hand reads as a man bracing against nothing.
    if ARGS['shield']:
        sname, _, slen = ARGS['shield'].partition('@')
        for n in range(1, len(WEAPONS) + 1 or 2):
            sh = add_shield(sname, float(slen or 0.42), arm, body, n)
            print(f'outfit T{n} shield: {sname}' + ('' if sh else ' — MISSING'))

    head = base_head(ARGS['head'], xf)
    skin(head, arm, body)

    # **Hair, and every doll in this game has been bald.** It is not that the
    # head lost it — the pack keeps hairstyles in a folder of their own, already
    # rigged to the head bone, and nothing ever imported them. A bald man reads
    # as a monk or a convict, which is a characterisation nobody chose, and it
    # is the same four faces at the fire.
    # `Name@tier` puts a hairstyle on one rung only. The ladder's tiers 2, 4 and
    # 5 wear a hood or an armet, and hair is untiered by default — so a knight
    # with hair would wear it *through* his helmet on three rungs out of five.
    for spec in [n.strip() for n in (ARGS['hair'] or '').split(',') if n.strip()]:
        name, _, tier = spec.partition('@')
        h = add_hair(name, xf, arm, tier or None)
        print(f'outfit hair: {spec}' + ('' if h else ' — MISSING'))
    dedupe_images()
    bpy.data.objects.remove(body, do_unlink=True)
    # …and the joint pads with it. See `import_character`.
    for o in getattr(import_character, 'extras', []):
        try:
            bpy.data.objects.remove(o, do_unlink=True)
        except ReferenceError:
            pass

    # **Throw the pack's helper spheres away before exporting.** Every part file
    # ships a 42-vertex `Icosphere` spanning z -1..1, skinned to nothing;
    # `import_parts` already refuses to *wear* them, but nothing removed them
    # from the scene, so they went into the GLB — and doll.html sizes a doll by
    # the union of its meshes, so every character in this game has been measured
    # as 2.81 units tall instead of 1.81 and rendered at 64% of the height its
    # `--fh` asked for. It also varies per character: a hood or a raised weapon
    # moves the top of the union, which is why the Warlock came out visibly
    # shorter than the Paladin standing next to him.
    #
    # A real part is skinned. Nothing else belongs in the file.
    # Swept by mesh *data* name as well as by skinning, because the ones that
    # come in skinned keep their weights right up to the export and only the
    # datablock still says what they are.
    def junk(o):
        if o.data.name.split('.')[0] == 'Icosphere':
            return True
        return (not o.vertex_groups
                and not any(m.type == 'ARMATURE' for m in o.modifiers))

    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and junk(o)]:
        print(f'outfit: dropped helper mesh {o.name}')
        bpy.data.objects.remove(o, do_unlink=True)

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
