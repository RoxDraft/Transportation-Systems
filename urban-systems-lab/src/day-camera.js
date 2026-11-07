(()=>{
 const limits={queue:{on:60,off:45},access:{on:.12,off:.10},storage:{on:.9,off:.8}},priority=['access','storage','queue'];
 function create({clearSeconds=120,minHoldSeconds=4}={}){
  let focus=null,lastTime=null,cursor=0,changedAt=-Infinity,source=null,latched={},clearSince={};
  function reset(){focus=null;lastTime=null;cursor=0;changedAt=-Infinity;source=null;latched={};clearSince={};}
  function observe(f,cap){const values={queue:f.roadQueue,access:f.depth,storage:f.pond/cap};for(const key of priority){const v=values[key];if(!Number.isFinite(v))continue;if(v>=limits[key].on){latched[key]=true;clearSince[key]=null;}else if(latched[key]){if(v<=limits[key].off){if(clearSince[key]==null)clearSince[key]=f.t;if(f.t-clearSince[key]>=clearSeconds){latched[key]=false;clearSince[key]=null;}}else clearSince[key]=null;}}}
  function update({t,frame,pondCap,samples=[],seek=false,enabled=true,wall=0}){
   if(!enabled){reset();return {focus:null,active:[],action:'none',recovering:false};}
   const before=focus,rebuild=seek||source!==samples||lastTime===null||t<lastTime;
   if(rebuild){latched={};clearSince={};cursor=0;source=samples;}
   while(cursor<samples.length&&samples[cursor].t<=t+1e-7){observe(samples[cursor++],pondCap);}
   observe({...frame,t},pondCap);const active=priority.filter(k=>latched[k]),desired=active[0]||null;
   let next=focus;if(rebuild)next=desired;else if(focus&&latched[focus]){if(desired&&priority.indexOf(desired)<priority.indexOf(focus))next=desired;}else if(!focus||wall-changedAt>=minHoldSeconds)next=desired;
   focus=next;lastTime=t;if(before!==focus)changedAt=wall;
   return {focus,active,action:before===focus?'none':focus?'focus':'overview',recovering:!!focus&&(!latched[focus]||clearSince[focus]!=null),clearSince:focus?clearSince[focus]??null:null};
  }
  return {update,reset};
 }
 globalThis.DayCamera={create,limits,priority};
})();
