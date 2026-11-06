const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const base=path.resolve(__dirname,'..');require(base+'/src/downstream-model.js');const E=DownstreamEngine;
const p0={rain:80,tide:1.5,trash:25,silt:40};
const scenarios=[p0,{...p0,rain:0},{...p0,trash:100},{...p0,silt:100},{...p0,rain:150,tide:2,trash:0,silt:0},{...p0,rain:150,tide:2,trash:90,silt:90},{...p0,rain:30,tide:0},{...p0,rain:0,tide:2}];
for(const p of scenarios)for(const mode of E.modes){const r=E.simulate(p,mode),c=r.config;assert(r.stats.maxError<1e-5,'Mass conservation');
 for(const f of r.frames){
  assert(Math.abs(f.error)<1e-5,'Frame ledger');
  for(const x of [...f.road,...f.canal,f.receiver,f.up,f.well,f.storage,...f.localQ,...f.outQ,...f.relayQ])assert(Number.isFinite(x)&&x>=-1e-7,'Finite/nonnegative');
  assert(f.up<=20000+1e-6&&f.well<=3000+1e-6&&f.storage<=c.storageCap+1e-6,'Storage bounds');
  assert(f.stages.every(x=>x<=.8+1e-7),'Canal bank bounds');
  assert(f.relayQ[0]<=8*c.relay+1e-7&&f.relayQ[1]<=6*c.relay+1e-7,'Relay capacities');
  assert(f.outQ[0]<=10*c.outlet+1e-7&&f.outQ[1]<=8*c.outlet+1e-7,'Terminal capacities');
  if(f.t<=3600)assert.equal(f.release,0,'No hidden pre-release');
  if(mode==='clock'&&f.t<14400)assert.equal(f.release,0,'Clock policy');
 }
 if(p.rain===0&&p.tide===1.5)assert(r.stats.peakCm.every(x=>x===0),'Phantom rain flood');
 if(p.rain===0&&p.tide===2)assert(r.stats.peakCm[5]>0,'Missing tidal backflow');
}
const control=E.simulate(p0,'base').stats,adaptive=E.simulate(p0,'adaptive').stats;
assert(adaptive.peakCm[0]<control.peakCm[0]);for(let i=1;i<6;i++){assert(adaptive.peakCm[i]<=control.peakCm[i]+.1);assert(adaptive.floodMinutes[i]<=control.floodMinutes[i]+1);}
assert(E.simulate(p0,'outlet').stats.peakCm[5]>control.peakCm[5],'Receiving risk disappeared');
const {createCanvas}=require(process.env.URBAN_CANVAS_MODULE||'@napi-rs/canvas');
vm.runInThisContext(fs.readFileSync(base+'/vendor/d3-7.9.0.min.js','utf8'));
class Selection{constructor(items=[{}]){this.items=items;}append(){return new Selection(this.items);}selectAll(){return this;}remove(){return this;}data(v){this.items=v;return this;}join(){return this;}on(){return this;}attr(k,v){if(typeof v==='function')for(const d of this.items){const value=v(d);if(k==='d')assert(!/NaN|Infinity/.test(value));}return this;}text(v){if(typeof v==='function')this.items.forEach(v);return this;}}
global.d3={...d3,select:()=>new Selection()};
let viewport=736,nextRaf=1;const rafs=new Map(),elements=new Map(),all=[];
class Element{
 constructor(tag='div',attrs={}){this.tagName=tag;this.attrs=attrs;this.style={};this.dataset={};this.children=[];this.listeners={};this.hidden=false;this.value=attrs.value||'';this.textContent='';this.classList={add(){},remove(){},toggle(){}};this._html='';this.ids=[];if(attrs.id)elements.set(attrs.id,this);for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;if(tag==='canvas')this.surface=createCanvas(736,500);all.push(this);}
 set innerHTML(text){for(const id of this.ids)elements.delete(id);this._html=text;this.ids=[];for(const m of text.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){const attrs={};for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];const e=new Element(m[1].toLowerCase(),attrs);if(attrs.id)this.ids.push(attrs.id);}
  for(const m of text.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){const options=[...m[2].matchAll(/<option\b([^>]*)>/g)],chosen=options.find(x=>/\bselected\b/.test(x[1]))||options[0];const value=chosen?.[1].match(/value="([^"]*)"/);if(value&&elements.has(m[1]))elements.get(m[1]).value=value[1];}
 }
 get innerHTML(){return this._html;}get width(){return this.surface?.width||736;}set width(v){if(this.surface)this.surface.width=Math.max(1,v);}get height(){return this.surface?.height||500;}set height(v){if(this.surface)this.surface.height=Math.max(1,v);}
 getContext(){return this.surface.getContext('2d');}querySelector(q){if(q.startsWith('#')){assert(elements.has(q.slice(1)),'Missing '+q);return elements.get(q.slice(1));}return this.querySelectorAll(q)[0];}
 querySelectorAll(q){if(q==='[data-risk]')return all.filter(e=>e.dataset.risk&&this._html.includes('data-risk="'+e.dataset.risk+'"'));return [];}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}append(...v){this.children.push(...v);}appendChild(e){this.append(e);return e;}replaceChildren(...v){this.children=v;}remove(){}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}removeEventListener(k,f){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==f);}fire(k,event={}){for(const f of [...this.listeners[k]||[]])f(event);}getBoundingClientRect(){return {width:viewport,height:viewport*.66,left:0,top:0};}
}
const root=new Element('div',{id:'urban-lab'}),english=process.env.URBAN_LANGUAGE==='en',html=fs.readFileSync(base+(english?'/index.en.html':'/urban-systems.html'),'utf8');root.innerHTML=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');elements.set('urban-lab',root);
global.document={documentElement:new Element(),hidden:false,getElementById:id=>{assert(elements.has(id),'Missing root '+id);return elements.get(id);},createElement:tag=>new Element(tag),addEventListener(){},removeEventListener(){}};
let saved;
global.window={devicePixelRatio:1,d3,matchMedia:()=>({matches:true}),openai:{setWidgetState:s=>{saved=s;return Promise.resolve();}},addEventListener(){},removeEventListener(){}};
global.requestAnimationFrame=f=>{const id=nextRaf++;rafs.set(id,f);return id;};global.cancelAnimationFrame=id=>rafs.delete(id);global.ResizeObserver=class{observe(){}disconnect(){}};global.MutationObserver=class{observe(){}disconnect(){}};
global.localStorage={getItem(){return null;},setItem(){}};
const colors={'--background':'#ffffff','--foreground':'#253043','--muted':'#e9edf1','--muted-foreground':'#697789','--border':'#bdc5cf','--viz-series-1':'#2176b3','--viz-series-2':'#aa5e1d','--viz-series-3':'#287d60','--viz-series-4':'#8255ac','--viz-series-5':'#a34673','--viz-series-6':'#777020'};
global.getComputedStyle=e=>({color:colors[(e.style.color||'').replace('var(','').replace(')','')]||'#253043'});
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
new Function(scripts.at(-1)[1].replace(/\}\)\(\);\s*$/,'globalThis.UQA={state,runs,areas,legacyCases,region,country,sites,resize,renderSelection,snapshot};})();'))();
function select(id,value){const e=elements.get('ul-'+id);e.value=value;e.fire('change');}
function image(name){const source=elements.get('ul-map').surface,c=createCanvas(source.width,source.height),ctx=c.getContext('2d');ctx.fillStyle=colors['--background'];ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);fs.writeFileSync(base+'/'+name+'.png',c.toBuffer('image/png'));}
for(const area of ['network','cw','middle','lower','talat','TH-90']){select('area',area);image('qa-'+area);assert.equal(UQA.state.area,area);}
select('area','network');select('method','outlet');assert(elements.get('ul-selected').textContent.includes('F'),'Missing receiver warning');select('method','adaptive');assert(elements.get('ul-selected').textContent.includes(english?'No worsening':'ไม่พบ'),'No-worsening state');
for(const c of UQA.legacyCases){select('layer',c.layer);select('case',c.id);assert.equal(UQA.state.case,c.id);assert(!elements.get('ul-legacy').hidden);console.log('Mounted',c.id);}
select('layer','water');select('case','network');viewport=320;UQA.resize();image('qa-mobile');select('area','cw');image('qa-mobile-cw');
select('area','network');for(const minute of [0,10,100,718,720]){const e=elements.get('ul-time');e.value=minute;e.fire('input');assert.equal(elements.get('ul-current').textContent,minute.toFixed(1));}
elements.get('ul-play').fire('click');const id=[...rafs.keys()].at(-1);rafs.get(id)(0);const id2=[...rafs.keys()].at(-1);rafs.get(id2)(1000);assert.equal(elements.get('ul-current').textContent,'10.0');elements.get('ul-play').fire('click');
assert(saved.modelContent.urbanSystems);assert(Buffer.byteLength(JSON.stringify(saved))<16384,'State budget');assert(Buffer.byteLength(html)<1e6,'Inline size');
assert(fs.readFileSync(base+'/index.html','utf8').includes('./vendor/d3-7.9.0.min.js'));
console.log('PASS: 56 hydraulic scenarios, coupled receiver/tidal ledger, '+UQA.legacyCases.length+' case mounts, area/layer switching, fixed clock and saved state; offline canvas inspection at 736/320px.');
module.exports={Element,elements,setViewport(v){viewport=v;},rafs,colors,createCanvas};
