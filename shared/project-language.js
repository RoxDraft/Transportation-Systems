(()=>{
 const key='transportation-systems.language',script=document.currentScript;
 const valid=v=>v==='en'||v==='th';
 const query=new URL(location.href).searchParams.get('lang');
 let language=valid(query)?query:'th';
 try{const saved=localStorage.getItem(key);if(valid(saved))language=saved;else localStorage.setItem(key,language);}catch{}
 const bilingual=script?.dataset.bilingual==='true',english=location.pathname.endsWith('/index.en.html');
 if(!bilingual&&english!==(language==='en')){
  const target=new URL(language==='en'?'index.en.html':'index.html',location.href);target.searchParams.set('lang',language);location.replace(target.href);return;
 }
 document.documentElement.lang=language;
 function addNavigation(){
  if(window.self!==window.top)return;
  const nav=document.createElement('nav');nav.className='ts-project-navigation';nav.setAttribute('aria-label',language==='en'?'Project navigation':'เมนูโปรเจค');
  const home=document.createElement('a');home.textContent=language==='en'?'← Transportation Systems':'← กลับหน้าหลัก';
  home.href=new URL('../index.html?lang='+language,location.href).href;
  const label=document.createElement('span');label.textContent=language==='en'?'EN · Choose language on the homepage':'TH · เลือกภาษาที่หน้าหลัก';
  nav.append(home,label);document.body.prepend(nav);
 }
 const style=document.createElement('style');style.textContent='.ts-project-navigation{box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 16px;min-height:52px;padding:10px 20px;background:rgba(245,250,248,.94);color:#244c43;border-bottom:1px solid #d8e5df;font:12px/1.5 system-ui,sans-serif}.ts-project-navigation a{color:inherit;text-decoration:none;padding:4px 0}.ts-project-navigation a:focus-visible{outline:2px solid #26775c;outline-offset:4px}.ts-project-navigation span{font-size:11px}@media(min-width:981px){body[data-mode]>.app{height:calc(100dvh - 52px)}}';document.head.append(style);
 document.addEventListener('DOMContentLoaded',addNavigation,{once:true});
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;try{const saved=localStorage.getItem(key);if(valid(saved)&&saved!==language)location.reload();}catch{}});
})();
