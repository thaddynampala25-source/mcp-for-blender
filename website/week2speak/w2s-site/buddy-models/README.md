# Language Buddy models

Drop a GLB here and the next build uses it instead of the built-in one. Nothing else needs changing.

| File | Buddy | Internal id |
|---|---|---|
| `buddy-models/ruby.glb` | Ruby (female, London) | `mila` |
| `buddy-models/max.glb` | Max (male, New York) | `rio` |

Then rebuild: `python3 apply_sprint.py && SITE_URL=https://week2speak.com python3 sitebuild.py`.
The build copies each file to `dist/assets/buddies/<name>.glb`, makes a gzipped copy next to it (`.glb.gz`, which the page inflates itself), and keeps the static picture from `buddy-gen/out/<name>.webp`. Re-render the pictures with `node buddy-gen/poster.cjs` (the site must be served on port 8765), then build once more.

If this folder has no GLB, the build uses the models made by `node buddy-gen/gen.cjs` (`buddy-gen/out/ruby.glb`, `buddy-gen/out/max.glb`).

## What a model must be

- Format: binary glTF 2.0 (`.glb`), one file per Buddy, textures embedded.
- Size: under 2 MB each.
- Scale and position: about 2.2 units tall, feet on y = 0, centred on x = 0 and z = 0, facing +Z.
- Pose: A-pose (arms down, about 25 degrees from the body), mouth closed and neutral, eyes open.
- Not supported: Draco or Meshopt compression, KTX2 textures. Plain or `KHR_mesh_quantization` attributes are fine.

## Two levels of rig

**1. Any model with face morph targets ("generic").** It gets the spin, hops, the pop-in when you switch, lip sync and blinking. It does not get arm gestures, the wave, the shrug or eyelid nodes.

The loader looks for these morph target names and uses the first that exists:

| Control | Names it accepts |
|---|---|
| Jaw open | `jawOpen`, `mouthOpen`, `viseme_aa`, `MouthOpen` |
| Rounded lips | `mouthPucker`, `mouthFunnel`, `viseme_U`, `viseme_O` |
| Wide lips | `mouthWide`, `mouthStretchLeft` + `mouthStretchRight`, `viseme_I`, `viseme_E` |
| Smile | `mouthSmile`, `mouthSmileLeft` + `mouthSmileRight` |
| Frown | `mouthFrown`, `mouthFrownLeft` + `mouthFrownRight` |
| Blink | `eyeBlinkLeft` + `eyeBlinkRight`, `eyesClosed`, `blink` |

These are the ARKit and Ready Player Me / Oculus viseme names, so most avatar exports work as they are. With no jaw target at all, the mouth does not move.

**2. The full rig ("w2s-1").** Everything works: gestures while speaking, wave, shrug, hair flick, sip, tap dance, gaze, eyelids, brows.

Requirements:

- Scene extras: `{"w2s": {"rig": "w2s-1", "height": 2.27, "faceWidth": 0.79, "lidOpen": -0.8, "lidClosed": 1.25, "lowLid": 1.12}}` (height and face width in model units; the three lid values are rotations about X in radians).
- Nodes with these exact names, each with **no rotation at rest** (identity) and axes aligned to the world: `Hips`, `Spine`, `Neck`, `Head`, `LeftArm`, `LeftForeArm`, `LeftHand`, `RightArm`, `RightForeArm`, `RightHand`, `LeftUpLeg`, `RightUpLeg`. "Left" is the character's left (+X).
- Face nodes under `Head`: `EyeL`, `EyeR` (eyeballs, pivot at the eye centre, rotated for gaze), `LidL`, `LidR` (upper eyelids, a shell that rotates about X over the eye), `LowLidL`, `LowLidR`, `BrowL`, `BrowR`.
- Optional: `Pony` (a hair piece that swings), `Prop` (what the left hand holds).
- Mesh names decide what a tap means: names containing `Hair` or `Pony` are hair; `Head`, `Mouth`, `Eye`, `Lid`, `Brow` are the face; `Prop`, `Headphones`, `HandL` are the prop; `Hand` is an arm; `Trousers`, `Shoe` are legs; `Jacket` is the torso (or an arm beyond x = 0.34).
- Morph targets `jawOpen`, `mouthPucker`, `mouthWide`, `mouthSmile`, `mouthFrown` on the face meshes.

A model exported from Blender with a normal armature (bones rotated at rest) should not claim `"rig": "w2s-1"`. Leave the extras out and it runs as a generic model.

## Text-to-3D prompts

Paste one of these into a text-to-3D tool. They ask for the look only; the rig above still has to be added in Blender, or the model used as "generic" with morph targets.

**Ruby**

> Stylised 3D character, animated-film quality, as sculpted in Blender. A friendly young woman from London, native English speaker. Chunky, rounded, toy-like proportions: head about one third of total height, short soft limbs, small hands with clear thumbs. Fair skin with light freckles, soft rosy cheeks, big green eyes with real eyelids, small nose, natural lips, visible ears. Auburn hair with real volume in layered sculpted locks, side-swept fringe, high ponytail with a yellow hair tie. Cobalt blue (#2D4BFF) rain jacket with a hood, collar, elastic cuffs and hem, yellow (#FFD93B) zip; cream T-shirt just visible at the neck; navy jeans with turned-up hems; white trainers with yellow soles; yellow headphones round her neck; a yellow tea flask in her left hand. Full body, A-pose, mouth closed and neutral, eyes open, facing forward, feet flat on the ground. Soft gradient skin, matte cloth, no hard seams between body parts. Not based on any existing character or real person. Single mesh set, web-ready GLB under 2 MB, PBR textures, no background.

**Max**

> Stylised 3D character, animated-film quality, as sculpted in Blender. A friendly young man from New York, native English speaker. Chunky, rounded, toy-like proportions: head about one third of total height, short soft limbs, small hands with clear thumbs. Dark brown skin, warm cheeks, big dark brown eyes with real eyelids, broad nose, natural lips, visible ears, thick eyebrows. Short black curly hair with real volume in sculpted curls and a low fade at the sides and back. Varsity jacket: cobalt blue (#2D4BFF) body, yellow (#FFD93B) sleeves, dark navy (#0B103A) ribbed collar, cuffs and hem, white snap buttons, a yellow letter M on the chest; white T-shirt at the neck; grey joggers with ribbed cuffs; navy high-top sneakers with white soles; a white take-away coffee cup with a blue sleeve in his left hand. Full body, A-pose, mouth closed and neutral, eyes open, facing forward, feet flat on the ground. Soft gradient skin, matte cloth, no hard seams between body parts. Not based on any existing character or real person. Single mesh set, web-ready GLB under 2 MB, PBR textures, no background.

## How the built-in models are made

`buddy-gen/gen.cjs` sculpts each character from smooth-blended distance fields (so a head or a jacket is one continuous surface), turns them into meshes, colours them per vertex, rigs them and writes the GLB with morph targets. `buddy-gen/sdf.cjs` holds the shape toolkit, the mesher and the GLB writer. No dependencies. Change a colour or a proportion in the `RUBY` or `MAX` block at the bottom of `gen.cjs`, run `node buddy-gen/gen.cjs`, then rebuild the site.
