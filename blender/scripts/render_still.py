"""Render an existing model's authored view, without saving or regenerating the master."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--waypoint", required=True, help="Name suffix, e.g. Overview or OnnuriAudience")
parser.add_argument("--out", required=True, type=Path, help="PNG output path")
parser.add_argument("--width", type=int, default=1400, choices=range(640, 2561), metavar="640–2560")
parser.add_argument("--samples", type=int, default=12, choices=range(1, 97), metavar="1–96")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

if args.out.suffix.lower() != ".png":
    parser.error("--out must have a .png suffix")
point = bpy.data.objects.get("Waypoint_" + args.waypoint.removeprefix("Waypoint_"))
if point is None or point.type != "EMPTY":
    parser.error("The opened Blender master does not define that waypoint")
target_gltf = point.get("target", [])
if len(target_gltf) != 3 or not all(math.isfinite(value) for value in target_gltf):
    parser.error("Waypoint lacks a finite three-axis target")
target = Vector((target_gltf[0], -target_gltf[2], target_gltf[1]))
origin = point.matrix_world.translation.copy()
direction = target - origin
if direction.length < 0.01:
    parser.error("Waypoint target is too close to the viewpoint")

scene = bpy.context.scene
camera_data = bpy.data.cameras.new("Transient still camera")
camera = bpy.data.objects.new(camera_data.name, camera_data)
scene.collection.objects.link(camera)
camera.location = origin
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 38
scene.camera = camera
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width * 9 / 14)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(args.out.resolve())
if scene.render.engine == "CYCLES":
    scene.cycles.samples = args.samples
args.out.resolve().parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
