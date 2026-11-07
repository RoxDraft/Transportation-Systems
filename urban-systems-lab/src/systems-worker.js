importScripts('./day-model.js?v=0.9.0','./heat-model.js?v=1.3.0','./atmosphere-model.js?v=1.4.1');
self.onmessage=event=>{
 const {id,input}=event.data;
 try{
  const p=AtmosphereModel.params(input),day=DayModel.simulate({...p,sampleSeconds:30},p.hydro),context=[];
  for(let t=0;t<=AtmosphereModel.duration(p);t+=30){const absolute=p.timeline==='day'?t:p.hour*3600+t,i=Math.min(day.frames.length-1,Math.floor(absolute/30));context.push({...day.frames[i],pondCap:day.pondCap});}
  self.postMessage({id,...AtmosphereModel.compare(p,context,(plan,completed)=>self.postMessage({id,progress:{plan,completed,total:new Set([...AtmosphereModel.comparisonPlans,p.plan]).size}}))});
 }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
