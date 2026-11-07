(()=>{
 const DT=5,END=86400,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function simulate(p={},plan='detain'){
  p={rain:80,tide:1.5,seaLevel:0,trash:25,silt:40,weather:'rain',ice:50,...p};
  const sampleSeconds=Math.max(DT,Math.round((p.sampleSeconds||60)/DT)*DT),frames=[],observations=[],initialCanal=14000,initialRiver=80000,pondCap=plan==='detain'?20000:2000;
  const initialSnow=p.weather==='rain-on-snow'?10000:0;
  let snow=initialSnow,precipIn=0,lossOut=0,melt=0,snowfall=0,temperature=p.weather==='rain'?25:p.weather==='snow'?-4:-3,iceFactor=p.weather==='rain'?1:1-p.ice/100;
  let road=0,pond=0,canal=initialCanal,river=initialRiver,rainIn=0,seaIn=0,seaOut=0,canalOverflow=0,peakRoad=0;
  let cars=0,deliveries=0,buses=0,generated=0,passed=0,people=0,peopleIn=0,boarded=0,walking=0,cycling=0,running=0,peopleDelay=0,delay=0,maxWaterError=0,maxTrafficError=0;
  let lastBus=-1,completedBus=0,stops=new Map(),rain=0,inlet=0,pipe=0,pump=0,gate=0,depth=0,phase=0,tide=0,peakQueue=0;
  const events=[{t:6*3600,key:'service'},{t:7*3600,key:'morning'},{t:12*3600,key:'midday'},{t:17*3600,key:'evening'},{t:18*3600,key:'rain'},{t:18.5*3600,key:'combined'},{t:19*3600,key:'recovery'},{t:22*3600,key:'night'}];
  const waterError=()=>initialCanal+initialRiver+initialSnow+precipIn+seaIn-seaOut-lossOut-road-pond-canal-river-snow;
  const frame=t=>({t,hour:t/3600,road,pond,canal,river,snow,precipIn,lossOut,melt,snowfall,temperature,iceFactor,depth,canalStage:canal/20000,riverStage:river/80000,tide,rain,inlet,pipe,pump,gate,roadQueue:cars+deliveries+buses,cars,deliveries,buses,people,generated,passed,peopleIn,boarded,walking,cycling,running,rainIn,seaIn,seaOut,canalOverflow,phase,waterError:waterError(),trafficError:generated-passed-cars-deliveries-buses});
  frames.push(frame(0));
  for(let t=DT;t<=END;t+=DT){const h=t/3600,active=h>=6&&h<22,rush=h>=7&&h<9||h>=17&&h<19;
   rain=h>=18&&h<19?p.rain:0;tide=.45+p.seaLevel+p.tide*Math.exp(-(((h-18.5)/2.3)**2));phase=t%150;
   snowfall=0;melt=0;temperature=25;iceFactor=1;
   if(p.weather!=='rain'){
    temperature=p.weather==='snow'?(h>=9&&h<22?8:-4):(h>=12&&h<22?6:-3);
    if(p.weather==='snow'){rain=0;snowfall=h>=2&&h<5?p.rain:0;}
    snow+=snowfall/1000/3600*500000*DT;
    const melted=Math.min(snow,Math.max(0,temperature)*3/24/1000/3600*500000*DT);snow-=melted;melt=melted/500000*1000*3600/DT;
    iceFactor=1-p.ice/100*clamp((18-h)/9,0,1);
   }
   const grossRain=rain/1000/3600*500000*DT,grossMelt=melt/1000/3600*500000*DT,runoff=(grossRain+grossMelt)*.8;
   precipIn+=grossRain+snowfall/1000/3600*500000*DT;lossOut+=(grossRain+grossMelt)*.2;road+=runoff;rainIn+=runoff;
   depth=road/60000;
   inlet=Math.min(road/DT,7*(1-p.trash/100)*iceFactor*Math.sqrt(Math.max(0,depth)/.05),Math.max(0,pondCap-pond)/DT);inlet=Math.max(0,inlet);road-=inlet*DT;pond+=inlet*DT;
   const canalStage=canal/20000,riverStage=river/80000;
   const releaseAllowed=plan!=='detain'||rain+melt>0&&pond>pondCap*.85||rain+melt===0&&canalStage<.85&&riverStage<1.35;
   pipe=releaseAllowed?Math.min(pond/DT,3*(1-p.silt/100)*Math.sqrt(Math.max(0,1.25+pond/20000-canalStage))):0;pond-=pipe*DT;canal+=pipe*DT;
   pump=Math.min(Math.max(0,canal-6000)/DT,(plan==='pump'?8:4)*clamp(1-Math.max(0,riverStage-canalStage)/3,0,1));canal-=pump*DT;river+=pump*DT;
   gate=Math.min(Math.max(0,canal-6000)/DT,2*Math.sqrt(Math.max(0,canalStage-riverStage)));canal-=gate*DT;river+=gate*DT;
   const overflow=Math.min(Math.max(0,canal-24000),2*DT);canal-=overflow;road+=overflow;canalOverflow+=overflow;
   const exchange=clamp((river/80000-tide)*4,-4,4)*DT;
   if(exchange>=0){const amount=Math.min(river,exchange);river-=amount;seaOut+=amount;}else{river-=exchange;seaIn-=exchange;}
   depth=road/60000;peakRoad=Math.max(peakRoad,depth);
   const carRate=(rush?1800:active?650:70)/3600,deliveryRate=(h>=9&&h<16?120:active?25:5)/3600;
   cars+=carRate*DT;deliveries+=deliveryRate*DT;generated+=(carRate+deliveryRate)*DT;
   const busSlot=active?Math.floor((t-6*3600)/420):-1;if(active&&busSlot!==lastBus){buses+=2.5;generated+=2.5;lastBus=busSlot;}
   const pedestrianRate=(rush?.075:active?.025:.001),newPeople=pedestrianRate*DT;people+=newPeople;peopleIn+=newPeople;
   walking+=(rush?.08:active?.03:.002)*DT;cycling+=(rush?.035:active?.015:.001)*DT;running+=(h>=5&&h<7||h>=19&&h<21?.025:.001)*DT;
   const capacity=depth>=.17?0:Math.max(0,1-(depth/.17)**1.5),service=p.freeFlow&&depth<.17?cars+deliveries+buses:(t-DT/2)%150<75?4400/3600*(rain+melt>0?.9:1)*capacity*DT:0;
   let budget=service;const busPass=Math.min(buses,p.busPriority===false?budget*buses/Math.max(1e-9,cars+deliveries+buses):budget);buses-=busPass;budget-=busPass;passed+=busPass;completedBus+=busPass;
   while(completedBus>=2.5-1e-8){completedBus-=2.5;const time=t+60;if(!stops.has(time))stops.set(time,0);stops.set(time,stops.get(time)+1);}
   const deliveryPass=p.freeFlow&&depth<.17?deliveries:Math.min(deliveries,budget*.25);deliveries-=deliveryPass;budget-=deliveryPass;passed+=deliveryPass;const carPass=Math.min(cars,budget);cars-=carPass;passed+=carPass;
   if(stops.has(t)){const board=depth<.12?Math.min(people,40*stops.get(t)):0;people-=board;boarded+=board;stops.delete(t);}
   peakQueue=Math.max(peakQueue,cars+deliveries+buses);delay+=(cars+deliveries+buses)*DT/3600;peopleDelay+=people*DT/3600;
   maxWaterError=Math.max(maxWaterError,Math.abs(waterError()));maxTrafficError=Math.max(maxTrafficError,Math.abs(generated-passed-cars-deliveries-buses));
   observations.push({t,roadQueue:cars+deliveries+buses,depth,pond});
   if(t%sampleSeconds===0)frames.push(frame(t));
  }
  return {frames,observations,sampleSeconds,events,plan,pondCap,stats:{peakRoad,peakQueue,delay,peopleDelay,rainIn,precipIn,lossOut,initialSnow,snowRemaining:snow,canalOverflow,generated,passed,remaining:cars+deliveries+buses,peopleIn,boarded,peopleRemaining:people,maxWaterError,maxTrafficError}};
 }
 globalThis.DayModel={simulate,DT,END};
})();
