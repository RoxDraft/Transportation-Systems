(() => {
 const DT=2,END=43200,SAMPLE=120,BASE=-.5,FLOOR=-1,BANK=.8;
 const modes=['base','relay','outlet','detain','clock','adaptive','combined'];
 const names={base:'ฐานสมมติ',relay:'เพิ่มปั๊มส่งต่อ ×2',outlet:'เพิ่มปั๊มปลายคลอง ×2',detain:'หน่วง 20,000 · ปล่อยหลังฝน',clock:'หน่วง 20,000 · รอหลังนาที 240',adaptive:'หน่วง 20,000 · คุมตามพื้นที่รับ',combined:'หน่วง + ปั๊มปลายทาง + คุมปล่อย'};
 function config(k,p){return {storageCap:['detain','clock','adaptive','combined'].includes(k)?20000:0,relay:k==='relay'?2:1,outlet:['outlet','combined'].includes(k)?2:1,feedback:['adaptive','combined'].includes(k),pumpGuard:k==='combined',clock:k==='clock',localCap:20000,wellCap:3000,pipe:12*(1-p.silt/100)};}
 function tide(t,p){return t<=10800?p.tide:t<14400?p.tide*(14400-t)/3600:0;}
 function simulate(p,key){
  const c=config(key,p),areas=[100000,40000,30000,50000,40000,20000],catchments=[1e6,4e5,3e5,5e5,4e5,1e5],canalAreas=[12000,10000,30000,22000],receiverArea=50000;
  const road=areas.map(()=>0),canal=canalAreas.map(a=>(BASE-FLOOR)*a),soi=[0,0];
  let receiver=(p.tide-FLOOR)*receiverArea,up=0,well=0,storage=0,input=0,seaIn=0,exported=0,release=0,maxError=0;
  const initial=receiver+canal.reduce((a,b)=>a+b,0),peak=areas.map(()=>0),dur=areas.map(()=>0),peakStages=canalAreas.map(()=>BASE),peakTime=areas.map(()=>0),frames=[];
  let initialToRiver=0,peakRiver=p.tide,storagePeak=0,relayQ=[0,0],outQ=[0,0],localQ=[0,0],seaQ=0,reverseQ=Array(5).fill(0),soiQ=[0,0];
  const soiPeak=[0,0],soiFloodSeconds=[0,0];
  const levels=()=>canal.map((v,i)=>FLOOR+v/canalAreas[i]);
  const riverLevel=()=>FLOOR+receiver/receiverArea;
  function snap(t){const total=road.reduce((a,b)=>a+b,0)+canal.reduce((a,b)=>a+b,0)+receiver+up+well+storage+soi[0]+soi[1];return {t,depth:road.map((v,i)=>v/areas[i]),road:road.slice(),soi:soi.slice(),soiDepth:soi.map(v=>v/10000),soiQ:soiQ.slice(),canal:canal.slice(),stages:levels(),river:riverLevel(),receiver,up,well,storage,release,relayQ:relayQ.slice(),outQ:outQ.slice(),localQ:localQ.slice(),reverseQ:reverseQ.slice(),seaQ,tail:tide(t,p),input,initial,seaIn,exported,error:initial+input+seaIn-exported-total};}
  frames.push(snap(0));
  for(let t=DT;t<=END;t+=DT){
   const raining=t<=3600,rain=catchments.map(a=>raining?p.rain*.8*a/1000/3600:0);
   input+=rain.reduce((a,b)=>a+b,0)*DT;
   for(let i=1;i<road.length;i++)road[i]+=rain[i]*DT;
   const fraction=p.localSois?.96:1;
   if(p.localSois)for(let i=0;i<2;i++)soi[i]+=rain[0]*.02*DT;
   if(c.storageCap){storage+=rain[0]*.6*DT;const over=Math.max(0,storage-c.storageCap);storage-=over;road[0]+=rain[0]*(fraction-.6)*DT+over;}else road[0]+=rain[0]*fraction*DT;
   const l=levels(),r=riverLevel();
   let allowed=!raining;
   if(c.clock)allowed=allowed&&t>=14400;
   if(c.feedback)allowed=allowed&&Math.max(l[2],l[3])<.10&&r<1.60&&Math.max(road[3]/areas[3],road[4]/areas[4],road[5]/areas[5])<.03;
   release=allowed?Math.min(.8,storage/DT,(c.localCap-up)/DT):0;storage-=release*DT;up+=release*DT;
   const inlet=Math.min(22*(1-p.trash/100)*Math.sqrt(Math.max(0,road[0]/areas[0])/.05),road[0]/DT,(c.localCap-up)/DT);road[0]-=inlet*DT;up+=inlet*DT;
   const upArea=c.localCap/1.3,upStage=up>=c.localCap-1e-6?BANK+road[0]/areas[0]:BASE+up/upArea,wellStage=FLOOR+well/2000,h=upStage-wellStage;
   const eq=Math.abs(h)/(1/(up>=c.localCap-1e-6?areas[0]:upArea)+1/2000),potential=c.pipe*Math.sqrt(Math.abs(h));
   const pipe=h>=0?Math.min(potential,up/DT,eq/DT):-Math.min(potential,well/DT,(c.localCap-up)/DT,eq/DT);up-=pipe*DT;well+=pipe*DT;
   const pumpLevel=FLOOR+well/2000;
   localQ=l.slice(0,2).map((z,i)=>8*(i===0?.6:.4)*Math.sqrt(Math.max(0,1-(Math.max(0,z-pumpLevel)/2.5)**2)));
   const need=localQ.reduce((a,b)=>a+b,0),f=need>0?Math.min(1,well/DT/need):0;localQ=localQ.map(q=>q*f);
   for(let i=0;i<2;i++){well-=localQ[i]*DT;canal[i]+=localQ[i]*DT;}
   const spill=Math.max(0,well-c.wellCap);well-=spill;const intoUp=Math.min(spill,c.localCap-up);up+=intoUp;road[0]+=spill-intoUp;
   for(let i=0;i<2;i++){
    const upper=FLOOR+canal[i]/canalAreas[i],lower=FLOOR+canal[i+2]/canalAreas[i+2];
    const lift=Math.max(0,lower-upper),guard=c.pumpGuard?Math.max(0,Math.min(1,(.25-lower)/.3)):1;
    relayQ[i]=Math.min((i===0?8:6)*c.relay*Math.sqrt(Math.max(0,1-(lift/2.5)**2))*guard,Math.max(0,canal[i]-(BASE-FLOOR)*canalAreas[i])/DT);
    canal[i]-=relayQ[i]*DT;canal[i+2]+=relayQ[i]*DT;
   }
   for(let i=0;i<4;i++){
    const j=i+1,level=FLOOR+canal[i]/canalAreas[i],head=.25+road[j]/areas[j]-level,limit=Math.abs(head)/(1/areas[j]+1/canalAreas[i]);
    const potential=(i%2===0?8:6)*(1-p.trash/100)*Math.sqrt(Math.abs(head));
    const q=head>=0?Math.min(potential,road[j]/DT,limit/DT):-Math.min(potential,canal[i]/DT,limit/DT);
    road[j]-=q*DT;canal[i]+=q*DT;reverseQ[i]=Math.max(0,-q);
   }
   if(p.localSois)for(let i=0;i<2;i++){
    const level=FLOOR+canal[i]/canalAreas[i],head=.25+soi[i]/10000-level,eq=Math.abs(head)/(1/10000+1/canalAreas[i]),potential=1.5*(1-p.trash/100)*Math.sqrt(Math.abs(head));
    soiQ[i]=head>=0?Math.min(potential,soi[i]/DT,eq/DT):-Math.min(potential,canal[i]/DT,eq/DT);
    soi[i]-=soiQ[i]*DT;canal[i]+=soiQ[i]*DT;
    soiPeak[i]=Math.max(soiPeak[i],soi[i]/10000);if(soi[i]/10000>.05)soiFloodSeconds[i]+=DT;
   }
   for(let i=0;i<2;i++){
    const j=i+2,level=FLOOR+canal[j]/canalAreas[j],r=riverLevel(),lift=Math.max(0,r-level);
    const throttle=c.pumpGuard?Math.max(0,Math.min(1,(1.65-r)/.1)):1;
    outQ[i]=Math.min((i===0?10:8)*c.outlet*Math.sqrt(Math.max(0,1-(lift/2.5)**2))*throttle,Math.max(0,canal[j]-(BASE-FLOOR)*canalAreas[j])/DT);
    canal[j]-=outQ[i]*DT;receiver+=outQ[i]*DT;initialToRiver+=outQ[i]*DT;
   }
   // F is a hypothetical vulnerable receiving-side connection, not a named real community.
   let rNow=riverLevel(),headF=1.65+road[5]/areas[5]-rNow;
   const qF0=4*(1-p.trash/100)*Math.sqrt(Math.abs(headF)),eqF=Math.abs(headF)/(1/areas[5]+1/receiverArea);
   const qF=headF>=0?Math.min(qF0,road[5]/DT,eqF/DT):-Math.min(qF0,receiver/DT,eqF/DT);
   road[5]-=qF*DT;receiver+=qF*DT;reverseQ[4]=Math.max(0,-qF);
   rNow=riverLevel();const hSea=rNow-tide(t,p),qSea=40*Math.sqrt(Math.abs(hSea)),eqSea=Math.abs(hSea)*receiverArea/DT;
   seaQ=hSea>=0?Math.min(qSea,receiver/DT,eqSea):-Math.min(qSea,eqSea);
   receiver-=seaQ*DT;if(seaQ>=0)exported+=seaQ*DT;else seaIn-=seaQ*DT;
   for(let i=0;i<4;i++){const over=Math.max(0,canal[i]-(BANK-FLOOR)*canalAreas[i]);canal[i]-=over;road[i+1]+=over;peakStages[i]=Math.max(peakStages[i],FLOOR+canal[i]/canalAreas[i]);}
   for(let i=0;i<6;i++){road[i]=Math.max(0,road[i]);const depth=road[i]/areas[i];if(depth>peak[i]){peak[i]=depth;peakTime[i]=t/60;}if(depth>.05)dur[i]+=DT;}
   peakRiver=Math.max(peakRiver,riverLevel());storagePeak=Math.max(storagePeak,storage);
   const total=road.reduce((a,b)=>a+b,0)+canal.reduce((a,b)=>a+b,0)+receiver+up+well+storage+soi[0]+soi[1];
   maxError=Math.max(maxError,Math.abs(initial+input+seaIn-exported-total));
   if(t%SAMPLE===0)frames.push(snap(t));
  }
  return {config:c,frames,stats:{peakCm:peak.map(x=>x*100),floodMinutes:dur.map(x=>x/60),soiPeakCm:soiPeak.map(x=>x*100),soiFloodMinutes:soiFloodSeconds.map(x=>x/60),peakTime,peakStages,peakRiver,storagePeak,storageEnd:storage,input,initial,seaIn,exported,remaining:initial+input+seaIn-exported,maxError,toReceiver:initialToRiver}};
 }
 globalThis.DownstreamEngine={modes,names,config,simulate,DT,END,SAMPLE};
})();
