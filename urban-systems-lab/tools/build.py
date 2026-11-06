import json,re,os
from pathlib import Path
base=Path(__file__).resolve().parents[1]
viz_dir=Path(os.environ['URBAN_VIZ_DIR']) if os.environ.get('URBAN_VIZ_DIR') else None
def export_viz(name,content):
 if viz_dir:
  viz_dir.mkdir(parents=True,exist_ok=True)
  (viz_dir/name).write_text(content,encoding='utf-8')
fragment=(base/'src/hub.html').read_text(encoding='utf-8')
def packed_value(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def packed(path):return packed_value(json.loads(path.read_text(encoding='utf-8')))
coupled=(base/'src/coupled.html').read_text(encoding='utf-8').replace('/*COUPLED_ENGINE*/',(base/'src/coupled-model.js').read_text(encoding='utf-8'))
green=(base/'src/greenlight-flood.html').read_text(encoding='utf-8').replace('/*COUPLED_DEPENDENCY*/',(base/'src/coupled-model.js').read_text(encoding='utf-8')).replace('/*GREEN_ENGINE*/',(base/'src/greenlight-flood-model.js').read_text(encoding='utf-8'))
green_inline=(base/'src/green-flood-inline-shell.html').read_text(encoding='utf-8').replace('/*DOWNSTREAM_ENGINE*/',(base/'src/downstream-model.js').read_text(encoding='utf-8')).replace('<!--GREEN_FRAGMENT-->',green)
(base/'greenlight-flood.html').write_text(green_inline,encoding='utf-8')
export_viz('greenlight-flood.html',green_inline)
reactive=(base/'src/reactive-signal.html').read_text(encoding='utf-8').replace('/*COUPLED_DEPENDENCY*/',(base/'src/coupled-model.js').read_text(encoding='utf-8')).replace('/*GREEN_ENGINE*/',(base/'src/greenlight-flood-model.js').read_text(encoding='utf-8')).replace('/*REACTIVE_ENGINE*/',(base/'src/reactive-signal-model.js').read_text(encoding='utf-8'))
reactive_inline='<script>'+ (base/'src/downstream-model.js').read_text(encoding='utf-8')+'</script>\n'+reactive
(base/'reactive-signal.html').write_text(reactive_inline,encoding='utf-8')
export_viz('reactive-signal.html',reactive_inline)
coupled_inline=(base/'src/coupled-inline-shell.html').read_text(encoding='utf-8').replace('/*DOWNSTREAM_ENGINE*/',(base/'src/downstream-model.js').read_text(encoding='utf-8')).replace('/*LOCAL_GEOMETRY*/null',packed(base/'data/region.geojson')).replace('<!--COUPLED_FRAGMENT-->',coupled)
(base/'coupled-flood-mobility.html').write_text(coupled_inline,encoding='utf-8')
export_viz('coupled-flood-mobility.html',coupled_inline)
cases=json.loads((base/'data/cases.json').read_text(encoding='utf-8'))
cases.insert(0,{'id':'coupled','label':'แจ้งวัฒนะ · น้ำขัง + ถนน/ป้าย/ซอย','layer':'coupled','html':coupled,'sourceFile':'src/coupled.html'})
cases.insert(0,{'id':'green-flood','label':'เพิ่ม Green Light · หน่วงน้ำและคุมซอย','layer':'coupled','html':green,'sourceFile':'src/greenlight-flood.html'})
cases.insert(0,{'id':'reactive-signal','label':'ล่าสุด · ไฟตามคิวรถและระดับน้ำ','layer':'coupled','html':reactive,'sourceFile':'src/reactive-signal.html'})
fragment=fragment.replace('/*DOWNSTREAM_ENGINE*/',(base/'src/downstream-model.js').read_text(encoding='utf-8'))
for tag,file in [('/*REGION_DATA*/null','region.geojson'),('/*COUNTRY_DATA*/null','thailand.geojson')]:fragment=fragment.replace(tag,packed(base/'data'/file))
fragment=fragment.replace('/*CASE_DATA*/[]',packed_value(cases))
if len(fragment.encode())>=1000000:raise ValueError('Inline visualization exceeds 1 MB')
(base/'urban-systems.html').write_text(fragment,encoding='utf-8')
export_viz('urban-systems.html',fragment)
offline=fragment.replace('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','./vendor/d3-7.9.0.min.js')
shell=(base/'src/index-shell.html').read_text(encoding='utf-8').replace('<!--APP_FRAGMENT-->',offline)
(base/'index.html').write_text(shell,encoding='utf-8')
print('Inline bytes:',len(fragment.encode()),'Project:',base/'index.html')
