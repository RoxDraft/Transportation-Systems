(()=>{
 // Causal admission controller: only current detector values are available.
 // A termination is latched through the rest of this main-road window;
 // the existing five-second clearance and all side/pedestrian slots remain.
 function createController(){let cycle=null,closed=false,closedAt=null;return observation=>{
  const {t,water,up,between,inTransit,phase1}=observation;
  const key=t-phase1.u;if(cycle!==key){cycle=key;closed=false;closedAt=null;}
  const occupancy=between+inTransit;
  // Reserve more receiving space as inundation reduces moving/storage margin.
  const target=Math.max(24,54-180*Math.max(0,water-.03));
  const reason=water>=.17?'water':occupancy>=target&&up>0?'queue':'open';
  if(phase1.main&&!closed&&reason!=='open'&&(phase1.u===0||phase1.u>=5)){closed=true;closedAt=t;}
  return {hold:phase1.main&&closed,yellow:closed&&t-closedAt<3,target,occupancy,reason:closed?(reason==='open'?'latched':reason):'open'};
 };}
 function compare(p,waterRun){const water=waterRun||DownstreamEngine.simulate({...p,localSois:true},'adaptive');
  // Frozen commissioned plan from the preceding version. Never optimize using
  // the future rain/queues of the event currently being simulated.
  const fixed=GreenFloodEngine.simulate(p,0,water,120);
  const reactive=GreenFloodEngine.simulate(p,0,water,120,createController());
  return {fixed,reactive};
 }
 globalThis.ReactiveSignalEngine={compare,createController};
})();
