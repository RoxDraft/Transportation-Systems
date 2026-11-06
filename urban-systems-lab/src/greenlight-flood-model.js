(()=>{
 const DT=1,END=43200,SAMPLE=5,CYCLE=150,MAIN=75,SIDE_START=80,SIDE_END=100,WALK_START=105,WALK_END=115,CROSS_END=150,BUFFER=60;
 const phase=(t,offset=0)=>{const u=((t-offset)%CYCLE+CYCLE)%CYCLE;return {u,main:u<MAIN,side:u>=SIDE_START&&u<SIDE_END,walk:u>=WALK_START&&u<WALK_END,ped:u>=WALK_START,clear:u>=WALK_END};};
 const queue=()=>({rows:[],at:0,total:0});
 const add=(q,n,t,id)=>{if(n>1e-10){q.rows.push({n,t,id});q.total+=n;}};
 function take(q,budget,done){let used=0;while(budget>1e-10&&q.at<q.rows.length){const r=q.rows[q.at],n=Math.min(budget,r.n);r.n-=n;q.total-=n;budget-=n;used+=n;done?.(r,n);if(r.n<1e-10)q.at++;}q.total=q.at>=q.rows.length?0:Math.max(0,q.total);return used;}
 function deliver(map,t,item){const at=Math.ceil(t);if(!map.has(at))map.set(at,[]);map.get(at).push(item);}
 function simulate(p,offset=0,waterRun,upOffset=0,controller=null){const water=waterRun||DownstreamEngine.simulate({...p,localSois:true},'adaptive');
  const up=queue(),upBus=queue(),down=queue(),downBus=queue(),sides=[queue(),queue()],ped=[queue(),queue()],arrivals=new Map(),crossings=new Map(),stops=new Map(),busProgress=new Map();
  const frames=[],peakSide=[0,0],sideDelay=[0,0],maxPedWait=[0,0],pedDelay=[0,0],waiting=[0,0];
  let inLink=0,peopleCrossing=0,generated=0,passed=0,peopleIn=0,boarded=0,busCount=0,busPassed=0,peakQueue=0,peakBetween=0,peakUp=0,delay=0,passengerWait=0,spillSeconds=0,maxError=0,maxPeopleError=0,blockedEntries=0;
  let outLast=0,entryLast=0,pedStarted=0,sideOut=[0,0],w=CoupledEngine.waterAt(water,0),s1=phase(0,upOffset),s2=phase(0,offset),access=[true,true],gate=null,heldSeconds=0,peakInventory=0;
  const snapshot=t=>({t,offset,upOffset,water:w.depth[0],storage:w.storage,up:up.total+upBus.total,between:down.total+downBus.total,inTransit:inLink,mainQueue:up.total+upBus.total+down.total+downBus.total,side:sides.map(q=>q.total),ped:ped.map(q=>q.total),crossing:peopleCrossing,waiting:waiting.slice(),phase1:s1,phase2:s2,access:access.slice(),entry:entryLast,out:outLast,generated,passed,pedStarted,peopleIn,boarded,gate,linkSpace:Math.max(0,BUFFER-inLink-down.total-downBus.total)});
  frames.push(snapshot(0));
  for(let t=1;t<=END;t++){
   w=CoupledEngine.waterAt(water,t);s1=phase(t,upOffset);s2=phase(t,offset);const active=t<=7200,wet=p.rain>0&&t<=3600?.9:1,flood=CoupledEngine.capacity(w.depth[0],.18,1.5),spill=up.total+upBus.total+down.total+downBus.total>160?.85:1,road=4400/3600*wet*flood*spill;
   const sideRates=w.soiDepth.map(d=>450/3600*CYCLE/(SIDE_END-SIDE_START)*wet*CoupledEngine.capacity(d,.12,1.2));
   access=[Math.max(0,w.depth[0]-.15)<.02&&w.depth[0]<.17,Math.max(0,w.depth[0]-.12)<.01&&w.depth[0]<.17];
   if(active){add(up,.55,t);generated+=.55;for(let i=0;i<2;i++){add(sides[i],240/3600,t);generated+=240/3600;add(ped[i],i===0?.08:.02,t);peopleIn+=i===0?.08:.02;}}
   if((t===1||(t%300===0))&&t<14400){add(upBus,2.5,t,busCount++);generated+=2.5;}
   for(const r of arrivals.get(t)||[]){add(r.type==='bus'?downBus:down,r.n,r.t,r.id);inLink-=r.n;}arrivals.delete(t);
   for(const r of crossings.get(t)||[]){waiting[r.type]+=r.n;peopleCrossing-=r.n;}crossings.delete(t);
   if(controller){gate=controller({t,water:w.depth[0],up:up.total+upBus.total,between:down.total+downBus.total,inTransit:inLink,phase1:{...s1},phase2:{...s2}});if(s1.main&&gate.hold){heldSeconds++;s1={...s1,main:false,held:true,yellow:gate.yellow};}else if(gate.yellow)s1={...s1,main:false,held:true,yellow:true};}
   const finish=(row,n)=>{const value=(busProgress.get(row.id)||0)+n;busProgress.set(row.id,value);if(value>=2.5-1e-8){busPassed++;const travel=150/Math.max(.15,Math.sqrt(flood));deliver(stops,t+travel,{id:row.id});}};
   let budget=s2.main?road:0;outLast=take(downBus,budget,finish);budget-=outLast;outLast+=take(down,budget);passed+=outLast;
   const space=Math.max(0,BUFFER-inLink-down.total-downBus.total),travel=30/Math.max(.5,Math.sqrt(flood));budget=s1.main?Math.min(road,space):0;
   const send=type=>(row,n)=>{deliver(arrivals,t+travel,{type,n,t:row.t,id:row.id});inLink+=n;};
   entryLast=take(upBus,budget,send('bus'));budget-=entryLast;entryLast+=take(up,budget,send('general'));
   if(s1.main&&space<road-1e-7&&up.total+upBus.total>0)blockedEntries++;
   sideOut=[take(sides[0],s1.side?sideRates[0]:0),take(sides[1],s2.side?sideRates[1]:0)];passed+=sideOut[0]+sideOut[1];
   if(s2.walk){let capacity=2;for(let i=0;i<2;i++)if(access[i]){const moved=take(ped[i],capacity,(row,n)=>{maxPedWait[i]=Math.max(maxPedWait[i],t-row.t);deliver(crossings,t+(i===0?20:30),{type:i,n});peopleCrossing+=n;});capacity-=moved;pedStarted+=moved;}}
   for(const trip of stops.get(t)||[]){const allowed=waiting.reduce((sum,n,i)=>sum+(access[i]?n:0),0),part=allowed>0?Math.min(1,40/allowed):0;for(let i=0;i<2;i++)if(access[i]){const n=waiting[i]*part;waiting[i]-=n;boarded+=n;}}stops.delete(t);
   const q=up.total+upBus.total+down.total+downBus.total;peakQueue=Math.max(peakQueue,q);peakInventory=Math.max(peakInventory,q+inLink);peakUp=Math.max(peakUp,up.total+upBus.total);peakBetween=Math.max(peakBetween,down.total+downBus.total);delay+=q/3600;
   if(down.total+downBus.total>BUFFER*.9)spillSeconds++;
   for(let i=0;i<2;i++){peakSide[i]=Math.max(peakSide[i],sides[i].total);sideDelay[i]+=sides[i].total/3600;pedDelay[i]+=ped[i].total/3600;if(ped[i].total>0)maxPedWait[i]=Math.max(maxPedWait[i],t-ped[i].rows[ped[i].at].t);}
   passengerWait+=(ped[0].total+ped[1].total+waiting[0]+waiting[1])/3600;
   const pendingTraffic=q+inLink+sides[0].total+sides[1].total,pendingPeople=ped[0].total+ped[1].total+peopleCrossing+waiting[0]+waiting[1];
   maxError=Math.max(maxError,Math.abs(generated-passed-pendingTraffic));maxPeopleError=Math.max(maxPeopleError,Math.abs(peopleIn-boarded-pendingPeople));
   if(t%SAMPLE===0)frames.push(snapshot(t));
  }
  return {offset,upOffset,water,frames,stats:{peakQueue,peakInventory,heldSeconds,peakUp,peakBetween,delay,peakSide,sideDelay,residentDelay:sideDelay[0]+sideDelay[1],maxPedWait,pedDelay,passengerWait,blockedEntries,nearFullMinutes:spillSeconds/60,generated,passed,pendingTraffic:generated-passed,peopleIn,boarded,pendingPeople:peopleIn-boarded,busCount,busPassed,diverted:0,maxError,maxPeopleError}};
 }
 function acceptable(candidate,base){const a=candidate.stats,b=base.stats;return a.peakSide.every((v,i)=>v<=b.peakSide[i]+1e-7)&&a.sideDelay.every((v,i)=>v<=b.sideDelay[i]+1e-7)&&a.maxPedWait.every((v,i)=>v<=b.maxPedWait[i]+1e-7)&&a.passengerWait<=b.passengerWait+1e-7&&a.peakQueue<=b.peakQueue+1e-7;}
 function optimize(p,water){const baseline=simulate(p,0,water);let best=baseline;const audit=[];for(const upOffset of [0,30,60,90,120,135])for(const relative of [15,30,45]){const offset=(upOffset+relative)%CYCLE,r=simulate(p,offset,water,upOffset),accepted=acceptable(r,baseline);audit.push({upOffset,offset,accepted,peak:r.stats.peakQueue,delay:r.stats.delay,side:r.stats.sideDelay,ped:r.stats.maxPedWait});if(accepted&&(r.stats.peakQueue<best.stats.peakQueue-.01||Math.abs(r.stats.peakQueue-best.stats.peakQueue)<=.01&&r.stats.delay<best.stats.delay))best=r;}return {baseline,best,audit};}
 globalThis.GreenFloodEngine={simulate,optimize,acceptable,phase,DT,END,SAMPLE,CYCLE,MAIN,SIDE_START,SIDE_END,WALK_START,WALK_END,CROSS_END,BUFFER};
})();
