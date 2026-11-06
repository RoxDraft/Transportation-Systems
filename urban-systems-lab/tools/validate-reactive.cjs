const fs=require('fs'),path=require('path'),assert=require('assert/strict'),base=path.resolve(__dirname,'..');
const dom=require('./validate.cjs');require(base+'/src/coupled-model.js');require(base+'/src/greenlight-flood-model.js');require(base+'/src/reactive-signal-model.js');
const E=GreenFloodEngine,R=ReactiveSignalEngine,p0={rain:80,tide:1.5,trash:25,silt:40};
// Detector histories with a shared prefix produce the same decisions, regardless
// of their different future tails. Both queue and water sensors cause changes.
const obs=(t,water=0,occupancy=0)=>({t,water,up:200,between:occupancy,inTransit:0,phase1:E.phase(t),phase2:E.phase(t)});
const c1=R.createController(),c2=R.createController();
for(let t=0;t<60;t++){const x=obs(t,.06,t>=15?55:0);assert.deepEqual(c1(x),c2(x));}
assert(c1(obs(60)).hold,'Termination must latch until the next main window');
assert(!c1(obs(150)).hold,'Next cycle can reopen');
assert(R.createController()(obs(0,.18)).hold,'Water sensor must stop entry');
assert(R.createController()(obs(0,0,59)).hold,'Queue sensor must reserve space');
const late=R.createController();for(let t=0;t<74;t++)late(obs(t));for(let t=74;t<77;t++)assert(late(obs(t,0,59)).yellow,'Three-second yellow must complete across the scheduled green boundary');assert(!late(obs(77)).yellow);
let totalHeld=0,summary=[];
for(const p of [p0,{...p0,rain:0},{...p0,rain:110,trash:60,silt:60},{...p0,rain:150,tide:2,trash:90,silt:90},{...p0,trash:100},{...p0,silt:100}]){
 const r=R.compare(p),a=r.reactive.stats,b=r.fixed.stats;assert.equal(r.fixed.water,r.reactive.water);
 assert.deepEqual(a.sideDelay,b.sideDelay,'Resident delay changed');assert.deepEqual(a.peakSide,b.peakSide,'Resident queue changed');assert.deepEqual(a.maxPedWait,b.maxPedWait,'Crossing wait changed');
 for(const run of [r.fixed,r.reactive]){
  const s=run.stats;assert(s.maxError<1e-5&&s.maxPeopleError<1e-5);assert.equal(s.diverted,0);assert(Math.abs(s.generated-5040)<1e-5&&Math.abs(s.peopleIn-720)<1e-5);
  for(const f of run.frames){const phase=E.phase(f.t,120);assert.equal(f.phase1.side,phase.side);assert.equal(f.phase1.ped,phase.ped);assert.equal(f.phase2.walk,E.phase(f.t).walk);
   assert(f.between+f.inTransit<=60+1e-6);if(f.entry>1e-7)assert(f.phase1.main);if(f.crossing>1e-7)assert(f.phase2.ped&&!f.phase2.main&&!f.phase2.side);
   if(f.gate?.hold&&phase.main)assert(!f.phase1.main,'Gate failed');
  }
 }
 totalHeld+=a.heldSeconds;summary.push({p,queueFixed:b.peakQueue,queueReactive:a.peakQueue,delayChange:a.delay-b.delay,passengerChange:a.passengerWait-b.passengerWait,heldMinutes:a.heldSeconds/60});
 if(p===p0){assert.equal(a.peakQueue,b.peakQueue);assert.equal(a.delay,b.delay);assert.equal(a.peakInventory,b.peakInventory);}
}
assert(totalHeld>0,'No reactive action under stress');console.log('Reactive scenarios',JSON.stringify(summary));
const html=fs.readFileSync(base+'/reactive-signal.html','utf8'),root=new dom.Element('div',{id:'reactive-signal'});root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');dom.elements.set('reactive-signal',root);dom.setViewport(736);
new Function([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1].replace(/\}\)\(\);\s*$/,'globalThis.RQA={state,get result(){return result;},resize,redraw,restore};})();'))();
function image(name){const src=dom.elements.get('rs-canvas').surface,c=dom.createCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.fillStyle=dom.colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
image('reactive-default');dom.elements.get('rs-cross').fire('click');assert(E.phase(RQA.state.minute*60).walk);image('reactive-crossing');
RQA.restore({modelContent:{reactiveSignal:{...p0,rain:150,tide:2,trash:90,silt:90,plan:'reactive'}}});dom.elements.get('rs-event').fire('click');assert(RQA.result.reactive.frames[Math.floor(RQA.state.minute*12+1e-7)].gate.hold);image('reactive-held');
dom.setViewport(320);RQA.resize();image('reactive-mobile');
for(const minute of [0,10,100,720]){dom.elements.get('rs-time').value=minute;dom.elements.get('rs-time').fire('input');assert.equal(dom.elements.get('rs-current').textContent,minute.toFixed(1));}
console.log('PASS: causal queue/water decisions, frozen comparison plan, full pedestrian slots, unchanged local queues and water, conserved demand including upstream holds, finite link, 6 scenarios, offline UI at 736/320px.');
