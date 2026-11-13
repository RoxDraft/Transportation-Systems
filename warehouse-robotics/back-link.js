(()=>{
 if(window.self!==window.top||location.search.includes('embed'))return;
 let lang='th';
 try{const q=new URL(location.href).searchParams.get('lang'),s=localStorage.getItem('transportation-systems.language');lang=[q,s].find(v=>v==='en'||v==='th')||'th';}catch{}
 function add(){
  if(document.getElementById('wr-back'))return;
  const a=document.createElement('a');a.id='wr-back';a.href='index.html?lang='+lang;
  a.textContent=lang==='en'?'← Warehouse Robotics':'← กลับ Warehouse Robotics';
  a.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;box-sizing:border-box;display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;border:1px solid #527c70;border-radius:12px;background:#244c43;color:#fff;font:650 14px/1.4 system-ui,sans-serif;text-decoration:none;box-shadow:0 3px 9px rgba(0,0,0,.25)';
  a.addEventListener('focus',()=>a.style.outline='3px solid #f8fffb');a.addEventListener('blur',()=>a.style.outline='');
  document.body.append(a);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
