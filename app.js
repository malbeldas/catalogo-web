/* Catálogo web de marca blanca: productos, precios visibles u ocultos y pedidos por WhatsApp.
   Cada negocio es un JSON en tiendas/ (o "propia": la arma el vendedor en el momento, se guarda en este celular).
   tienda.html?t=<id>&demo=1 muestra la barra de demostración. */
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const DEMO=Q.get('demo')!=='0';
const EJEMPLOS=[['pueyrredon','Mayorista'],['pled','Minorista'],['propia','Tu cliente']];
const SW=['#06518b','#111c2e','#0f766e','#b91c1c','#7c3aed','#c2410c','#1f2937','#be185d'];
let T=null,cart={},cat='Todo',showPrices=false;

const money=n=>'$'+Math.round(n).toLocaleString('es-AR');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
let tt;function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),2200)}

/* ---------- Carga del negocio ---------- */
const PROPIA_BASE={id:'propia',nombre:'',bajada:'',tipo:'Minorista',logo:'',color:'#0f766e',precios:true,
  categorias:[],productos:[]};
async function load(id){
  if(id==='propia'){
    const saved=ls.get('mostrador_propia',null);
    T=Object.assign({},PROPIA_BASE,saved||{});
  }else{
    const r=await fetch('tiendas/'+id+'.json');T=await r.json();
  }
  T.colorOrig=T.colorOrig||T.color;
  showPrices=!!T.precios;cart={};cat='Todo';
  theme(T.color);render();
}
function lum(h){const n=parseInt(h.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function theme(c){const r=document.documentElement.style;r.setProperty('--brand',c);r.setProperty('--on-brand',lum(c)>.45?'#111':'#fff');
  r.setProperty('--brand-soft',c+'14');document.querySelector('meta[name=theme-color]').content='#ffffff'}

/* ---------- Catálogo ---------- */
const wideLogo=()=>!!T.logo&&!T.logoCuadrado;
function logoHTML(cls){
  if(T.logo&&!(cls==='av'&&wideLogo()))return `<img class="${cls||''}${T.logoCuadrado?' sq':''}" src="${esc(T.logo)}" alt="">`;
  const ini=(T.nombre||'Tu negocio').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return `<span class="mono">${esc(ini)}</span>`;
}
function render(){
  document.title=(T.nombre||'Tu negocio')+' · Catálogo';
  $('stLogo').innerHTML=logoHTML();$('stLogo').classList.toggle('wide',wideLogo());$('stName').classList.toggle('vh',wideLogo());
  $('stName').textContent=T.nombre||'Tu negocio';$('stSub').textContent=T.bajada||'Agregá productos desde Funciones';
  $('stTags').innerHTML=`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z"/></svg>Pedidos por WhatsApp</span>`+
    (T.tipo?`<span>${esc(T.tipo)}</span>`:'')+(showPrices?'':'<span>Precios a consultar</span>');
  const cats=['Todo',...(T.categorias||[])].filter(c=>c==='Todo'||T.productos.some(p=>p.cat===c));
  $('cats').innerHTML=cats.length>2?cats.map(c=>`<button type="button" class="${c===cat?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join(''):'';
  grid();cartUI();demoUI();
}
$('cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;render();window.scrollTo({top:$('tools').offsetTop-40,behavior:'smooth'})};
$('q').oninput=()=>grid();
function grid(){
  const q=$('q').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const list=T.productos.filter(p=>(cat==='Todo'||p.cat===cat)&&(!q||(p.n+' '+(p.d||'')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(q)));
  $('grid').innerHTML=list.map(card).join('');
  const em=$('empty');em.hidden=!!list.length;
  em.innerHTML=T.productos.length?'No encontramos productos con esa búsqueda.':(T.id==='propia'?'<b>Todavía no hay productos.</b><br>Sacales una foto a 3 o 4 productos del cliente y armá su catálogo en un minuto.<br><button class="b b-brand" type="button" onclick="openEdit()">Armar catálogo</button>':'');
}
function priceHTML(p){
  if(!showPrices)return '<span class="ask">Consultá el precio</span>';
  if(p.p==null||p.p==='')return '<span class="ask">Consultar</span>';
  return `<span class="pr">${money(p.p)}</span>`+(p.antes?`<s>${money(p.antes)}</s>`:'');
}
function card(p){
  const q=cart[p.id]||0;
  return `<article class="pc" data-id="${esc(p.id)}">
    <div class="ph">${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy">`:''}${p.antes&&showPrices?`<em>-${Math.round(100-100*p.p/p.antes)}%</em>`:''}</div>
    <div class="pb"><h3>${esc(p.n)}</h3>${p.d?`<p>${esc(p.d)}</p>`:''}<div class="prow">${priceHTML(p)}</div>
    ${q?`<div class="step"><button type="button" data-a="-" aria-label="Quitar uno">−</button><b>${q}</b><button type="button" data-a="+" aria-label="Sumar uno">+</button></div>`
      :`<button class="add" type="button" data-a="+">${showPrices?'Agregar':'Consultar'}</button>`}</div></article>`;
}
$('grid').onclick=e=>{const b=e.target.closest('button[data-a]');if(!b)return;const id=b.closest('.pc').dataset.id;
  change(id,b.dataset.a==='+'?1:-1)};
function change(id,d){cart[id]=Math.max(0,(cart[id]||0)+d);if(!cart[id])delete cart[id];
  const el=document.querySelector(`.pc[data-id="${CSS.escape(id)}"]`),p=T.productos.find(x=>x.id===id);
  if(el&&p)el.outerHTML=card(p);cartUI();if(!$('shCart').hidden)lines()}

/* ---------- Pedido ---------- */
function cartItems(){return Object.entries(cart).map(([id,q])=>({p:T.productos.find(x=>x.id===id),q})).filter(x=>x.p)}
function total(){return cartItems().reduce((s,{p,q})=>s+(showPrices&&p.p?p.p*q:0),0)}
function cartUI(){
  const it=cartItems(),n=it.reduce((s,x)=>s+x.q,0);$('cartbar').hidden=!n;
  $('cbN').textContent=n;$('cbLbl').textContent=showPrices?'Ver mi pedido':'Ver mi consulta';
  $('cbTot').textContent=showPrices&&total()?money(total()):'';
}
function lines(){
  const it=cartItems();
  $('cartH').textContent=showPrices?'Tu pedido':'Tu consulta';
  $('lines').innerHTML=it.map(({p,q})=>`<li data-id="${esc(p.id)}">${p.img?`<img src="${esc(p.img)}" alt="">`:'<span class="ph0"></span>'}<span class="ln"><b>${esc(p.n)}</b>${showPrices&&p.p?`<small>${money(p.p)} c/u</small>`:''}</span>
    <span class="step sm"><button type="button" data-a="-">−</button><b>${q}</b><button type="button" data-a="+">+</button></span></li>`).join('');
  const t=total();$('tot').innerHTML=showPrices&&t?`<span>Total estimado</span><b>${money(t)}</b>`:'';$('tot').hidden=!(showPrices&&t);
  $('sendLbl').textContent=showPrices?'Enviar pedido por WhatsApp':'Consultar precios por WhatsApp';
  if(!it.length)close();
}
$('lines').onclick=e=>{const b=e.target.closest('button[data-a]');if(b)change(b.closest('li').dataset.id,b.dataset.a==='+'?1:-1)};
$('cartbar').onclick=()=>{lines();open('shCart')};
function orderMsg(){
  const it=cartItems(),who=$('cName').value.trim();
  return [`Hola ${T.nombre||''}! ${showPrices?'Quiero hacer este pedido':'Quiero consultar precio de'}:`,
    ...it.map(({p,q})=>`• ${q} × ${p.n}${showPrices&&p.p?` (${money(p.p*q)})`:''}`),
    showPrices&&total()?`Total estimado: ${money(total())}`:'',who?`Soy ${who}.`:''].filter(Boolean).join('\n');
}
$('sendOrder').onclick=()=>sendWA(orderMsg());
function sendWA(msg){
  if(DEMO||!T.wa){chat(msg);return}
  location.href='https://wa.me/'+T.wa+'?text='+encodeURIComponent(msg);
}
function chat(msg){
  $('chAv').innerHTML=logoHTML('av');$('chName').textContent=T.nombre||'Tu negocio';
  const h=new Date();$('bub').innerHTML=esc(msg).replace(/\n/g,'<br>')+`<small>${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}</small>`;
  open('shChat');
}

/* ---------- Hojas ---------- */
function open(id){document.querySelectorAll('.sheet').forEach(s=>s.hidden=s.id!==id);$('scrim').hidden=false;document.body.classList.add('lock')}
function close(){document.querySelectorAll('.sheet').forEach(s=>s.hidden=true);$('scrim').hidden=true;document.body.classList.remove('lock')}
$('scrim').onclick=close;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

/* ---------- Demo ---------- */
function demoUI(){
  if(!DEMO)return;
  $('demobar').hidden=false;document.body.classList.add('has-demo');
  $('demoEx').innerHTML=EJEMPLOS.map(([id,l])=>`<button type="button" role="tab" aria-selected="${T.id===id}" data-t="${id}">${l}</button>`).join('');
  const has=T.productos.some(p=>p.p!=null&&p.p!=='');
  $('fxPrice').setAttribute('aria-checked',showPrices);$('fxPrice').disabled=!has&&T.id!=='propia';
  $('fxPriceHint').textContent=has||T.id==='propia'?'Cada negocio elige si los muestra':'Este ejemplo es mayorista: muestra el catálogo y el cliente consulta';
  $('sws').innerHTML=[T.colorOrig,...SW.filter(c=>c!==T.colorOrig)].slice(0,8).map(c=>`<button type="button" style="--c:${c}" aria-label="Color ${c}" aria-pressed="${c===T.color}" data-c="${c}"></button>`).join('');
  $('fxEdit').hidden=T.id!=='propia';
}
$('demoEx').onclick=e=>{const b=e.target.closest('button');if(!b)return;const u=new URL(location.href);u.searchParams.set('t',b.dataset.t);
  history.replaceState(null,'',u);load(b.dataset.t).then(()=>{if(b.dataset.t==='propia'&&!T.productos.length)openEdit()})};
$('demoFx').onclick=()=>open('shFx');
$('fxPrice').onclick=()=>{showPrices=!showPrices;render();$('fxPrice').setAttribute('aria-checked',showPrices);toast(showPrices?'Precios visibles':'Precios ocultos: el cliente consulta por WhatsApp')};
$('sws').onclick=e=>{const b=e.target.closest('button');if(!b)return;T.color=b.dataset.c;theme(T.color);demoUI();if(T.id==='propia')saveP()};
$('fxOrder').onclick=()=>{close();if(location.hash){location.hash=''}
  if(!Object.keys(cart).length)T.productos.slice(0,3).forEach((p,i)=>cart[p.id]=i?1:2);grid();cartUI();
  if(!Object.keys(cart).length){toast('Primero cargá algún producto');return}
  setTimeout(()=>{lines();open('shCart')},150)};
$('fxEdit').onclick=()=>openEdit();

/* ---------- Armar el negocio del cliente ---------- */
function saveP(){const {colorOrig,...s}=T;if(!ls.set('mostrador_propia',s))toast('No hay más lugar en este celular: quitá algún producto')}
function shrink(file,max){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
  c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.8))};im.onerror=ko;im.src=u})}
function openEdit(){$('eName').value=T.nombre||'';$('eSub').value=T.bajada||'';eProds();open('shEdit')}
window.openEdit=openEdit;
function eProds(){
  $('eProds').innerHTML=T.productos.map((p,i)=>`<div class="ep" data-i="${i}"><img src="${esc(p.img)}" alt=""><div><input data-f="n" value="${esc(p.n)}" placeholder="Nombre del producto" maxlength="50"><input data-f="p" value="${p.p??''}" inputmode="numeric" placeholder="Precio (opcional)"></div><button type="button" class="x" aria-label="Quitar">✕</button></div>`).join('');
  $('eLogoLbl').textContent=T.logo?'Cambiar logo':'Elegir foto del logo';
}
$('eProds').oninput=e=>{const i=+e.target.closest('.ep').dataset.i,f=e.target.dataset.f,v=e.target.value;
  if(f==='p'){const n=parseInt(v.replace(/\D/g,''),10);T.productos[i].p=isNaN(n)?null:n}else T.productos[i].n=v;saveP()};
$('eProds').onclick=e=>{if(!e.target.closest('.x'))return;T.productos.splice(+e.target.closest('.ep').dataset.i,1);saveP();eProds()};
$('eAdd').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const img=await shrink(f,520);T.productos.push({id:'p'+Date.now(),n:'',img,p:null});saveP();eProds();
    const last=$('eProds').lastElementChild;last&&last.querySelector('input').focus()}catch(err){toast('No se pudo abrir esa foto')}};
$('eLogo').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{T.logo=await shrink(f,300);T.logoCuadrado=true;saveP();eProds();render()}catch(err){toast('No se pudo abrir esa foto')}};
$('eName').oninput=()=>{T.nombre=$('eName').value;saveP()};$('eSub').oninput=()=>{T.bajada=$('eSub').value;saveP()};
$('eDone').onclick=()=>{T.productos.forEach((p,i)=>{if(!p.n)p.n='Producto '+(i+1)});showPrices=T.productos.some(p=>p.p);T.precios=showPrices;saveP();close();render()};
$('eReset').onclick=()=>{try{localStorage.removeItem('mostrador_propia')}catch(e){}T=Object.assign({},PROPIA_BASE,{colorOrig:PROPIA_BASE.color,productos:[]});theme(T.color);render();openEdit()};

load(EJEMPLOS.some(([id])=>id===Q.get('t'))?Q.get('t'):'pueyrredon').then(()=>{if(DEMO&&T.id==='propia'&&!T.productos.length)openEdit()});
