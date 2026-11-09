const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.resolve(__dirname,'..'),code=fs.readFileSync(root+'/shared/project-language.js','utf8');
function navigate(href,{saved,blocked=false,bilingual=false}={}){
 const url=new URL(href),events={},nav=[],head=[],state={};
 const element=()=>({dataset:{},children:[],setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes);}});
 const window={addEventListener(k,f){events[k]=f;}};window.self=window;window.top=window;
 const document={currentScript:{dataset:{bilingual:String(bilingual)}},documentElement:{lang:'th'},createElement:element,head:{append(v){head.push(v);}},body:{prepend(v){nav.push(v);}},addEventListener(k,f){events[k]=f;}};
 const location={href:url.href,pathname:url.pathname,replace(v){state.redirect=v;},reload(){state.reloaded=true;}};
 const localStorage={getItem(){if(blocked)throw Error('denied');return saved||null;},setItem(k,v){if(blocked)throw Error('denied');state.saved=v;}};
 vm.runInNewContext(code,{document,window,location,localStorage,URL});return {state,events,nav,document};
}
for(const folder of ['Autonomous%20E-Bus%20Model','urban-systems-lab']){
 const base='https://roxdraft.github.io/Transportation-Systems/'+folder+'/';
 let p=navigate(base+'index.html',{saved:'en'});assert.equal(p.state.redirect,base+'index.en.html?lang=en');
 p=navigate(base+'index.en.html?lang=th',{saved:'en'});assert.equal(p.state.redirect,undefined);assert.equal(p.document.documentElement.lang,'en');p.events.DOMContentLoaded();assert(p.nav[0].children[0].href.endsWith('/Transportation-Systems/index.html?lang=en'));
 p=navigate(base+'index.en.html',{saved:'th'});assert.equal(p.state.redirect,base+'index.html?lang=th');
 p=navigate(base+'index.html?lang=en',{blocked:true});assert.equal(p.state.redirect,base+'index.en.html?lang=en');
 p=navigate(base+'index.html?lang=invalid',{saved:'invalid'});assert.equal(p.document.documentElement.lang,'th');assert.equal(p.state.redirect,undefined);
 p=navigate(base+'day-3d.html?lang=en',{bilingual:true,blocked:true});assert.equal(p.state.redirect,undefined);assert.equal(p.document.documentElement.lang,'en');
}
{const base='https://roxdraft.github.io/Transportation-Systems/safety-board/';let p=navigate(base+'index.html?lang=en',{bilingual:true,saved:'en'});assert.equal(p.state.redirect,undefined);assert.equal(p.document.documentElement.lang,'en');p.events.DOMContentLoaded();assert(p.nav[0].children[0].href.endsWith('/Transportation-Systems/index.html?lang=en'));p=navigate(base+'index.html',{bilingual:true,saved:'th'});assert.equal(p.state.redirect,undefined);assert.equal(p.document.documentElement.lang,'th');}
{const base='https://roxdraft.github.io/Transportation-Systems/safety-board/';const p=navigate(base+'simulator.html?lang=en',{bilingual:true,blocked:true});assert.equal(p.state.redirect,undefined);assert.equal(p.document.documentElement.lang,'en');}
console.log('PASS: both project routes inherit language, preserve it in home links, prefer saved language over stale history parameters, handle blocked storage and invalid values, and localize the bilingual 3D view without redirect loops.');
