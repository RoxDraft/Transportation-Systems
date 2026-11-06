const fs=require('fs'),path=require('path'),assert=require('assert/strict'),base=path.resolve(__dirname,'..');require(base+'/src/day-model.js');
for(const rain of [0,80,150])for(const tide of [0,2])for(const plan of ['base','detain','pump']){
 const r=DayModel.simulate({rain,tide,trash:rain===150?100:25,silt:40},plan);assert.equal(r.frames.length,1441);assert(r.stats.maxWaterError<1e-5&&r.stats.maxTrafficError<1e-5);
 assert(Math.abs(r.stats.rainIn-rain/1000*500000*.8)<1e-5);assert(r.stats.generated>17000);
 for(const f of r.frames){assert([f.road,f.pond,f.canal,f.river,f.roadQueue,f.people].every(v=>Number.isFinite(v)&&v>=-1e-7));assert(f.pond<=r.pondCap+1e-6);assert(Math.abs(f.peopleIn-f.boarded-f.people)<1e-6);assert(Math.abs(f.waterError)<1e-5);}
 if(rain===0)assert.equal(r.stats.peakRoad,0);
}
const dom=require('./validate.cjs');document.body=new dom.Element('body');document.querySelectorAll=()=>[];document.querySelector=()=>null;global.location={origin:'null'};window.parent=window;
const html=fs.readFileSync(base+'/day-3d.html','utf8'),script=fs.readFileSync(base+'/src/day-scene.js','utf8');
for(const lang of ['th','en']){
 document.documentElement.lang=lang;const root=new dom.Element('main');root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');dom.setViewport(736);
 new Function(script.replace(/\}\)\(\);\s*$/,'globalThis.DQA={state,get runs(){return runs;},render,resize,current};})();'))();
 function image(name){const src=dom.elements.get('day-scene').surface,c=dom.createCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.fillStyle=dom.colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
 image('day-3d-'+lang);DQA.state.t=18.5*3600;DQA.state.scale='detail';DQA.render();image('day-3d-rain-'+lang);
 dom.setViewport(320);DQA.resize();image('day-3d-mobile-'+lang);dom.elements.get('day-yaw').value=85;dom.elements.get('day-yaw').fire('input');DQA.render();image('day-3d-rotated-'+lang);
 dom.elements.get('day-scale').value='day';dom.elements.get('day-scale').fire('change');dom.elements.get('day-play').fire('click');assert.equal(DQA.state.t,0);let ts=0;for(let i=0;i<122;i++){const callback=dom.rafs.get([...dom.rafs.keys()].at(-1));callback(ts);ts+=200;}assert.equal(DQA.state.t,86400);assert.equal(dom.elements.get('day-clock').textContent,'24:00');
 assert.equal(dom.elements.get('day-play').textContent,lang==='en'?'Play':'เล่น');
}
console.log('PASS: 18 full-day water/vehicle/passenger balances, no-rain cases, 24-hour completion in 24 seconds, 3D rotation, cutaway and offline scene rendering in Thai/English at 736/320px.');
