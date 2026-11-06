import json,re,math,shutil
from pathlib import Path
project=Path(__file__).resolve().parents[1]
import os
old=Path(os.environ['URBAN_LEGACY_DIR'])
data=project/'data';data.mkdir(exist_ok=True)
box=(100.460,13.750,100.595,13.912)
def clip(a,b):
 x,y=a;dx,dy=b[0]-x,b[1]-y;lo,hi=0,1
 for p,q in [(-dx,x-box[0]),(dx,box[2]-x),(-dy,y-box[1]),(dy,box[3]-y)]:
  if abs(p)<1e-15:
   if q<0:return
  else:
   v=q/p
   if p<0:lo=max(lo,v)
   else:hi=min(hi,v)
   if lo>hi:return
 return [[round(x+lo*dx,5),round(y+lo*dy,5)],[round(x+hi*dx,5),round(y+hi*dy,5)]]
ways={}
g=json.loads((old/'chaengwattana-osm.json').read_text(encoding='utf-8'))
for e in g['elements']:
 if e['type']=='way':ways[e['id']]=e
for path in [data/'outfall-bangtalat.json',data/'outfall-prem.json',data/'prem-middle.json',data/'chao-phraya-relation.json']:
 g=json.loads(path.read_text(encoding='utf-8'));nodes={n['id']:[n['lon'],n['lat']] for n in g['elements'] if n['type']=='node'}
 for e in g['elements']:
  if e['type']=='way':
   e['geometry']=[{'lon':nodes[n][0],'lat':nodes[n][1]} for n in e['nodes'] if n in nodes];ways[e['id']]=e
features=[]
for e in ways.values():
 tags=e.get('tags',{});water=bool(tags.get('waterway'));road=tags.get('highway')
 if not water and road not in ['primary','trunk','secondary','tertiary']:continue
 coords=[[p['lon'],p['lat']] for p in e.get('geometry',[])]
 lines=[]
 for a,b in zip(coords,coords[1:]):
  segment=clip(a,b)
  if not segment or segment[0]==segment[1]:continue
  if lines and lines[-1][-1]==segment[0]:lines[-1].append(segment[1])
  else:lines.append(segment)
 if lines:features.append({'type':'Feature','properties':{'id':e['id'],'name':tags.get('name',''),'kind':'water' if water else 'main' if road in ['primary','trunk'] else 'road'},'geometry':{'type':'MultiLineString','coordinates':lines}})
geo={'type':'FeatureCollection','features':features}
(data/'region.geojson').write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
shutil.copyfile(old/'thailand-provinces-compact.json',data/'thailand.geojson')
catalog=[
 ('street','ถนน 32 ม. · Universal design','transport','inclusive-city-street.html'),
 ('junction','แยกและป้ายรถเมล์กลางฝน','transport','rainy-intersection.html'),
 ('greenlight','Green Light · ไฟอย่างเดียว/ปรับถนน','transport','greenlight-street-comparison.html'),
 ('crossing','ทางข้ามไปป้าย · คนเดิน/รถเข็น/จักรยาน','transport','bus-stop-crossing-timing.html'),
 ('system','ถนน–ท่อ–คลอง–ทะเล รุ่นแรก','water','neighborhood-drainage-before-storage-location.html'),
 ('location','พักน้ำก่อนท่อ/หลังท่อ','water','storage-location-comparison.html'),
 ('inlet','ช่องรับแยก ดักขยะ และทางสำรอง','water','separate-inlet-comparison.html'),
 ('pipe','ขยายท่อ/ลอกท่อ/เพิ่มปั๊ม','water','pipe-upgrade-comparison.html'),
 ('prerain','สูบพร่องคลองก่อนฝน','water','pre-drawdown.html'),
 ('adjacent','แจ้งวัฒนะกับคลองร่วม รุ่นก่อน','water','chaengwattana-drainage.html'),
 ('national','แผนที่ 6 กรณีไทย','water','thailand-flood-design-map.html')]
cases=[]
for key,label,layer,file in catalog:
 text=(old/file).read_text(encoding='utf-8')
 if key=='adjacent':text=re.sub(r'const geography=\{.*?\};\s*\n', 'const geography=globalThis.UL_LOCAL_GEOMETRY;\n',text,count=1)
 if key=='national':text=re.sub(r'const geography=\{.*?\};\s*\n', 'const geography=globalThis.UL_COUNTRY_GEOMETRY;\n',text,count=1)
 cases.append({'id':key,'label':label,'layer':layer,'html':text,'sourceFile':file})
(data/'cases.json').write_text(json.dumps(cases,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(project/'vendor').mkdir(exist_ok=True);shutil.copyfile(old/'d3-7.9.0.min.js',project/'vendor/d3-7.9.0.min.js')
print('region features',len(features),'bytes',(data/'region.geojson').stat().st_size,'case bytes',(data/'cases.json').stat().st_size)
for name in ['คลองบางตลาด','คลองเปรมประชากร','แม่น้ำเจ้าพระยา','คลองบางซื่อ']:
 fs=[f for f in features if f['properties']['name']==name];print(name,len(fs))
