(()=>{
 const DT=5,END=43200,SAMPLE=60;
 const options={base:{name:'ฐานสมมติ',water:'base'},detain:{name:'หน่วง + คุมปล่อย',water:'adaptive'},relay:{name:'เพิ่มปั๊มส่งต่อ',water:'relay'},pump:{name:'เพิ่มปั๊มปลายคลอง',water:'outlet'},integrated:{name:'หน่วง + คุมซอย/ป้าย',water:'adaptive',protect:true}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function capacity(depth,limit,power){return depth>=limit?0:Math.max(0,1-depth/limit)**power;}
 function waterAt(run,t){const position=t/120,i=Math.min(run.frames.length-1,Math.floor(position)),a=run.frames[i],b=run.frames[Math.min(i+1,run.frames.length-1)],r=position-i;return {depth:a.depth.map((v,j)=>v+(b.depth[j]-v)*r),soiDepth:a.soiDepth.map((v,j)=>v+(b.soiDepth[j]-v)*r),storage:a.storage+(b.storage-a.storage)*r};}
 function queue(){return {rows:[],at:0,total:0,local:0};}
 function add(q,amount,t,type){if(amount>1e-12){q.rows.push({amount,t,type});q.total+=amount;if(type==='local')q.local+=amount;}}
 function take(q,budget,onDone){let used=0;while(budget>1e-10&&q.at<q.rows.length){const row=q.rows[q.at],amount=Math.min(budget,row.amount);row.amount-=amount;q.total-=amount;if(row.type==='local')q.local-=amount;budget-=amount;used+=amount;if(row.amount<1e-10){onDone?.(row);q.at++;}}q.total=Math.max(0,q.total);q.local=Math.max(0,q.local);return used;}
 function simulate(p,id,waterRun){const option=options[id],water=waterRun||DownstreamEngine.simulate({...p,localSois:true},option.water),main=queue(),bus=queue(),side=[queue(),queue()],frames=[];
  let produced=0,passed=0,diverted=0,mainDelay=0,soiDelay=[0,0],passengerWait=0,passengerCreated=0,boarded=0,missed=0,waiting=[0,0],busCreated=0,busPassed=0,tripAt=0,nextBus=0,busStop=[];
  let peakMain=0,peakSide=[0,0],closed=[0,0],mainBlocked=0,peakWait=0,maxError=0,mainOut=0,sideOut=[0,0],busArrived=0;
  function snap(t,w,mainCap,sideCap,access){return {t,depth:w.depth[0],soiDepth:w.soiDepth.slice(),mainQueue:main.total+bus.total,mainHeld:Math.max(0,main.total+bus.total-160),sideQueue:side.map(q=>q.total),waiting:waiting.slice(),mainCap,sideCap:sideCap.slice(),access:access.slice(),mainOut,sideOut:sideOut.slice(),diverted,passed,produced,boarded,passengerCreated,busCreated,busPassed,storage:w.storage};}
  frames.push(snap(0,waterAt(water,0),2200/3600,[450/3600,450/3600],[true,true]));
  for(let t=DT;t<=END;t+=DT){const w=waterAt(water,t),active=t<=7200,wet=p.rain>0&&t<=3600?.9:1,spill=main.total+bus.total>160?.85:1;
   const mainCap=2200/3600*wet*capacity(w.depth[0],.18,1.5)*spill,sideCap=w.soiDepth.map(d=>450/3600*wet*capacity(d,.12,1.2));
   const pavement=option.protect?.15:.06,ramp=option.protect?.12:.02;
   const access=[Math.max(0,w.depth[0]-pavement)<.02&&w.depth[0]<.17,Math.max(0,w.depth[0]-ramp)<.01&&w.depth[0]<.17];
   if(active){waiting[0]+=.08*DT;waiting[1]+=.02*DT;passengerCreated+=.1*DT;}
   for(let i=0;i<2;i++)if(!access[i]&&(active||waiting[i]>1e-6))closed[i]+=DT;
   const incoming=active?.55*DT:0;produced+=incoming;let sent=0;
   for(let i=0;i<2;i++){const own=active?240/3600*DT:0;add(side[i],own,t,'local');produced+=own;}
   if(!option.protect&&incoming>0){const mainEstimate=mainCap>1e-8?main.total/mainCap:Infinity;
    const candidates=side.map((q,i)=>({i,cost:sideCap[i]>1e-8?600+q.total/sideCap[i]:Infinity})).sort((a,b)=>a.cost-b.cost);
    for(const {i,cost}of candidates)if(cost<mainEstimate&&side[i].total<50&&Number.isFinite(cost)){const amount=Math.min(incoming*.25,50-side[i].total);add(side[i],amount,t,'diverted');sent+=amount;diverted+=amount;}
   }
   add(main,incoming-sent,t,'general');
   if(t>=nextBus&&nextBus<14400){add(bus,2.5,t,'bus');produced+=2.5;busCreated++;nextBus+=300;}
   let budget=mainCap*DT;mainOut=0;
   const busDone=()=>{busPassed++;const travel=180/Math.max(.15,Math.sqrt(capacity(w.depth[0],.18,1.5)));busStop.push({arrival:t+travel,done:false});};
   if(option.protect){const used=take(bus,budget,busDone);passed+=used;budget-=used;mainOut+=used;const general=take(main,budget);passed+=general;mainOut+=general;}
   else while(budget>1e-10&&(main.total>1e-10||bus.total>1e-10)){
    const generalAt=main.rows[main.at]?.t??Infinity,busAt=bus.rows[bus.at]?.t??Infinity,q=busAt<=generalAt?bus:main;
    const row=q.rows[q.at],allowed=Math.min(budget,row.amount),used=take(q,allowed,q===bus?busDone:undefined);budget-=used;passed+=used;mainOut+=used;
   }
   sideOut=[0,0];for(let i=0;i<2;i++){soiDelay[i]+=side[i].local*DT/3600;sideOut[i]=take(side[i],sideCap[i]*DT);passed+=sideOut[i];}
   mainDelay+=(main.total+bus.total)*DT/3600;
   for(const trip of busStop){if(!trip.done&&trip.arrival<=t){trip.done=true;busArrived++;const eligible=waiting.reduce((sum,n,i)=>sum+(access[i]?n:0),0),fraction=eligible>0?Math.min(1,40/eligible):0;for(let i=0;i<2;i++)if(access[i]){const n=waiting[i]*fraction;waiting[i]-=n;boarded+=n;}if(waiting.some((n,i)=>n>0&&!access[i]))missed++;}}
   passengerWait+=(waiting[0]+waiting[1])*DT/3600;
   peakMain=Math.max(peakMain,main.total+bus.total);for(let i=0;i<2;i++)peakSide[i]=Math.max(peakSide[i],side[i].total);peakWait=Math.max(peakWait,waiting[0]+waiting[1]);if(mainCap<1e-8&&active)mainBlocked+=DT;
   const error=produced-passed-main.total-bus.total-side[0].total-side[1].total;maxError=Math.max(maxError,Math.abs(error));
   if(t%SAMPLE===0)frames.push(snap(t,w,mainCap,sideCap,access));
  }
  const residentDelay=soiDelay[0]+soiDelay[1];return {option,water,frames,stats:{peakMain,peakSide,diverted,mainDelay,residentDelay,soiDelay,passengerWait,passengerCreated,boarded,pendingPassengers:waiting[0]+waiting[1],peakWait,closedMinutes:closed.map(t=>t/60),mainBlockedMinutes:mainBlocked/60,busCreated,busPassed,busArrived,missed,produced,passed,pendingTraffic:main.total+bus.total+side[0].total+side[1].total,maxError}};
 }
 globalThis.CoupledEngine={options,simulate,waterAt,capacity,DT,END,SAMPLE};
})();
