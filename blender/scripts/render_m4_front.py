import bpy
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parents[2]
s=bpy.context.scene;c=s.camera;c.location=(14,-96,15);c.rotation_euler=(Vector((11,10,8))-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=32;s.cycles.samples=8;s.render.filepath=str(r/'renders/m4-front.png');bpy.ops.render.render(write_still=True)
