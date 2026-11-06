const assert=require('assert/strict');require('../src/day-model.js');require('../src/day-playback.js');const P=DayPlayback;
const samples=[{t:0,roadQueue:0,depth:0,pond:0},{t:5,roadQueue:65,depth:.13,pond:91},{t:10,roadQueue:80,depth:.14,pond:95},{t:15,roadQueue:0,depth:0,pond:0},{t:900,roadQueue:0,depth:0,pond:0},{t:915,roadQueue:0,depth:0,pond:0},{t:920,roadQueue:65,depth:.13,pond:91}];
const events=P.detect(samples,100);assert.equal(events.length,2);assert.deepEqual(events[0].types,['queue','access','storage']);
const c=P.create(events);c.seek(0);let s=c.advance(0,.2,86400);assert.equal(s.t,5,'Overview skipped a short event');assert(s.entered&&s.focus);
let t=s.t;for(let i=0;i<41;i++){s=c.advance(t,.2,86400);t=s.t;}assert(!s.focus&&s.exited,'Automatic overview return missing');assert(t>5&&t<1000);
c.skip(t);const continued=c.advance(t,.1,86400);assert(continued.t>t,'Overview restarted the day');
for(const plan of ['base','detain','pump']){const run=DayModel.simulate({},plan),before=JSON.stringify(run.stats),list=P.detect(run.observations,run.pondCap),controller=P.create(list);controller.seek(0);let t=0,steps=0,entries=0;
 while(t<86400&&steps<1500){const s=controller.advance(t,.2,86400,true);assert(s.t>=t&&s.t<=86400);t=s.t;entries+=Number(s.entered);steps++;}
 assert.equal(t,86400,'Automatic playback never finished');assert(entries>=2&&entries<=8,'Repeated or missing episodes');assert.equal(JSON.stringify(run.stats),before,'Playback changed model outcomes');console.log(plan,{entries,playbackSeconds:steps*.2,events:list.length});
}
console.log('PASS: all three triggers, short-event capture, shared onsets, hysteresis and 15-minute rearming, 8-second slow windows, return without rewind, and unchanged model results.');
