const assert=require('assert/strict');require('../src/day-model.js');require('../src/day-camera.js');
const c=DayCamera.create(),samples=[],cap=100,at=(t,q=0,d=0,p=0,extra={})=>c.update({t,frame:{roadQueue:q,depth:d,pond:p},pondCap:cap,samples,wall:t,...extra});
assert.equal(at(0).focus,null);
assert.equal(at(1,60).focus,'queue');
assert.equal(at(2,59).focus,'queue','Queue threshold jitter changed camera');
assert.equal(at(3,70,.12,90).focus,'access','Access must interrupt lower priority');
assert.deepEqual(at(4,70,.12,90).active,['access','storage','queue']);
assert(at(5,70,.10,90).recovering);
assert.equal(at(124,70,.10,90).focus,'access','Released before 120 continuous model seconds');
assert.equal(at(125,70,.10,90).focus,'storage');
at(126,70,.11,80);at(200,70,.11,85);at(201,70,.11,80);
assert.equal(at(320,70,.11,80).focus,'storage','A reset-band interruption must restart confirmation');
assert.equal(at(321,70,.11,80).focus,'queue');
at(322,45);assert.equal(at(441,45).focus,'queue');assert.equal(at(442,45).action,'overview');
assert.equal(at(2,80,0,0,{seek:true}).focus,'queue','Seek did not reconstruct focus');
assert.equal(at(3,80,0,0,{enabled:false}).focus,null);assert.equal(at(4).focus,null);
const fastSamples=[{t:0,roadQueue:70,depth:.13,pond:95},{t:5,roadQueue:0,depth:0,pond:0},{t:125,roadQueue:0,depth:0,pond:0}];
const fast=DayCamera.create();let r=fast.update({t:0,frame:fastSamples[0],pondCap:100,samples:fastSamples,wall:0});assert.equal(r.focus,'access');
r=fast.update({t:720,frame:fastSamples[2],pondCap:100,samples:fastSamples,wall:1});assert.equal(r.focus,'access','Minimum real dwell missing');
r=fast.update({t:720,frame:fastSamples[2],pondCap:100,samples:fastSamples,wall:5});assert.equal(r.action,'overview','Fast playback lost clear observations');
r=fast.update({t:0,frame:fastSamples[0],pondCap:100,samples:fastSamples,wall:6});assert.equal(r.focus,'access','Backward scrub failed');
assert.equal(fast.update({t:0,frame:fastSamples[2],pondCap:100,samples:[],wall:7}).focus,null,'New run retained old risks');
for(const plan of ['base','detain','pump']){
 const run=DayModel.simulate({sampleSeconds:5},plan),before=JSON.stringify(run),director=DayCamera.create(),events=[];
 for(let i=0;i<run.observations.length;i++){const f=run.observations[i],r=director.update({t:f.t,frame:f,pondCap:run.pondCap,samples:run.observations,wall:i/5});if(r.action!=='none')events.push([f.t,r.focus]);}
 const end=run.frames.at(-1);assert.equal(director.update({t:86400,frame:end,pondCap:run.pondCap,samples:run.observations,wall:4000}).focus,null,'Unresolved camera at end of day');
 assert(events.some(e=>e[1]==='queue'));assert(events.some(e=>e[1]==='access'));if(plan==='base')assert(events.some(e=>e[1]==='storage'));
 assert.equal(JSON.stringify(run),before,'Director mutated model');console.log(plan,events);
}
console.log('PASS: three triggers, access priority, threshold jitter, continuous 120-second release, minimum camera dwell, sampled fast-forward, backward seek, disabled/new-run reset and unchanged full-day model.');
