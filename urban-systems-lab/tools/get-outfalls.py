import urllib.request,json,concurrent.futures
from pathlib import Path
base=Path(__file__).resolve().parents[1]/'data';base.mkdir(exist_ok=True)
def get(item):
 name,box=item
 if (base/(name+'.json')).exists():return
 u='https://api.openstreetmap.org/api/0.6/map.json?bbox='+box
 req=urllib.request.Request(u,headers={'User-Agent':'UrbanSystemsEducationalLab/1.0'})
 data=urllib.request.urlopen(req,timeout=40).read();(base/(name+'.json')).write_bytes(data)
 print(name,len(data),len(json.loads(data).get('elements',[])))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 list(pool.map(get,[('outfall-bangtalat','100.486,13.888,100.513,13.906'),('outfall-prem','100.500,13.790,100.528,13.813'),('prem-middle','100.540,13.832,100.565,13.852')]))
