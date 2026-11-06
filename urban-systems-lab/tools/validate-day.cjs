const fs=require('fs'),path=require('path'),assert=require('assert/strict'),base=path.resolve(__dirname,'..');require(base+'/src/day-model.js');
for(const rain of [0,80,150])for(const tide of [0,2])for(const plan of ['base','detain','pump']){
 const r=DayModel.simulate({rain,tide,trash:rain===150?100:25,silt:40},plan);assert.equal(r.frames.length,1441);assert(r.stats.maxWaterError<1e-5&&r.stats.maxTrafficError<1e-5);
 assert(Math.abs(r.stats.rainIn-rain/1000*500000*.8)<1e-5);assert(r.stats.generated>17000);
 for(const f of r.frames){assert([f.road,f.pond,f.canal,f.river,f.roadQueue,f.people].every(v=>Number.isFinite(v)&&v>=-1e-7));assert(f.pond<=r.pondCap+1e-6);assert(Math.abs(f.peopleIn-f.boarded-f.people)<1e-6);assert(Math.abs(f.waterError)<1e-5);}
 if(rain===0)assert.equal(r.stats.peakRoad,0);
}
require(base+'/src/day-playback.js');const dom=require('./validate.cjs');document.body=new dom.Element('body');document.querySelectorAll=()=>[];document.querySelector=()=>null;global.location={origin:'null'};window.parent=window;
const normalSea=DayModel.simulate(),raisedSea=DayModel.simulate({seaLevel:.7});assert(raisedSea.stats.maxWaterError<1e-5);assert(Math.abs(raisedSea.frames[720].tide-normalSea.frames[720].tide-.7)<1e-10);assert(raisedSea.frames[720].river>normalSea.frames[720].river);
const html=fs.readFileSync(base+'/day-3d.html','utf8'),script=fs.readFileSync(base+'/src/day-scene.js','utf8');
for(const weather of ['snow','rain-on-snow'])for(const plan of ['base','detain','pump'])for(const ice of [0,100]){
 const r=DayModel.simulate({weather,rain:weather==='snow'?8:40,ice},plan);assert(r.stats.maxWaterError<1e-5);assert(r.stats.maxTrafficError<1e-5);
 for(const f of r.frames){assert(f.snow>=-1e-6);assert(f.iceFactor>=0&&f.iceFactor<=1);assert(Math.abs(f.waterError)<1e-5);}
 const at=h=>r.frames[h*60];if(weather==='snow'){assert.equal(at(5).rainIn,0);assert(at(5).snow>11000);assert(at(15).snow<at(5).snow);assert(Math.abs(r.stats.precipIn-12000)<1e-5);}
 else{assert.equal(r.stats.initialSnow,10000);assert(r.stats.snowRemaining<10000);assert(Math.abs(r.stats.precipIn-20000)<1e-5);}
}
for(const lang of ['th','en']){
 document.documentElement.lang=lang;const root=new dom.Element('main');root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');dom.setViewport(736);
 new Function(fs.readFileSync(base+'/src/drainage-reference.js','utf8'))();
 dom.elements.get('dr-city').value='sg';dom.elements.get('dr-city').fire('input');assert(dom.elements.get('dr-annual').innerHTML.includes('2833.5'));
 dom.elements.get('dr-coef').value='0';dom.elements.get('dr-coef').fire('input');assert(!dom.elements.get('dr-annual').innerHTML.includes('NaN'));dom.elements.get('dr-coef').value='.8';
 const viewButtons=dom.elements.get('dr-views').children;viewButtons[2].fire('click');assert.equal(dom.elements.get('dr-cutaway').getAttribute('viewBox'),'580 40 420 220');
 new Function(script.replace(/\}\)\(\);\s*$/,'globalThis.DQA={state,get runs(){return runs;},render,resize,current};})();'))();
 function image(name){const src=dom.elements.get('day-scene').surface,c=dom.createCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.fillStyle=dom.colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
 image('day-3d-'+lang);DQA.state.t=18.5*3600;DQA.state.scale='detail';DQA.render();image('day-3d-rain-'+lang);
 dom.elements.get('day-weather').value='snow';dom.elements.get('day-weather').fire('change');DQA.state.t=3*3600;DQA.render();image('day-3d-snow-'+lang);assert.equal(DQA.current().rain,0);assert(DQA.current().snowfall>0);
 dom.elements.get('day-weather').value='rain';dom.elements.get('day-weather').fire('change');
 dom.setViewport(320);DQA.resize();image('day-3d-mobile-'+lang);dom.elements.get('day-yaw').value=85;dom.elements.get('day-yaw').fire('input');DQA.render();image('day-3d-rotated-'+lang);
 dom.elements.get('day-auto').checked=false;dom.elements.get('day-auto').fire('change');dom.elements.get('day-scale').value='day';dom.elements.get('day-scale').fire('change');dom.elements.get('day-play').fire('click');assert.equal(DQA.state.t,0);let ts=0;for(let i=0;i<122;i++){const callback=dom.rafs.get([...dom.rafs.keys()].at(-1));callback(ts);ts+=200;}assert.equal(DQA.state.t,86400);assert.equal(dom.elements.get('day-clock').textContent,'24:00');
 assert.equal(dom.elements.get('day-play').textContent,lang==='en'?'Play':'เล่น');
}
console.log('PASS: 18 rain + 12 winter daily balances, snow accumulation/melt, existing snow, inlet ice, bilingual detail/annual controls, 24-hour completion with auto-slow disabled, and offline Thai/English scene rendering at 736/320px.');
