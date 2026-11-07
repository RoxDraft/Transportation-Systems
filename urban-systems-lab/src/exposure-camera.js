(()=>{
 const targets=[0,2,3],presets={0:'stop',1:'street',2:'north',3:'south'};
 function scores(frame,{dust=.5,heat=600,mode='both'}={}){return targets.map(point=>({point,dust:(frame.dose[point]||0)/Math.max(.001,dust),heat:(frame.heatDose[point]||0)/Math.max(1,heat)})).map(v=>({...v,score:mode==='dust'?v.dust:mode==='heat'?v.heat:Math.max(v.dust,v.heat)}));}
 function create({holdSeconds=8,challengerRatio=1.3}={}){let focus=null,source=null,lastTime=null,changedAt=-Infinity;
  function reset(){focus=null;source=null;lastTime=null;changedAt=-Infinity;}
  function update({frame,run,wall=0,seek=false,enabled=true,thresholds={}}){if(!enabled){reset();return {focus:null,action:'none',scores:[]};}const before=focus,rebuild=seek||source!==run||lastTime===null||frame.t<lastTime,ranked=scores(frame,thresholds).sort((a,b)=>b.score-a.score||targets.indexOf(a.point)-targets.indexOf(b.point)),highest=ranked[0],desired=highest?.score>=1?highest.point:null;
   if(rebuild||focus===null)focus=desired;else if(desired!==focus&&wall-changedAt>=holdSeconds){const current=ranked.find(s=>s.point===focus);if(desired===null||highest.score>current.score*challengerRatio)focus=desired;}
   if(focus!==before||rebuild)changedAt=wall;source=run;lastTime=frame.t;return {focus,scores:ranked,action:before===focus&&!rebuild?'none':focus===null?'overview':'focus'};
  }
  return {update,reset};
 }
 globalThis.ExposureCamera={create,scores,targets,presets};
})();
