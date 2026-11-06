"""Build English project entry pages from the authored shared phrase dictionary."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
lab=root/'urban-systems-lab'
if not lab.exists():lab=root.parent/'urban-systems-lab'
translations=json.loads((root/'shared/en.json').read_text(encoding='utf-8'))
pattern=re.compile(r'[\u0e00-\u0e7f]+(?:[ \t]+[\u0e00-\u0e7f]+)*')
missing=set()
def translate(source):
 urls=[]
 def protect(match):urls.append(match.group());return '__TS_URL_'+str(len(urls)-1)+'__'
 source=re.sub(r'https?://[^\s\x27"<>`\\]+',protect,source)
 complete={'ไม่พบ B–F แย่ลงด้านความลึกหรือระยะเวลาในเหตุการณ์นี้':'No worsening of depth or duration at B–F in this event','พบจุดแย่ลงด้านความลึก/ระยะเวลา:':'Worse depth or duration at:','ม.รทก.':'m MSL','ลบ.ม./วิ':'m³/s','ลบ.ม.':'m³','ตร.กม.':'km²','ตร.ม.':'m²','กม./ชม.':'km/h','มม./ชม.':'mm/h','ซม.':'cm','ชม.':'h','พ.ย.':'Nov','ต.ค.':'Oct','ก.ย.':'Sep'}
 for th,en in sorted(complete.items(),key=lambda row:-len(row[0])):source=source.replace(th,en)
 def sub(match):
  text=match.group()
  if text not in translations:missing.add(text);return text
  value=translations[text]
  if any(ch in value for ch in ['\x27','"','`','\\','<','>']):raise ValueError('Unsafe source substitution: '+text)
  return value+' '
 result=pattern.sub(sub,source)
 for i,url in enumerate(urls):result=result.replace('__TS_URL_'+str(i)+'__',url)
 return result
def with_router(source):
 if '../shared/project-language.js' in source:return source
 return source.replace('<head>','<head>\n<script src="../shared/project-language.js"></script>',1)
def build():
 for folder in [root/'Autonomous E-Bus Model',lab]:
  path=folder/'index.html';source=with_router(path.read_text(encoding='utf-8'));path.write_text(source,encoding='utf-8')
  english=translate(source).replace('<html lang="th">','<html lang="en">',1)
  if folder.name=='Autonomous E-Bus Model':english=english.replace('src="three-d-stage.js"','src="three-d-stage.en.js"').replace('./three-d-stage.js','./three-d-stage.en.js')
  (folder/'index.en.html').write_text(english,encoding='utf-8')
 stage=root/'Autonomous E-Bus Model/three-d-stage.js';(stage.parent/'three-d-stage.en.js').write_text(translate(stage.read_text(encoding='utf-8')),encoding='utf-8')
 home=root/'index.html';home.write_text(home.read_text(encoding='utf-8').replace('14 กรณีศึกษา','15 กรณีศึกษา').replace('14 SCENARIOS','15 SCENARIOS'),encoding='utf-8')
 if missing:raise ValueError('Add authored English translations: '+json.dumps(sorted(missing),ensure_ascii=False))
 print('English variants built; all source phrases covered and URLs preserved.')
if __name__=='__main__':build()
