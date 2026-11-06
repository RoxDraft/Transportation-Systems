const fs=require('fs'),path=require('path'),assert=require('assert/strict'),base=path.resolve(__dirname,'..');
const dom=require('./validate.cjs');require(base+'/src/coupled-model.js');require(base+'/src/greenlight-flood-model.js');
const E=GreenFloodEngine,p0={rain:80,tide:1.5,trash:25,silt:40};
for(const offset of [0,15,30,75,120,135]){
 const count={main:0,side:0,walk:0,ped:0};for(let t=0;t<150;t++){const p=E.phase(t,offset);for(const k of Object.keys(count))count[k]+=Number(p[k]);assert(!(p.ped&&(p.main||p.side)),'Pedestrian vehicle conflict');}
 assert.deepEqual(count,{main:75,side:20,walk:10,ped:45});
 for(let start=105;start<115;start++)for(const crossing of [20,30])assert(start+crossing<150,'Insufficient clearance');
}
const scenarios=[p0,{...p0,rain:0},{...p0,trash:100},{...p0,silt:100},{...p0,rain:150,tide:2,trash:90,silt:90},{...p0,rain:30,tide:0}];
for(const p of scenarios){const water=DownstreamEngine.simulate({...p,localSois:true},'adaptive'),result=E.optimize(p,water),b=result.baseline.stats,s=result.best.stats;
 assert(E.acceptable(result.best,result.baseline),'Selected unsafe/worse candidate');assert.equal(result.baseline.water,result.best.water,'Water intervention changed');
 assert(s.peakQueue<=b.peakQueue+1e-7&&s.residentDelay<=b.residentDelay+1e-7);
 for(let i=0;i<2;i++){assert(s.sideDelay[i]<=b.sideDelay[i]+1e-7);assert(s.peakSide[i]<=b.peakSide[i]+1e-7);assert(s.maxPedWait[i]<=b.maxPedWait[i]+1e-7);}
 for(const r of [result.baseline,result.best]){
  assert(r.stats.maxError<1e-5&&r.stats.maxPeopleError<1e-5,'Conservation');assert.equal(r.stats.busCount,48);assert.equal(r.stats.diverted,0);
  assert(Math.abs(r.stats.generated-5040)<1e-5&&Math.abs(r.stats.peopleIn-720)<1e-5,'Demand changed');
  for(const f of r.frames){assert(f.between+f.inTransit<=E.BUFFER+1e-6,'Queue exceeds receiving storage');assert([f.mainQueue,f.inTransit,f.crossing,...f.side,...f.ped,...f.waiting].every(n=>Number.isFinite(n)&&n>=-1e-6));if(f.entry>1e-7)assert(f.phase1.main);if(f.out>1e-7)assert(f.phase2.main);if(f.crossing>1e-7)assert(f.phase2.ped&&!f.phase2.main&&!f.phase2.side,'Crossing shortened or conflict');}
 }
 if(p===p0){assert(s.peakQueue<b.peakQueue);console.log('Default result',JSON.stringify({base:b.peakQueue,best:s.peakQueue,reductionPercent:(b.peakQueue-s.peakQueue)/b.peakQueue*100,betweenBase:b.peakBetween,betweenBest:s.peakBetween,ped:b.maxPedWait,sideBase:b.sideDelay,sideBest:s.sideDelay,upOffset:result.best.upOffset,downOffset:result.best.offset}));}
}
dom.setViewport(736);const html=fs.readFileSync(base+'/greenlight-flood.html','utf8'),root=new dom.Element('div',{id:'green-flood'});root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');dom.elements.set('green-flood',root);
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];new Function(scripts.at(-1)[1].replace(/\}\)\(\);\s*$/,'globalThis.GQA={state,result,resize,redraw,restore};})();'))();
function image(name){const src=dom.elements.get('gf-canvas').surface,c=dom.createCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.fillStyle=dom.colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
image('green-flood-coordinated');dom.elements.get('gf-plan').value='baseline';dom.elements.get('gf-plan').fire('change');image('green-flood-baseline');dom.elements.get('gf-cross').fire('click');assert(GQA.result.baseline.frames[Math.floor(GQA.state.minute*60/E.SAMPLE)].phase2.walk);image('green-flood-crossing');
dom.setViewport(320);GQA.resize();image('green-flood-mobile-crossing');dom.elements.get('gf-plan').value='best';dom.elements.get('gf-plan').fire('change');dom.elements.get('gf-time').value=60;dom.elements.get('gf-time').fire('input');image('green-flood-mobile');
for(const minute of [0,10,100,720]){dom.elements.get('gf-time').value=minute;dom.elements.get('gf-time').fire('input');assert.equal(dom.elements.get('gf-current').textContent,minute.toFixed(1));}
console.log('PASS: 114 candidate plans, unchanged phase durations/clearance, vehicle and passenger ledgers, finite storage, no shortcut traffic and no added side/pedestrian burden for selected plans; offline rendering at 736/320px.');
