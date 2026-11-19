"""Run with Blender -b models/sycc.blend -P blender/scripts/verify_sycc.py."""
import bpy,json,hashlib,struct,math
from pathlib import Path
R=Path(__file__).resolve().parents[2];manifest=json.loads((R/'docs/model-manifest.json').read_text());assert Path(bpy.data.filepath).resolve()==(R/'models/sycc.blend').resolve()
assert bpy.context.scene.unit_settings.scale_length==1
for key in ['native','glb']:
 info=manifest[key];d=(R/info['path']).read_bytes();assert len(d)==info['bytes'];assert hashlib.sha256(d).hexdigest()==info['sha256']
d=(R/'public/models/sycc.glb').read_bytes();magic,version,size=struct.unpack_from('<III',d);assert magic==0x46546C67 and version==2 and size==len(d);n,t=struct.unpack_from('<II',d,12);assert t==0x4E4F534A;j=json.loads(d[20:20+n]);assert all('uri'not in b for b in j.get('buffers',[]));assert not j.get('images')
mesh_objects=[o for o in bpy.data.objects if o.type=='MESH'];assert len(mesh_objects)==len(j['meshes']) and len(mesh_objects)>=17
native_triangles=sum(len(p.vertices)-2 for o in mesh_objects for p in o.data.polygons);assert 23000<native_triangles<30000
for o in mesh_objects:
 assert o.get('assetId') and o.get('accuracy')=='approximate';assert all(math.isfinite(v)for row in o.matrix_world for v in row)
 assert len(o.data.materials)>=1
 assert not o.modifiers
nodes={n.get('name'):n for n in j['nodes']};probes=[]
for item in manifest['waypoints']:
 o=bpy.data.objects[item['name']];n=nodes[item['name']];assert o.type=='EMPTY';assert n['extras']['accuracy']=='approximate';assert n['extras']['label']==item['label']
 observed=n.get('translation',[0,0,0]);assert all(abs(a-b)<1e-5 for a,b in zip(observed,item['eyeGLTF']));assert n['extras']['target']==item['targetGLTF'];probes.append(item['name'])
assert len(probes)==6
assert len(j['materials'])<=16
seats=[o for o in mesh_objects if o.data.materials[0].name.startswith('Burgundy upholstery')]
assert len(seats)==1 and len(seats[0].data.polygons)==519*12
spaces=[o for o in mesh_objects if o.get('zoneId')=='Onnuri' and o.data.materials[0].name=='Pale square plaza paving']
assert len(spaces)==1 and len(spaces[0].data.polygons)==6*6
seatplan=json.loads((R/'docs/seat-plan-derived.json').read_text());assert sorted((g['floor'],g['group'],g['numberedSeats'])for g in seatplan['groups'])==[(1,'da',113),(1,'ga',113),(1,'na',130),(2,'da',54),(2,'ga',54),(2,'na',55)]
triangles=sum(j['accessors'][p['indices']]['count']//3 for m in j['meshes']for p in m['primitives']);assert triangles==native_triangles
assert (R/'models/sycc.blend').stat().st_size<10*1024**2
assert (R/'public/models/sycc.glb').stat().st_size<8*1024**2
assert len([m for m in j['materials']if m.get('alphaMode')=='BLEND'])>=1
report={'pass':True,'nativeMeshes':len(mesh_objects),'glbMeshes':len(j['meshes']),'trianglesBoth':triangles,'numberedSeatGeometryCount':519,'wheelchairClearSpaceGeometryCount':6,'waypointParity':probes,'embeddedExternalImages':0,'materials':len(j['materials']),'scope':'Export contract only, not survey accuracy, walkability, current facility match or browser FPS.'}
(R/'docs/model-verification.json').write_text(json.dumps(report,indent=2));print('SYCC_VERIFY_PASS',report)
