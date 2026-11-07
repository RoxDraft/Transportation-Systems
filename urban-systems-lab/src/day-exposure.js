(()=>{
 const DT=5,NX=30,NY=20,DX=40,idx=(x,y)=>y*NX+x;
 function transport(run,p={},mode='base'){
  if(run.sampleSeconds!==DT)throw Error('Exposure requires 5-second mobility frames');
  const env=HeatModel.environment(p,mode==='bus-signal'?'combined':mode),u=Array.from({length:NY},(_,y)=>env.field(0,y)[0]),v=env.field(0,0)[1];
  let c=new Float64Array(NX*NY),emitted=0,exited=0,maxError=0;const frames=[{t:0,stop:0,walk:0,r1:0,r2:0,edge:0,exited:0,emitted:0}],edgeDose=new Float64Array(NX*NY),edgeCells=[];
  for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(x<2||x>=NX-2||y<2||y>=NY-2)edgeCells.push(idx(x,y));
  let r1dose=0,r2dose=0,r1peak=0,r2peak=0,edgePeak=0;
  for(let k=1;k<run.frames.length;k++){
   const f=run.frames[k],prev=run.frames[k-1],arrivals=(f.generated-prev.generated)/DT,queue=(prev.roadQueue+f.roadQueue)/2;
   const source=.02*(.3+arrivals+queue/150)*(1-env.cut),next=c.slice();
   for(let x=1;x<NX-1;x++){next[idx(x,10)]+=source*DT;emitted+=source*DT;}
   const move=(i,j,vel)=>{const a=i<0?0:c[i],b=j<0?0:c[j],q=(vel*(vel>=0?a:b)+2*(a-b)/DX)*DT/DX;if(i>=0)next[i]-=q;else exited-=q;if(j>=0)next[j]+=q;else exited+=q;};
   for(let y=0;y<NY;y++)for(let x=0;x<=NX;x++)move(x===0?-1:idx(x-1,y),x===NX?-1:idx(x,y),u[y]);
   for(let y=0;y<=NY;y++)for(let x=0;x<NX;x++)move(y===0?-1:idx(x,y-1),y===NY?-1:idx(x,y),v);
   c=next;let walk=0;for(let x=4;x<=25;x++)walk+=c[idx(x,12)]/22;
   let edge=0;for(const i of edgeCells){edgeDose[i]+=c[i]*DT/3600;edge=Math.max(edge,c[i]);}edgePeak=Math.max(edgePeak,edge);
   const r1=c[idx(15,3)],r2=c[idx(15,17)];r1dose+=r1*DT/3600;r2dose+=r2*DT/3600;r1peak=Math.max(r1peak,r1);r2peak=Math.max(r2peak,r2);
   if(k%12===0)maxError=Math.max(maxError,Math.abs(emitted-exited-c.reduce((s,a)=>s+a,0)));
   frames.push({t:f.t,stop:c[idx(19,12)],walk,r1,r2,edge,exited,emitted});
  }
  return {frames,stats:{r1dose,r2dose,r1peak,r2peak,edgePeak,edgeDose:Math.max(...edgeDose),emitted,exited,remaining:c.reduce((s,a)=>s+a,0),maxError}};
 }
 function analyze(run,profile,p={},mode='base',climate='humid'){
  let stopHeat=0,stopDust=0,walkHeat=0,walkDust=0,waitHours=0,walkHours=0,dayWaitHours=0;const frames=[{t:0,stopHeat:0,stopDust:0,walkHeat:0,walkDust:0,waitHours:0,walkHours:0,dayWaitHours:0,queue:0,waiting:0,air:0,stopLoad:0}],environments=new Map();
  for(let k=1;k<run.frames.length;k++){
   const f=run.frames[k],prev=run.frames[k-1],h=(f.t-DT/2)/3600,minute=Math.floor(h*60);
   if(!environments.has(minute)){const sun=Math.max(0,Math.sin(Math.PI*(h-6)/12)),air=(climate==='humid'?35:39)-6+6*Math.max(0,Math.sin(Math.PI*(h-6)/14));environments.set(minute,HeatModel.environment({...p,climate,air,rh:climate==='humid'?.75:.3,sun:f.rain>0?sun*.3:sun},mode==='bus-signal'?'combined':mode));}
   const env=environments.get(minute),stop=env.thermal(19,12,true);let walkLoad=0;for(const x of [5,12,19,25])walkLoad+=env.thermal(x,12).load/4;
   const waiting=(prev.people+f.people)/2,old=run.frames[Math.max(0,k-144)],oldPrev=run.frames[Math.max(0,k-145)],walkers=((f.walking-old.walking)+(prev.walking-oldPrev.walking))/2;
   const q=profile.frames[k],qp=profile.frames[k-1],dh=DT/3600;waitHours+=waiting*dh;if(h>=6&&h<18)dayWaitHours+=waiting*dh;walkHours+=walkers*dh;
   stopHeat+=waiting*stop.load*dh;stopDust+=waiting*(qp.stop+q.stop)/2*dh;walkHeat+=walkers*walkLoad*dh;walkDust+=walkers*(qp.walk+q.walk)/2*dh;
   frames.push({t:f.t,stopHeat,stopDust,walkHeat,walkDust,waitHours,walkHours,dayWaitHours,queue:f.roadQueue,waiting:f.people,air:stop.air,stopLoad:stop.load,stopC:q.stop,walkC:q.walk});
  }
  return {mobility:run,frames,climate,mode,profile,stats:{stopHeat,stopDust,walkHeat,walkDust,waitHours,walkHours,dayWaitHours,peopleIn:run.stats.peopleIn,boarded:run.stats.boarded,remaining:run.stats.peopleRemaining,observedMeanWait:waitHours*60/run.stats.peopleIn}};
 }
 function guard(a,b){const x=a.profile.stats,y=b.profile.stats;return ['r1dose','r2dose','r1peak','r2peak','edgePeak','edgeDose','exited'].every(k=>x[k]<=y[k]+Math.max(1e-12,Math.abs(y[k])*1e-9));}
 function build(run,reference,p={}){const rows=[],freeProfiles={};
  const signalRun=DayModel.simulate({...run.params,busSignal:true,sampleSeconds:5},run.plan);
  for(const mode of ['base','combined','bus-signal']){const m=mode==='bus-signal'?'combined':mode,active=mode==='bus-signal'?signalRun:run,q=transport(active,p,m),free=freeProfiles[m]||(freeProfiles[m]=transport(reference,p,m));for(const climate of ['humid','dry']){const r=analyze(active,q,p,mode,climate);r.reference=analyze(reference,free,p,mode,climate);rows.push(r);}}return rows;}
 globalThis.DayExposure={transport,analyze,guard,build};
})();
