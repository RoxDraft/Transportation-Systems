const assert=require('assert/strict'),fs=require('fs'),path=require('path'),base=path.resolve(__dirname,'..');require('../src/heat-model.js');const H=HeatModel;
let cases=0,passes=0,fails=0;
for(const climate of ['humid','dry'])for(const direction of [0,90,180,270])for(const wind of [0,1.5,4]){
 const runs=Object.fromEntries(H.plans.map(k=>[k,H.simulate({climate,direction,wind},k)])),b=runs.base;
 for(const r of Object.values(runs)){cases++;assert(r.maxError<1e-6);assert(Math.abs(r.emitted-r.remaining-r.exited)<1e-6);assert(r.c.every(x=>Number.isFinite(x)&&x>=-1e-8));assert(r.walkLoad>=0&&r.stopLoad>=0);assert(r.thermal(19,12,true).humidity<=1);if(H.guard(r,b))passes++;else fails++;}
 assert.deepEqual(runs.canal.c,b.c,'Water magically removed pollution');assert.deepEqual(runs.pond.c,b.c);
 assert(Math.abs(runs.combined.emitted/runs.shade.emitted-.5)<1e-8);assert(Math.abs(runs.combined.stopDose/runs.shade.stopDose-.5)<1e-8);
 if(wind===0)assert(runs.shade.field(15,10).every(v=>v===0));
}
assert(passes&&fails,'Neighbor check must detect harmful as well as unchanged cases');
const wait5=H.simulate({wait:5}),wait20=H.simulate({wait:20});assert.equal(wait20.stopDose,wait5.stopDose*4);assert.equal(wait20.walkDose,wait5.walkDose);
const humid=H.simulate({climate:'humid'},'canal'),dry=H.simulate({climate:'dry'},'canal');assert(dry.thermal(15,8).cool>humid.thermal(15,8).cool);
const dom=require('./validate.cjs');global.HEAT_GEOMETRY=JSON.parse(fs.readFileSync(base+'/data/region.geojson','utf8'));const getStyle=global.getComputedStyle;global.getComputedStyle=e=>({...getStyle(e),getPropertyValue:k=>dom.colors[k]||'#ffffff'});global.location={href:'https://example.com/heat-map.html?area=cw',origin:'https://example.com'};global.localStorage={getItem:()=>null,setItem(){}};document.body=new dom.Element('body');window.parent=window;
for(const lang of ['th','en']){document.documentElement.lang=lang;const root=new dom.Element('main',{id:'hw-root'});new Function(fs.readFileSync(base+'/src/heat-map.js','utf8'))();const el=id=>dom.elements.get('hw-'+id);el('heat').checked=true;el('windlayer').checked=true;el('dust').checked=true;
 for(const mode of ['humid','dry']){el('climate').value=mode;el('climate').fire('change');for(const plan of H.plans){el('plan').value=plan;el('plan').fire('change');assert(!el('results').innerHTML.includes('NaN'));}}
 el('area').value='talat';el('area').fire('change');dom.setViewport(320);new Function(fs.readFileSync(base+'/src/heat-map.js','utf8'))();el('heat').checked=true;el('dust').checked=true;el('dust').fire('change');
 fs.writeFileSync(base+'/heat-map-'+lang+'-mobile.png',el('map').surface.toBuffer('image/png'));dom.setViewport(736);
}
console.log('PASS: '+cases+' heat/transport cases, mass accounting, no magical dust removal, source reduction, wait duration, humid/dry mechanisms, neighbor failures, bilingual UI controls and offline mobile rendering.');
