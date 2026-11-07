(()=>{
 const NX=18,NY=12,NZ=5,N=NX*NY*NZ,DX=40,DZ=10,DT=2,DURATION=1200,origins=['exhaust','wear','construction','burning','industry','regional'];
 const index=(x,y,z)=>z*NX*NY+y*NX+x,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const seasons={sw:{wind:2.5,direction:315,air:33,rh:.8,rain:80},ne:{wind:2,direction:135,air:29,rh:.55,rain:0},hot:{wind:.8,direction:0,air:39,rh:.3,rain:0},humid:{wind:1.5,direction:0,air:35,rh:.75,rain:0},calm:{wind:0,direction:0,air:36,rh:.7,rain:0},breeze:{wind:2,direction:270,air:32,rh:.8,rain:0}};
 const comparisonPlans=['base','shade-only','vent-only','source-only','protected','combined'];
 function design(plan){return {shade:['shade-only','protected','shade','combined'].includes(plan),corridor:['vent-only','shade','combined'].includes(plan),water:['canal','pond','combined'].includes(plan),cut:['source-only','protected','combined'].includes(plan)};}
 function params(input={}){const p={...seasons.humid,season:'humid',hour:14,profile:'street',plan:'base',sourceCut:50,hydro:'detain',tide:1.5,trash:25,silt:40,sources:Object.fromEntries(origins.map(k=>[k,true])),...input};p.sources={...Object.fromEntries(origins.map(k=>[k,true])),...input.sources};for(const [k,a,b]of [['wind',0,4],['direction',0,359],['air',20,43],['rh',.15,.95],['rain',0,150],['hour',0,23.5],['sourceCut',0,90],['tide',0,2],['trash',0,100],['silt',0,90]])p[k]=clamp(Number.isFinite(+p[k])?+p[k]:0,a,b);if(![...comparisonPlans,'shade','canal','pond'].includes(p.plan))p.plan='base';return p;}
 function velocity(input,x,y,z){const p=input,angle=p.direction*Math.PI/180,corridor=design(p.plan).corridor,canyon=['dense','canyon'].includes(p.profile),band=Math.exp(-(((y-6)/1.8)**2)),shield=canyon?.62:1,shear=.65+.22*z,boost=corridor?1+.45*band:1;
  const u=p.wind*Math.cos(angle)*shear*boost*shield,v=p.wind*Math.sin(angle)*shear*shield,sun=Math.max(0,Math.sin(Math.PI*((p.hour||0)-6)/12)),w=.12*sun*Math.exp(-(((x-9)/4)**2)-((y-6)/3)**2)*(1-z/(NZ-.5));return [u,v,Math.max(0,w)];}
 function sampleContext(context,t){if(!context?.length)return {roadQueue:0,depth:0,people:0,pond:0,rain:0};const i=Math.min(context.length-1,Math.floor(t/30)),a=context[i],b=context[Math.min(i+1,context.length-1)],k=clamp((t-i*30)/30,0,1),r={...a};for(const key in a)if(typeof a[key]==='number')r[key]=a[key]+(b[key]-a[key])*k;return r;}
 function simulate(input={},context=[]){
  const p=params(input),features=design(p.plan),cut=features.cut?1-p.sourceCut/100:1,weather={...p,sun:Math.max(0,Math.sin(Math.PI*(p.hour-6)/12))},field=(x,y)=>velocity(p,x/29*17,y/19*11,0).slice(0,2),env=globalThis.HeatModel?.environment(weather,p.plan,{...features,field}),neighborEnv=globalThis.HeatModel?.environment(weather,p.plan,{...features,shade:false,field}),frames=[],sourceStats=origins.map(()=>({emitted:0,imported:0,exported:0,deposited:0,remaining:0})),dose=[0,0,0,0],heatDose=[0,0,0,0],sourceDose=origins.map(()=>[0,0,0,0]);
  let fields=origins.map(()=>[new Float64Array(N),new Float64Array(N)]),maxError=0;
  const uvw=Array.from({length:N},(_,i)=>velocity(p,i%NX,Math.floor(i/NX)%NY,Math.floor(i/(NX*NY)))),sum=a=>a.reduce((a,b)=>a+b,0);
  const receptors=[[12,9],[7,9],[9,2],[9,10]],at=(a,x,y)=>a[index(x,y,0)],thermals=receptors.map(([x,y],j)=>(j>=2?neighborEnv:env)?.thermal(x/17*29,y/11*19,j!==1)||{air:p.air,humidity:p.rh,mrt:p.air,wind:p.wind,load:0}),thermal=thermals[0];
  let heatEdge=0;for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(x===0||y===0||x===NX-1||y===NY-1)heatEdge=Math.max(heatEdge,neighborEnv?.thermal(x/17*29,y/11*19,true).load||0);
  function record(t){const fine=new Float32Array(N),coarse=new Float32Array(N),bySource=[];for(let s=0;s<origins.length;s++){const [a,b]=fields[s];sourceStats[s].remaining=sum(a)+sum(b);for(let i=0;i<N;i++){fine[i]+=a[i];coarse[i]+=b[i];}bySource.push({...sourceStats[s],stop:at(a,12,9)+at(b,12,9),at:receptors.map(([x,y])=>at(a,x,y)+at(b,x,y)),dose:[...sourceDose[s]]});}let edge=0;for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(x===0||x===NX-1||y===0||y===NY-1)edge=Math.max(edge,at(fine,x,y)+at(coarse,x,y));const totals={};for(const k of ['emitted','imported','exported','deposited','remaining'])totals[k]=sourceStats.reduce((a,s)=>a+s[k],0);totals.error=totals.emitted+totals.imported-totals.exported-totals.deposited-totals.remaining;maxError=Math.max(maxError,Math.abs(totals.error));frames.push({t,fine,coarse,bySource,totals,dose:[...dose],heatDose:[...heatDose],thermals,heatEdge,edge,thermal,context:sampleContext(context,t)});}
  record(0);
  for(let t=DT;t<=DURATION;t+=DT){const traffic=sampleContext(context,t),trafficFactor=1+Math.min(2,traffic.roadQueue/200),rain=(p.hour+t/3600>=18&&p.hour+t/3600<19)?p.rain:0;
   for(let s=0;s<origins.length;s++)for(let size=0;size<2;size++){
    const c=fields[s][size],next=c.slice(),stat=sourceStats[s],fine=size===0,origin=origins[s],enabled=!!p.sources[origin],external=enabled&&origin==='regional'&&fine?.012:0;
    function emit(x,y,z,q){if(!enabled)return;const mass=q*DT*cut;next[index(x,y,z)]+=mass;stat.emitted+=mass;}
    if(origin==='exhaust'&&fine)for(let x=2;x<NX-2;x++)emit(x,6,0,.004*trafficFactor);
    if(origin==='wear')for(let x=2;x<NX-2;x++)emit(x,6,0,(fine?.001:.003)*trafficFactor);
    if(origin==='construction')emit(6,4,0,fine?.02:.08);
    if(origin==='burning')emit(2,10,1,fine?.055:.005);
    if(origin==='industry')emit(15,9,3,fine?.04:.01);
    const settle=fine?.0003:.01;
    function horizontal(a,b,vel){const ca=a<0?external:c[a],cb=b<0?external:c[b],flux=(vel*(vel>=0?ca:cb)+2*(ca-cb)/DX)*DT/DX;if(a>=0)next[a]-=flux;if(b>=0)next[b]+=flux;if(a<0){if(flux>=0)stat.imported+=flux;else stat.exported-=flux;}if(b<0){if(flux>=0)stat.exported+=flux;else stat.imported-=flux;}}
    for(let z=0;z<NZ;z++)for(let y=0;y<NY;y++)for(let x=0;x<=NX;x++){const a=x===0?-1:index(x-1,y,z),b=x===NX?-1:index(x,y,z),v=(uvw[a<0?b:a][0]+uvw[b<0?a:b][0])/2;horizontal(a,b,v);}
    for(let z=0;z<NZ;z++)for(let y=0;y<=NY;y++)for(let x=0;x<NX;x++){const a=y===0?-1:index(x,y-1,z),b=y===NY?-1:index(x,y,z),v=(uvw[a<0?b:a][1]+uvw[b<0?a:b][1])/2;horizontal(a,b,v);}
    for(let z=0;z<=NZ;z++)for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const a=z===0?-1:index(x,y,z-1),b=z===NZ?-1:index(x,y,z),ca=a<0?0:c[a],cb=b<0?0:c[b],v=(uvw[a<0?b:a][2]+uvw[b<0?a:b][2])/2-settle,flux=(v*(v>=0?ca:cb)+(a>=0&&b>=0?.15*(ca-cb)/DZ:0))*DT/DZ;if(a>=0)next[a]-=flux;if(b>=0)next[b]+=flux;if(a<0)stat.deposited-=flux;if(b<0)stat.exported+=flux;}
    const wash=(fine?.00015:.0004)*(rain/40)*DT;for(let i=0;i<N;i++){if(next[i]<-1e-9)throw Error('Unstable atmospheric transport');const loss=next[i]*wash;next[i]-=loss;stat.deposited+=loss;}
    fields[s][size]=next;
   }
   for(let j=0;j<receptors.length;j++){const [x,y]=receptors[j];heatDose[j]+=thermals[j].load*DT/60;for(let s=0;s<fields.length;s++){const species=fields[s],d=(at(species[0],x,y)+at(species[1],x,y))*DT/60;dose[j]+=d;sourceDose[s][j]+=d;}}
   if(t%30===0)record(t);
  }
  return {p,frames,maxError,grid:{nx:NX,ny:NY,nz:NZ,dx:DX,dz:DZ},origins,stats:frames.at(-1)};
 }
 function violations(run,baseline,through=1200){const found=new Set();for(let i=0;i<run.frames.length&&run.frames[i].t<=through;i++){const a=run.frames[i],b=baseline.frames[i];for(const j of [2,3]){if(a.dose[j]>b.dose[j]+1e-7)found.add('dust-R'+(j-1));if(a.heatDose[j]>b.heatDose[j]+1e-6)found.add('heat-R'+(j-1));}if(a.edge>b.edge+1e-7)found.add('dust-edge');if(a.heatEdge>b.heatEdge+1e-6)found.add('heat-edge');if(a.totals.exported>b.totals.exported+1e-7)found.add('export');}return [...found];}
 function guard(run,baseline){return violations(run,baseline).length===0;}
 function chooseSafe(variants){const base=variants.base;if(!base)return null;const end=base.stats,targets=[0,2,3],ratio=(a,b)=>b>1e-9?a/b:a>1e-9?Infinity:0;return Object.entries(variants).filter(([key,r])=>key!=='base'&&guard(r,base)&&r.frames.every((f,i)=>f.dose[0]<=base.frames[i].dose[0]+1e-7&&f.heatDose[0]<=base.frames[i].heatDose[0]+1e-6)&&targets.some(j=>r.stats.dose[j]<end.dose[j]-1e-7||r.stats.heatDose[j]<end.heatDose[j]-1e-6)).map(([key,r])=>({key,score:targets.reduce((s,j)=>s+ratio(r.stats.dose[j],end.dose[j])+ratio(r.stats.heatDose[j],end.heatDose[j]),0)})).sort((a,b)=>a.score-b.score||comparisonPlans.indexOf(a.key)-comparisonPlans.indexOf(b.key))[0]?.key||null;}
 function compare(input={},context=[]){const p=params(input),variants={};for(const plan of new Set([...comparisonPlans,p.plan]))variants[plan]=simulate({...p,plan},context);return {base:variants.base,selected:variants[p.plan],variants,neighbor:guard(variants[p.plan],variants.base),recommended:chooseSafe(variants)};}

 globalThis.AtmosphereModel={simulate,params,velocity,seasons,origins,guard,violations,chooseSafe,compare,comparisonPlans,design,sampleContext};
})();
