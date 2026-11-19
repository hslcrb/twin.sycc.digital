"""M1 photo-informed blockout, not measured/as-built. One master and one same-world GLB."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1
s['assetId']='sycc-master-m3';s['accuracy']='photo-informed blockout; no survey; historical image layout';s['sourceIds']=['S01','P2023','P2016','S07-2017','R2026-SSM-I','R2026-SSM-A'];s['north']='unknown; model north is arbitrary, not georeferenced'
collections={}
for name in ['Site','TrainingWing','Onnuri','WestVolume','RearVolume','Waypoints']:
 c=bpy.data.collections.new(name);s.collection.children.link(c);collections[name]=c
materials={}
def mat(name,color,rough=.65,metal=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 materials[name]=m;return m
stone=mat('Warm light stone · photo approximation',(.62,.60,.54));paint=mat('Pale exterior paint',(.70,.71,.65));dark=mat('Recessed shadow surfaces',(.13,.15,.15));glass=mat('Blue green entrance glazing',(.13,.31,.31),.18,.38,.45);metal=mat('Dark anodized frames',(.12,.16,.16),.3,.7);roof=mat('Historical green roofing',(.18,.31,.27),.6,.2);paving=mat('Pale square plaza paving',(.46,.48,.44));joint=mat('Paving joint',(.31,.34,.31));earth=mat('Landscape soil · unplanted phase',(.23,.25,.15));wood=mat('Lobby floor warm neutral',(.44,.34,.23));sign=mat('Sign brass',(.62,.44,.13),.3,.65)
# Original procedural native grain; GLB uses the corresponding constant PBR base, no downloaded textures.
for m in [stone,paint,paving]:
 ns=m.node_tree.nodes;ls=m.node_tree.links;n=ns.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=95;n.inputs['Detail'].default_value=2;b=ns.new('ShaderNodeBump');b.inputs['Strength'].default_value=.12;b.inputs['Distance'].default_value=.025;ls.new(n.outputs['Fac'],b.inputs['Height']);ls.new(b.outputs['Normal'],ns.get('Principled BSDF').inputs['Normal'])
def tag(o,zone,source='P2023',basis='image-observed form; dimensions approximate'):
 for c in list(o.users_collection):c.objects.unlink(o)
 collections[zone].objects.link(o);o['assetId']=o.name;o['zoneId']=zone;o['accuracy']='approximate';o['sourceIds']=[source];o['basis']=basis;return o
def box(name,loc,dim,material,zone='Site'):
 x,y,z=[v*.5 for v in dim]
 vertices=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
 faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);o.location=loc;me.materials.append(material);return tag(o,zone)

def mesh(name,verts,faces,material,zone):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);me.materials.append(material);return tag(o,zone)
def cyl(name,loc,radius,depth,material,zone,vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material);return tag(o,zone)
def text(name,label,loc,size,material,zone):
 c=bpy.data.curves.new(name,'FONT');c.body=label;c.size=size;c.align_x='CENTER';c.extrude=.008;o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);c.materials.append(material);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return tag(o,zone,'P2016')
box('Site context plane',(0,12,-.45),(180,150,.6),earth)
box('Rainbow plaza · historic grid extent',(12,-34,-.04),(122,64,.18),paving)
# Batches are merged by material later, preserving zone metadata.
for x in range(-48,74,6):box('Plaza grid X',(x,-34,.057),(.045,64,.008),joint)
for y in range(-64,0,6):box('Plaza grid Y',(12,y,.057),(122,.045,.008),joint)
# Main three-storey linear wing, photographed horizontal band / window rhythm.
box('Training wing main mass',(-11,16,6.2),(48,20,12.4),paint,'TrainingWing')
for z in [1.9,5.8,9.6]:
 for x in range(-32,12,4):
  box('Training recessed window',(x,5.91,z),(2.4,.08,2.05),glass,'TrainingWing');box('Window lintel',(x,5.75,z+1.1),(2.7,.38,.18),stone,'TrainingWing')
for z in [.4,3.9,7.8,12.4]:box('Horizontal stone band',(-11,5.65,z),(49,.5,.32),stone,'TrainingWing')
box('Upper roof cap',(-11,16,12.8),(49,21,.45),stone,'TrainingWing')
box('West stair tower',(-37,11,8),(8,12,16),stone,'TrainingWing')
for z in [3,6,9,12]:box('Tower landing recess',(-37,4.8,z),(6,.12,1.65),dark,'TrainingWing')
# Historical curved low west volume; facility identity unresolved, deliberately not labelled library/pool.
cx,cy=-43,21;rad=15;segments=24;verts=[]
for z in [.1,6.8]:
 for i in range(segments+1):
  a=math.pi/2+math.pi*i/segments;verts.append((cx+rad*math.cos(a),cy+rad*math.sin(a),z))
faces=[(i,i+1,i+1+segments+1,i+segments+1)for i in range(segments)];mesh('West curved volume · identity unresolved',verts,faces,stone,'WestVolume')
box('West low roof',(-48,21,7),(16,31,.4),stone,'WestVolume')
# Rear green-roof volume: observed historical image, not asserted current gym identity.
box('Rear pale envelope',(-29,45,7.7),(39,29,15.4),paint,'RearVolume')
for i in range(5):
 x=-48.5+i*7.8;verts=[(x,30,15.6),(x+3.9,30,18),(x+7.8,30,15.6),(x,60,15.6),(x+3.9,60,18),(x+7.8,60,15.6)];mesh('Historical green roof ridge',verts,[(0,1,4,3),(1,2,5,4)],roof,'RearVolume')
# Onnuri: large pale frame, recessed front glazing and entrance canopy per named photo.
# Separate shell instead of opaque solid: approximate vestibule is visible, not an invented auditorium.
box('Onnuri west wall',(22,24,8.2),(.6,40,16.4),stone,'Onnuri');box('Onnuri east wall',(56,24,8.2),(.6,40,16.4),stone,'Onnuri');box('Onnuri rear wall',(39,44,8.2),(34,.6,16.4),stone,'Onnuri')
box('Onnuri lobby floor',(39,9,.14),(33,11,.28),wood,'Onnuri');box('Auditorium base',(39,29,.12),(33,29,.24),dark,'Onnuri')
box('Onnuri entrance canopy',(39,1.5,4.7),(28,6,1.25),stone,'Onnuri')
for x in [26,52]:cyl('Onnuri entrance pillar',(x,.8,2.1),.48,4.2,stone,'Onnuri',16)
# Glazed door panels at photo-derived arrangement; center opening is a model preview gap, not operative door.
for x in [27,30,33,45,48,51]:
 box('Onnuri entrance glass',(x,4.03,2),(2.8,.07,3.8),glass,'Onnuri');box('Entrance mullion',(x-1.45,3.93,2),(.09,.16,4),metal,'Onnuri')
for x in range(24,56,4):
 box('Onnuri upper glazing',(x,4.08,9.5),(3.9,.07,7.2),glass,'Onnuri');box('Upper glazing mullion',(x-2,3.98,9.5),(.11,.18,7.4),metal,'Onnuri')
box('Upper glazing horizontal',(39,3.98,9.4),(34,.18,.12),metal,'Onnuri')
mesh('Onnuri pitched pale front crown',[(21,3.5,13),(57,3.5,13),(49,3.5,18.8),(29,3.5,18.8),(21,5,13),(57,5,13),(49,5,18.8),(29,5,18.8)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7)],stone,'Onnuri')
box('Onnuri green roof',(39,26,16.7),(35,38,.4),roof,'Onnuri')
# M3 photo-backed material families; RGB, dimensions and partition position are approximations.
wallwood=mat('Warm horizontal timber · 2026 photo-informed',(.43,.235,.11),.74)
slatwood=mat('Light rear timber slats · 2026 photo-informed',(.57,.52,.36),.8)
for x in [22.34,55.66]:
 for row in range(16):
  o=box('Auditorium horizontal timber lining',(x,29.5,.55+row*.96),(.06,28,.93),wallwood,'Onnuri');o['sourceIds']=['R2026-SSM-A'];o['basis']='Horizontal timber observed; panel module and interior extent approximate'
# Separate rear auditorium boundary from glass lobby. Open lower door bays are illustrative.
for x,w in [(23.3,1.3),(39,25.0),(54.7,1.3)]:
 box('Auditorium rear partition lower',(x,15.7,2.4),(w,.22,4.8),slatwood,'Onnuri')['sourceIds']=['R2026-SSM-A']
box('Auditorium rear partition upper',(39,15.7,10.55),(33,.22,11.5),slatwood,'Onnuri')['sourceIds']=['R2026-SSM-A']
for i in range(83):
 x=22.6+i*.4
 box('Rear vertical slat',(x,15.88,10.5),(.065,.07,10.8),wallwood,'Onnuri')['sourceIds']=['R2026-SSM-A']
# Close observed model-only roof junction holes; not a measured roof reconstruction.
mesh('Crown roof transition closure',[(21,5,13),(29,5,18.8),(49,5,18.8),(57,5,13),(21.5,7,16.9),(56.5,7,16.9)],[(0,1,4),(1,2,5,4),(2,3,5),(0,4,5,3)],roof,'Onnuri')['basis']='Technical seam closure between existing approximate crown and roof, not surveyed'
for x in [22,56]:box('Upper side wall seam closure',(x,25,16.55),(.6,40,.3),stone,'Onnuri')['basis']='Closes existing model wall-roof gap'
text('Onnuri observed sign','Onnuri Art Hall',(39,-1.55,4.5),.86,sign,'Onnuri')
# Modest lobby slabs only; furnishings and seats deferred pending verified plan.
for x in [26,52]:box('Approximate lobby bench',(x,10,.65),(3.5,1,1),stone,'Onnuri')['basis']='Illustrative rest furniture, not field-verified placement'
# Official 2017 seat plan topology/counts; dimension, rise and materials remain approximate.
seatmat=mat('Burgundy upholstery · 2026 photo-informed',(.23,.025,.045),.92)
seatcounts=[]
def chair(x,y,z):
 box('Seat pad',(x,y,z+.48),(.49,.49,.13),seatmat,'Onnuri')
 box('Seat back',(x,y-.23,z+.91),(.49,.11,.76),seatmat,'Onnuri')
 box('Seat pedestal',(x,y,z+.23),(.12,.12,.46),metal,'Onnuri')
def seating_group(floor,group,cx,counts,starty,zbase):
 total=0
 for row,n in enumerate(counts):
  y=starty-row*.97-(.75 if floor==1 and row>=4 else 0);z=zbase+row*.16
  for col in range(n):chair(cx+(col-(n-1)/2)*.59,y,z);total+=1
 seatcounts.append({'floor':floor,'group':group,'rowCounts':counts,'numberedSeats':total,'source':'S07-2017','dimensions':'approximate'})
for group,cx in [('ga',28.5),('da',49.5)]:seating_group(1,group,cx,[8]*4+[9]*9,34,.28)
seating_group(1,'na',39,[8,9,10,11]+[12,11]*4,34,.28)
# Lower stepped slabs give visible support, not a certified stair or accessible route.
for row in range(13):
 y=34-row*.97-(.75 if row>=4 else 0)
 box('Lower seating tier',(39,y,.13+row*.08),(31,1.0,.26+row*.16),dark,'Onnuri')
box('Stage platform',(39,39,.55),(28,7,1.1),wood,'Onnuri')
box('Stage backcloth',(39,43.55,6.3),(29,.12,10.5),dark,'Onnuri')
# Balcony follows schematic three-block organization and curved front silhouette.
for group,cx in [('ga',28.5),('da',49.5)]:seating_group(2,group,cx,[9]*5+[3]*3,23.5,6.0)
seating_group(2,'na',39,[11]*5,23.5,6.0)
for row in range(8):box('Balcony tier',(39,23.5-row*.97,5.81+row*.08),(31,1,.35+row*.16),dark,'Onnuri')
curve=[]
for i in range(25):
 x=23.5+31*i/24;y=25.2-.8*(1-((x-39)/15.5)**2);curve.extend([(x,y,5.65),(x,y,6.5)])
mesh('Balcony curved parapet · plan derived',curve,[(i*2,i*2+1,i*2+3,i*2+2)for i in range(24)],stone,'Onnuri')
for i in range(6):
 o=box('Wheelchair space · count from official plan',(35.3+i*1.48,19.7,.29),(1.15,1.1,.015),paving,'Onnuri');o['sourceIds']=['S07-2017'];o['basis']='Reserved clear space count6 in official plan; location and dimension approximate; not accessibility-certified'
assert sum(x['numberedSeats']for x in seatcounts)==519
(R/'docs/seat-plan-derived.json').write_text(json.dumps({'source':'S07-2017','numberedSeats':519,'wheelchairSpaces':6,'combinedCapacity':525,'groups':seatcounts,'status':'Historical 2017 arrangement; latest arrangement and actual measurements not verified'},indent=2))
# Native entry points: eye/target authored here; targets explicitly glTF-axis converted.
waypoints=[('Overview','전체 배치 · 역사사진 기반 근사',(104,-121,81),(0,15,7)),('Plaza','광장 · 근사',(10,-47,2.1),(9,14,7)),('OnnuriEntrance','온누리 입구 · 관찰형 근사',(39,-16,2.1),(39,5,6)),('OnnuriLobby','온누리 전실 · 미실측 근사',(39,10,1.75),(39,-10,2)),('OnnuriAudience','온누리 객석 · 2017 도면 기반 근사',(39,18.5,4.1),(39,39,3.8)),('OnnuriBalcony','온누리 발코니 · 2017 도면 기반 근사',(39,19.7,9.3),(39,39,3.5))]
for key,label,eye,target in waypoints:
 o=bpy.data.objects.new('Waypoint_'+key,None);collections['Waypoints'].objects.link(o);o.location=eye;o['assetId']='waypoint-'+key;o['label']=label;o['accuracy']='approximate';o['sourceIds']=['P2023','P2016'];o['target']=[target[0],target[2],-target[1]]
# Merge repeated mesh batches per zone/material to reduce draw calls, preserve aggregate evidence.
for zone,c in collections.items():
 if zone=='Waypoints':continue
 groups={}
 for o in list(c.objects):
  if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
 for material,objs in groups.items():
  if len(objs)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=objs[0];o.name=zone+' · '+material;o['assetId']=o.name;o['basis']='Photo-informed grouped meshes; dimensions and positions approximate'
bpy.ops.object.select_all(action='DESELECT')
s.world.use_nodes=True;bg=s.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.68,.77,.87,1);bg.inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN',location=(0,-50,80));sun=bpy.context.object;sun.name='Daylight';sun.data.energy=2.5;sun.rotation_euler=(.55,-.45,-.5);sun.data.angle=.12
bpy.ops.object.light_add(type='AREA',location=(39,29,15));fill=bpy.context.object;fill.name='RenderOnly auditorium visualization fill';fill.data.energy=6500;fill.data.shape='DISK';fill.data.size=22
bpy.ops.object.camera_add(location=waypoints[0][2]);cam=bpy.context.object;cam.name='RenderCamera';s.camera=cam;cam.rotation_euler=(Vector(waypoints[0][3])-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=43
s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=True;s.render.resolution_x=1100;s.render.resolution_y=750;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'models/sycc.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(R/'public/models/sycc.glb'),export_format='GLB',export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
report={'provenance':'first-party','license':'CC-BY-4.0','attribution':'twin.sycc.digital contributors','phase':'M3 photo-informed auditorium materials and shell separation','modelDimensionStatus':'All model distances approximate, metres for navigation only; no survey','native':{},'glb':{},'waypoints':[{'name':'Waypoint_'+k,'eyeGLTF':[e[0],e[2],-e[1]],'targetGLTF':[t[0],t[2],-t[1]],'label':l}for k,l,e,t in waypoints],'objects':len(bpy.data.objects),'meshObjects':sum(o.type=='MESH'for o in bpy.data.objects),'triangles':sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH'for p in o.data.polygons)}
for key,rel in [('native','models/sycc.blend'),('glb','public/models/sycc.glb')]:
 p=R/rel;report[key]={'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(R/'docs/model-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
for name,eye,target in [('m3-audience',(52,40,14),(38,24,4)),('m3-exterior',(68,-39,21),(39,5,8))]:
 cam.data.lens=21 if name=='m3-audience' else 43
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(R/'renders'/(name+'.png'));bpy.ops.render.render(write_still=True)
print('SYCC_M3_COMPLETE',json.dumps(report),flush=True)
