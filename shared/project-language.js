(()=>{
 const key='transportation-systems.language',script=document.currentScript,valid=v=>v==='en'||v==='th';
 const query=new URL(location.href).searchParams.get('lang');let language=valid(query)?query:'th';
 try{const saved=localStorage.getItem(key);if(valid(saved))language=saved;else localStorage.setItem(key,language);}catch{}
 const bilingual=script?.dataset.bilingual==='true',english=location.pathname.endsWith('/index.en.html');
 if(!bilingual&&english!==(language==='en')){const target=new URL(language==='en'?'index.en.html':'index.html',location.href);target.search=new URL(location.href).search;target.hash=new URL(location.href).hash;target.searchParams.set('lang',language);location.replace(target.href);return;}
 document.documentElement.lang=language;
 const stateKey='ts-language-view:'+location.pathname.replace(/index\.en\.html$/,'index.html');
 function prepare(){
  window.dispatchEvent(new Event('ts-before-language'));
  try{sessionStorage.setItem(stateKey,JSON.stringify({fields:[...document.querySelectorAll('input[id],select[id],textarea[id]')].filter(e=>!['password','file'].includes(e.type)).map(e=>({id:e.id,value:e.value,checked:e.checked,type:e.type})),detail:document.getElementById('dt-detail')?.getAttribute('aria-pressed')==='true',scroll:window.scrollY}));}catch{}
  for(const f of document.querySelectorAll('iframe'))try{if(f.contentWindow.location.origin===location.origin)f.contentWindow.ProjectLanguage?.prepare();}catch{}
 }
 function set(next){
  if(!valid(next)||next===language)return;
  if(window.self!==window.top){try{if(window.top.location.origin===location.origin&&window.top.ProjectLanguage){window.top.ProjectLanguage.set(next);return;}}catch{}}
  prepare();try{localStorage.setItem(key,next);}catch{}
  const target=new URL(location.href);if(!bilingual)target.pathname=target.pathname.replace(/index(?:\.en)?\.html$/,next==='en'?'index.en.html':'index.html');target.searchParams.set('lang',next);location.assign(target.href);
 }
 globalThis.ProjectLanguage={get language(){return language;},set,prepare};
 function addNavigation(){
  const embedded=window.self!==window.top,nav=document.createElement('nav');nav.className='ts-project-navigation'+(embedded?' ts-embedded':'');nav.setAttribute('aria-label',language==='en'?'Project navigation and language':'เมนูโปรเจคและภาษา');
  if(!embedded){const home=document.createElement('a');home.textContent=language==='en'?'← Transportation Systems':'← กลับหน้าหลัก';home.href=new URL('../index.html?lang='+language,location.href).href;nav.append(home);}
  const group=document.createElement('div');group.className='ts-language-buttons';group.setAttribute('role','group');group.setAttribute('aria-label',language==='en'?'Page language':'ภาษาของหน้า');
  for(const code of ['th','en']){const button=document.createElement('button');button.type='button';button.lang=code;button.textContent=code.toUpperCase();button.setAttribute('aria-label',code==='th'?'ภาษาไทย':'English');button.setAttribute('aria-pressed',String(code===language));button.addEventListener('click',()=>set(code));group.append(button);}nav.append(group);document.body.prepend(nav);
  let saved;try{saved=JSON.parse(sessionStorage.getItem(stateKey));sessionStorage.removeItem(stateKey);}catch{}
  if(saved){for(const item of saved.fields||[]){const e=document.getElementById(item.id);if(!e||!['INPUT','SELECT','TEXTAREA'].includes(e.tagName))continue;const check=['checkbox','radio'].includes(e.type),value=check?item.checked:item.value;if(check?e.checked===value:e.value===value)continue;if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===value))continue;if(check)e.checked=!!value;else e.value=String(value);e.dispatchEvent(new Event(check?'change':e.type==='range'?'input':'change',{bubbles:true}));if(e.type==='range')e.dispatchEvent(new Event('change',{bubbles:true}));}
   if(saved.detail)document.getElementById('dt-detail')?.click();requestAnimationFrame(()=>window.scrollTo(0,Number(saved.scroll)||0));}
 }
 const style=document.createElement('style');style.textContent='.ts-project-navigation{box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 16px;min-height:56px;padding:6px 20px;background:rgba(245,250,248,.96);color:#244c43;border-bottom:1px solid #d8e5df;font:12px/1.5 system-ui,sans-serif}.ts-project-navigation a{color:inherit;text-decoration:none;padding:4px 0}.ts-project-navigation a:focus-visible,.ts-language-buttons button:focus-visible{outline:2px solid #26775c;outline-offset:3px}.ts-language-buttons{display:flex;gap:3px;margin-left:auto}.ts-language-buttons button{font:600 12px system-ui;min-width:44px;min-height:44px;border:1px solid #bdcec7;border-radius:22px;color:#244c43;background:transparent;cursor:pointer}.ts-language-buttons button[aria-pressed=true]{background:#244c43;color:#fff}.ts-embedded{min-height:48px;padding:2px 8px}.ts-embedded .ts-language-buttons button{min-height:44px}@media(min-width:981px){body[data-mode]>.app{height:calc(100dvh - 56px)}}';document.head.append(style);
 document.addEventListener('DOMContentLoaded',addNavigation,{once:true});
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;try{const saved=localStorage.getItem(key);if(valid(saved)&&saved!==language)location.reload();}catch{}});
 window.addEventListener('storage',event=>{if(event.key===key&&valid(event.newValue)&&event.newValue!==language)set(event.newValue);});
})();
