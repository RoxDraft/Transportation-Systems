(()=>{
 const NX=30,NY=20,DX=40,DT=1,STEPS=1200,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),es=t=>.6108*Math.exp(17.27*t/(t+237.3));
 const plans=['base','canal','pond','shade','combined'];
 function simulate(p={},plan='base'){
  p={climate:'humid',wind:1.5,direction:0,sun:1,sourceCut:50,wait:20,...p};
  const ta=p.air??(p.climate==='humid'?35:39),rh=p.rh??(p.climate==='humid'?.75:.30),angle=p.direction*Math.PI/180;
  const corridor=plan==='shade'||plan==='combined',shade=corridor,water=['canal','pond','combined'].includes(plan),cut=plan==='combined'?p.sourceCut/100:0;
  const field=(x,y)=>{const corridorWeight=Math.exp(-(((y-10)/2.4)**2));return [p.wind*Math.cos(angle)*(corridor?1+.65*corridorWeight:1),p.wind*Math.sin(angle)];};
  const windU=Array.from({length:NY},(_,y)=>field(0,y)[0]),windV=field(0,0)[1];
  let c=new Float64Array(NX*NY),exited=0,emitted=0,maxError=0;const dose=new Float64Array(NX*NY);
  for(let t=0;t<STEPS;t++){
   const next=c.slice();for(let x=1;x<NX-1;x++){const i=10*NX+x,q=.02*(1-cut);next[i]+=q;emitted+=q;}
   const move=(i,j,vel)=>{const a=i<0?0:c[i],b=j<0?0:c[j],flux=(vel*(vel>=0?a:b)+2*(a-b)/DX)*DT/DX;
    if(i>=0)next[i]-=flux;if(j>=0)next[j]+=flux;if(i<0)exited-=flux;if(j<0)exited+=flux;};
   for(let y=0;y<NY;y++)for(let x=0;x<=NX;x++)move(x===0?-1:y*NX+x-1,x===NX?-1:y*NX+x,windU[y]);
   for(let y=0;y<=NY;y++)for(let x=0;x<NX;x++)move(y===0?-1:(y-1)*NX+x,y===NY?-1:y*NX+x,windV);
   c=next;for(let i=0;i<c.length;i++){if(c[i]<-1e-9)throw Error('Unstable transport');dose[i]+=c[i]*DT;}
   if(t%60===0)maxError=Math.max(maxError,Math.abs(emitted-exited-c.reduce((a,b)=>a+b,0)));
  }
  const at=(a,x,y)=>a[clamp(Math.round(y),0,NY-1)*NX+clamp(Math.round(x),0,NX-1)];
  function thermal(x,y,stop=false){const f=field(x,y),speed=Math.hypot(...f),fetch=plan==='pond'?Math.hypot(x-8,y-7):Math.abs(y-7),downwind=plan==='pond'?Math.max(0,(x-8)*Math.cos(angle)+(y-7)*Math.sin(angle)):Math.max(0,(y-7)*Math.sin(angle));
   const cool=water?Math.min(3,(ta-15)*(1-rh)*.16)*Math.exp(-fetch/7)*(downwind>0?1:.35)*Math.min(1,p.wind):0;
   const air=ta-cool,w0=.622*(es(ta)*rh)/(101.3-es(ta)*rh),w=w0+1.006*cool/2501,vp=101.3*w/(.622+w),humidity=clamp(vp/es(air),0,1);
   const coverage=shade?(stop?.9:.75):.08,mrt=air+20*p.sun*(1-coverage),hc=8.3*Math.max(.1,speed)**.6,dry=6*(mrt-35)+hc*(air-35),evap=Math.max(0,Math.min(180, .55*16.5*hc*(es(35)-vp)));
   return {air,humidity,mrt,wind:speed,dry,evap,load:Math.max(0,(stop?65:120)+dry-evap),cool};
  }
  let walkDose=0,walkLoad=0;for(let x=4;x<=25;x++){walkDose+=at(dose,x,12)/STEPS*12/22;walkLoad+=thermal(x,12).load/22;}
  const stop=thermal(19,12,true),stopDose=at(dose,19,12)/STEPS*p.wait;
  const r1=at(dose,15,3)/STEPS,r2=at(dose,15,17)/STEPS;
  let perimeter=0;for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(x<=1||x>=NX-2||y<=1||y>=NY-2)perimeter=Math.max(perimeter,at(dose,x,y)/STEPS);
  return {plan,p,ta,rh,field,c,dose,thermal,walkDose,stopDose,walkLoad,stopLoad:stop.load,r1,r2,perimeter,exited,emitted,remaining:c.reduce((a,b)=>a+b,0),maxError};
 }
 const guard=(r,b)=>r.r1<=b.r1+1e-7&&r.r2<=b.r2+1e-7&&r.perimeter<=b.perimeter+1e-7&&r.exited<=b.exited+1e-7;
 globalThis.HeatModel={simulate,plans,guard,NX,NY,DX,STEPS};
})();
