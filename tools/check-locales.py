import json,re,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
lab=root/'urban-systems-lab'
if not lab.exists():lab=root.parent/'urban-systems-lab'
for folder in [root/'Autonomous E-Bus Model',lab]:
 th=(folder/'index.html').read_text(encoding='utf-8');en=(folder/'index.en.html').read_text(encoding='utf-8')
 urls=r'https?://[^\s\x27"<>`\\]+'
 assert re.findall(urls,th)==re.findall(urls,en),'Source URLs changed: '+folder.name
 assert re.findall(r'\bid="([^"]+)"',th)==re.findall(r'\bid="([^"]+)"',en),'Element IDs changed'
 if folder.name=='Autonomous E-Bus Model':assert 'src="three-d-stage.en.js"' in en
 # All authored Thai runs outside preserved source URLs must have translations.
 assert not re.search(r'[\u0e00-\u0e7f]',re.sub(urls,'',en)),'Untranslated interface strings'
 for i,match in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',en,re.I)):
  attrs,code=match.groups()
  if 'importmap' in attrs:json.loads(code);continue
  if not code.strip():continue
  with tempfile.TemporaryDirectory() as temp:
   script=Path(temp)/('script.mjs' if 'module' in attrs else 'script.cjs');script.write_text(code,encoding='utf-8');subprocess.run(['node','--check',str(script)],check=True,capture_output=True)
 print(folder.name+': URLs and element IDs unchanged; translated inline scripts parse.')
subprocess.run(['node','--check',str(root/'Autonomous E-Bus Model/three-d-stage.en.js')],check=True)
