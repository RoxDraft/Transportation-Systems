(()=>{
 const limits={queue:{on:60,off:45},access:{on:.12,off:.10},storage:{on:.90,off:.80}},REARM=900,HOLD=8;
 const values=(f,cap)=>({queue:f.roadQueue,access:f.depth,storage:f.pond/cap});
 function flags(f,cap){const v=values(f,cap);return Object.keys(limits).filter(key=>v[key]>=limits[key].on);}
 function detect(samples,cap){const events=[],armed={queue:true,access:true,storage:true},clearSince={queue:null,access:null,storage:null};
  for(const sample of samples){const v=values(sample,cap),types=[];for(const key of Object.keys(limits)){
   if(armed[key]&&v[key]>=limits[key].on){armed[key]=false;clearSince[key]=null;types.push(key);}
   else if(!armed[key]){if(v[key]<=limits[key].off){if(clearSince[key]===null)clearSince[key]=sample.t;if(sample.t-clearSince[key]>=REARM){armed[key]=true;clearSince[key]=null;}}else clearSince[key]=null;}
  }if(types.length)events.push({t:sample.t,types});}
  return events;
 }
 function create(events){let cursor=0,focus=null,skipUntil=-1;
  function seek(t){cursor=0;while(cursor<events.length&&events[cursor].t<=t)cursor++;focus=null;skipUntil=-1;}
  function skip(t){seek(t);skipUntil=t+300;}
  function advance(t,dt,end,enabled=true){let entered=false,exited=false;
   if(!enabled)focus=null;
   if(focus&&focus.remaining<=1e-9){focus=null;exited=true;}
   let next=Math.min(end,t+dt*(focus?20:3600));
   while(cursor<events.length&&events[cursor].t<=next+1e-9){const event=events[cursor++];if(event.t<=t+1e-9||event.t<skipUntil||!enabled)continue;
    if(!focus){next=event.t;focus={types:[...event.types],remaining:HOLD};entered=true;break;}
    focus.types=[...new Set([...focus.types,...event.types])];
   }
   if(focus&&!entered)focus.remaining=Math.max(0,focus.remaining-dt);
   return {t:next,focus:focus?{types:[...focus.types],remaining:focus.remaining}:null,entered,exited};
  }
  return {advance,seek,skip,get focus(){return focus;}};
 }
 globalThis.DayPlayback={limits,REARM,HOLD,flags,detect,create};
})();
