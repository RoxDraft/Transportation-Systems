const assert=require('assert/strict');require('../src/heat-model.js');require('../src/atmosphere-model.js');require('../src/exposure-camera.js');
const E=ExposureCamera,H=AtmosphereModel,c=E.create(),run={},f=(t,dose,heatDose)=>({t,dose,heatDose});
assert.equal(c.update({frame:f(0,[0,0,0,0],[0,0,0,0]),run}).focus,null);
let r=c.update({frame:f(30,[.6,0,.2,.1],[0,0,0,0]),run,wall:1});assert.equal(r.focus,0);
r=c.update({frame:f(60,[.6,0,1.2,.1],[0,0,0,0]),run,wall:2});assert.equal(r.focus,0,'Camera moved before its real dwell');
r=c.update({frame:f(60,[.6,0,1.2,.1],[0,0,0,0]),run,wall:10});assert.equal(r.focus,2);
r=c.update({frame:f(90,[1.25,0,1.2,.1],[0,0,0,0]),run,wall:20});assert.equal(r.focus,2,'Small score jitter switched view');
r=c.update({frame:f(120,[1.25,0,1.2,.1],[0,0,1600,0]),run,wall:30});assert.equal(r.focus,2,'Heat and dust units were mixed without normalization');
r=c.update({frame:f(150,[1.25,0,1.2,.1],[0,0,1600,4000]),run,wall:40});assert.equal(r.focus,3);
assert.equal(c.update({frame:f(0,[0,0,0,0],[0,0,0,0]),run,wall:41}).focus,null,'Backward seek retained old focus');
assert.equal(c.update({frame:f(120,[5,0,1,.1],[0,0,0,6000]),run,wall:50,thresholds:{mode:'dust'}}).focus,0);
assert.equal(c.update({frame:f(120,[5,0,1,.1],[0,0,0,6000]),run,wall:51,seek:true,thresholds:{mode:'heat'}}).focus,3);
assert.equal(c.update({frame:f(120,[5,0,1,.1],[0,0,0,6000]),run,enabled:false}).focus,null);
for(const climate of ['hot','humid']){
 const before=JSON.stringify(H.seasons[climate]),all=H.compare({...H.seasons[climate],hour:14,plan:'protected'}),{base,variants}=all;
 assert(H.guard(variants.protected,base));assert(H.guard(variants['shade-only'],base));assert(H.guard(variants['source-only'],base));
 assert.deepEqual(variants['shade-only'].stats.fine,base.stats.fine,'Shade changed particulate transport');
 assert.deepEqual(variants['source-only'].stats.heatDose,base.stats.heatDose,'Source control fabricated heat relief');
 for(const j of [2,3])assert.equal(variants['shade-only'].stats.heatDose[j],base.stats.heatDose[j],'Stop shade was silently added to communities');
 for(const candidate of Object.values(variants))for(const frame of candidate.frames){
  for(let j=0;j<4;j++){assert(Math.abs(frame.bySource.reduce((s,o)=>s+o.dose[j],0)-frame.dose[j])<1e-8);assert(frame.heatDose[j]>=0);}
  assert(Math.abs(frame.totals.error)<1e-6);
 }
 assert(all.recommended&&H.guard(variants[all.recommended],base));assert(H.violations(variants['vent-only'],base).length>0,'Ventilation was always declared safe');
 const chosen=E.create().update({frame:variants.protected.stats,run:variants.protected,wall:0});assert([0,2,3].includes(chosen.focus));
 assert.equal(JSON.stringify(H.seasons[climate]),before);console.log(climate,{recommended:all.recommended,ventilationFailures:H.violations(variants['vent-only'],base),stopHeat:[base.stats.heatDose[0],variants.protected.stats.heatDose[0]],focus:chosen.focus});
}
const a={frames:[{t:0,dose:[0,0,0,0],heatDose:[0,0,0,0],edge:0,heatEdge:0,totals:{exported:0}},{t:30,dose:[0,0,2,1],heatDose:[0,0,0,0],edge:1,heatEdge:1,totals:{exported:1}},{t:60,dose:[0,0,3,3],heatDose:[0,0,0,0],edge:2,heatEdge:1,totals:{exported:2}}]};
const b=structuredClone(a);b.frames[1].dose[2]=2.5;b.frames[2].dose[2]=2;assert(H.violations(b,a).includes('dust-R1'),'Intermediate burden was concealed by a lower end value');
b.frames[1].dose[2]=2;b.frames[1].heatDose[3]=1;assert(H.violations(b,a).includes('heat-R2'),'Heat shift escaped the guard');
assert.equal(H.chooseSafe({base:{...a,stats:a.frames.at(-1)},bad:{...b,stats:b.frames.at(-1)}}),null);
console.log('PASS: normalized heat/particle camera selection, dwell and challenger hysteresis, scrubbing/manual reset, separated measures, per-receptor source attribution, community heat/particle guards over every frame, and refusal of unsafe recommendations.');
