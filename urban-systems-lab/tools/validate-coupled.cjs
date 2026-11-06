const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),dom=require('./validate.cjs');require(base+'/src/coupled-model.js');
const E=CoupledEngine,p0={rain:80,tide:1.5,trash:25,silt:40};
const scenarios=[p0,{...p0,rain:0},{...p0,trash:100},{...p0,silt:100},{...p0,rain:150,tide:2,trash:0,silt:0},{...p0,rain:30,tide:0},{...p0,rain:150,tide:2,trash:90,silt:90}];
for(const p of scenarios){const runs={};for(const id of Object.keys(E.options)){
 const r=E.simulate(p,id);runs[id]=r;const s=r.stats;
 assert(s.maxError<1e-5&&r.water.stats.maxError<1e-5,'Vehicle/water ledger');
 assert(Math.abs(s.produced-s.passed-s.pendingTraffic)<1e-5,'No disappearing vehicles');
 assert(Math.abs(s.passengerCreated-s.boarded-s.pendingPassengers)<1e-5,'No disappearing passengers');
 assert.equal(s.passengerCreated,720,'Equal fixed passenger demand');assert.equal(s.busCreated,48,'Recovery bus service');
 assert(r.frames.every(f=>[f.mainQueue,...f.sideQueue,...f.waiting,...f.soiDepth].every(n=>Number.isFinite(n)&&n>=-1e-7)),'Finite queues and water');
 assert(r.frames.every(f=>f.mainOut<=f.mainCap*5+1e-6&&f.sideOut.every((q,i)=>q<=f.sideCap[i]*5+1e-6)),'Flow capacity');
 if(id==='integrated'){assert.equal(s.diverted,0,'Protected soi no through traffic');if(p===p0)assert.equal(s.closedMinutes[1],0,'Dry connection at default only');}
 }
 const total=runs.base.stats.produced;for(const r of Object.values(runs))assert(Math.abs(r.stats.produced-total)<1e-6,'Demand not shifted/cancelled');
 assert.deepEqual(runs.detain.water.stats,runs.integrated.water.stats,'Same water intervention');
 if(p===p0){assert(runs.integrated.stats.peakMain<runs.base.stats.peakMain);assert(runs.integrated.stats.residentDelay<=runs.base.stats.residentDelay);assert(runs.detain.stats.diverted>0);assert(runs.integrated.stats.peakMain>runs.detain.stats.peakMain,'Holding traffic tradeoff retained');}
}
dom.setViewport(736);
const html=fs.readFileSync(base+'/coupled-flood-mobility.html','utf8'),root=new dom.Element('div',{id:'coupled-mobility'});root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');dom.elements.set('coupled-mobility',root);
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
new Function(scripts.at(-1)[1].replace(/\}\)\(\);\s*$/,'globalThis.CMQA={state,runs,resize,redraw,restore};})();'))();
function image(name){const src=dom.elements.get('cm-canvas').surface,c=dom.createCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.fillStyle=dom.colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
for(const id of Object.keys(E.options)){const select=dom.elements.get('cm-plan');select.value=id;select.fire('change');image('coupled-'+id);}
dom.setViewport(320);CMQA.resize();CMQA.state.plan='base';CMQA.redraw();image('coupled-mobile-base');CMQA.state.plan='integrated';CMQA.redraw();image('coupled-mobile-integrated');
dom.elements.get('cm-view').value='map';dom.elements.get('cm-view').fire('change');image('coupled-mobile-map');
for(const minute of [0,9,10,99,100,719,720]){dom.elements.get('cm-time').value=minute;dom.elements.get('cm-time').fire('input');assert.equal(dom.elements.get('cm-current').textContent,minute.toFixed(1));}
assert(Buffer.byteLength(html)<1e6);console.log('PASS: 35 coupled scenarios, conserved water/traffic/passengers, equal demand, no hidden shortcut traffic, bus recovery, capacity bounds and responsive offline renders.');
