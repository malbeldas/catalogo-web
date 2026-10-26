/* Catálogo web de marca blanca: productos, precios visibles u ocultos y pedidos por WhatsApp.
   En la base, cada ejemplo es un JSON en tiendas/ y se elige con t=<id>; tienda.html lista cuáles hay en data-ejemplos.
   En el repo de un cliente, la página dice cuál es su JSON con <html data-tienda="tienda.json"> (UC-021):
   la URL no puede cambiar de comercio ni abrir la demo.
   Si el JSON trae planilla.web, los productos salen de la pestaña Web publicada como CSV (UC-010),
   y con planilla.ajustes el WhatsApp, el nombre, la bajada y los precios salen de la pestaña Ajustes (UC-011).
   Si una pestaña no responde o no es válida, se usa esa parte de catalogo-respaldo.json (AC-010-4).
   Con demo=1 se carga además la demo (demo.js): ejemplos, Funciones y "Tu cliente".
   La lógica pura (búsqueda, categorías, formatos) vive en datos.js. */
import { esc, money, sinAcentos, categorias, mostrarBarraCategorias, buscar, lote, totalPedido, mensajePedido, linkWhatsApp, productosDesdeCSV, ajustesDesdeCSV, aplicarAjustes, esPestana } from './datos.js';

const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const CLIENTE=document.documentElement.dataset.tienda||''; // repo de un cliente: un solo comercio
const DEMO=!CLIENTE&&Q.get('demo')==='1'; // la demo se pide a propósito (AC-020-1); un comprador nunca la ve
const EJEMPLOS=(document.documentElement.dataset.ejemplos||'').split(' ').filter(Boolean); // solo en la base: el núcleo no nombra ninguna marca
let T=null,cart={},cat='Todo',showPrices=false,lista=[],mostrados=0;

const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
let tt;function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),2200)}

/* ---------- Carga del negocio ---------- */
let demo=null;
async function load(id){
  if(id==='propia'&&demo){
    T=demo.tiendaPropia();
  }else{
    const r=await fetch(CLIENTE||'tiendas/'+id+'.json');T=await r.json();
    // Las dos pestañas se piden a la vez para no demorar la primera pantalla.
    const pl=T.planilla||{},[web,ajustes]=await Promise.all([leerPestana(pl.web),leerPestana(pl.ajustes)]);
    // El respaldo se pide solo si alguna pestaña falló, y una sola vez; el comprador no ve ningún aviso.
    let respaldo;const deRespaldo=()=>respaldo??=leerRespaldo();
    if(pl.web){
      const prods=esPestana(web,'nombre')?productosDesdeCSV(web):[];
      T.productos=prods.length?prods:(await deRespaldo())?.productos||[];
      T.sinCatalogo=!T.productos.length;
    }
    const aj=esPestana(ajustes,'ajuste')?ajustesDesdeCSV(ajustes):pl.ajustes?(await deRespaldo())?.ajustes||{}:{};
    T=aplicarAjustes(T,aj);
  }
  T.productos=T.productos||[];
  T.colorOrig=T.colorOrig||T.color;
  showPrices=!!T.precios;cart={};cat=categoriaPedida();$('q').value=Q.get('q')||'';
  theme(T.color);render();
  if(cat!=='Todo')$('cats').querySelector('.on')?.scrollIntoView({inline:'center',block:'nearest'});
  if(!DEMO)medir(T.ga4);
}
// Con cat=<categoría> o q=<búsqueda> en la URL el catálogo abre filtrado, para enlazar un rubro o un producto desde otra página (UC-001).
function categoriaPedida(){
  const q=sinAcentos(Q.get('cat')||'').trim();
  return categorias(T.productos).find(c=>sinAcentos(c).trim()===q)||'Todo';
}
// GA4 opcional por cliente (SPEC.md §3, regla hard 6). Solo se cuentan visitas y pedidos enviados: nunca el nombre ni el mensaje (regla hard 5).
let gtag=()=>{};
function medir(id){
  if(!/^G-[A-Z0-9]+$/.test(id||''))return;
  window.dataLayer=window.dataLayer||[];gtag=function(){dataLayer.push(arguments)};
  gtag('js',new Date());gtag('config',id);
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(s);
}
// Sin caché del navegador: un cambio en la planilla se ve al recargar (AC-010-1). Si una pestaña no responde da null.
async function leerPestana(url){
  if(!url)return null;
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.text()}
  catch(e){return null}
}
// Última copia buena de la planilla, que guarda la tarea programada respaldo (SPEC.md §3); null si no hay.
async function leerRespaldo(){
  try{const r=await fetch('catalogo-respaldo.json',{cache:'no-store'});return r.ok?await r.json():null}
  catch(e){return null}
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
const ICONO_WA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z"/><path d="M9 9.5c.4 2 1.6 3.4 3.6 4.4"/></svg>';
const sinWhatsApp=()=>!DEMO&&!linkWhatsApp(T.wa,'');
function render(){
  document.title=(T.nombre||'Tu negocio')+' · Catálogo';
  $('stLogo').innerHTML=logoHTML();$('stLogo').classList.toggle('wide',wideLogo());$('stName').classList.toggle('vh',wideLogo());
  $('stName').textContent=T.nombre||'Tu negocio';$('stSub').textContent=T.bajada||'Agregá productos desde Funciones';
  $('stTags').innerHTML=(sinWhatsApp()?'':`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z"/></svg>Pedidos por WhatsApp</span>`)+
    (T.tipo?`<span>${esc(T.tipo)}</span>`:'')+(showPrices?'':'<span>Precios a consultar</span>');
  const cs=categorias(T.productos),cats=['Todo',...cs];
  $('cats').innerHTML=mostrarBarraCategorias(cs)?cats.map(c=>`<button type="button" class="${c===cat?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join(''):'';
  grid();cartUI();demo?.alRenderizar();
}
$('cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;render();window.scrollTo({top:$('tools').offsetTop-40,behavior:'smooth'})};
$('q').oninput=()=>grid();
function grid(){
  // Sin planilla ni respaldo: en lugar de un buscador y una grilla vacíos, un mensaje y WhatsApp directo (SPEC.md §5).
  $('tools').hidden=!!T.sinCatalogo;
  if(T.sinCatalogo){
    const url=linkWhatsApp(T.wa,'Hola, quiero hacer una consulta.');
    $('grid').innerHTML='';$('mas').hidden=true;$('empty').hidden=false;
    $('empty').innerHTML='<b>Estamos actualizando el catálogo</b><br>Escribinos y te pasamos lo que necesites.'+
      (url?`<br><a class="b b-wa" id="waDirecto" href="${esc(url)}">${ICONO_WA}Escribir por WhatsApp</a>`:'');
    return;
  }
  lista=buscar(T.productos,$('q').value,cat==='Todo'?null:cat);mostrados=0;
  $('grid').innerHTML='';masProductos();
  const em=$('empty');em.hidden=!!lista.length;
  em.innerHTML=T.productos.length?'No encontramos productos con esa búsqueda.':(demo?.vacio()||'');
}
/* Catálogos grandes: se dibuja de a una tanda y se suma otra cuando el final de la grilla se acerca a la pantalla.
   Volver a observar el marcador hace que el navegador avise de nuevo si sigue cerca, sin medir la página a mano. */
const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))masProductos()},{rootMargin:'0px 0px 600px 0px'});
function masProductos(){
  const sig=lote(lista,mostrados);
  if(sig.length){$('grid').insertAdjacentHTML('beforeend',sig.map(card).join(''));mostrados+=sig.length}
  $('mas').hidden=mostrados>=lista.length;
  io.unobserve($('mas'));if(!$('mas').hidden)io.observe($('mas'));
}
function priceHTML(p){
  if(!showPrices)return '<span class="ask">Consultá el precio</span>';
  if(p.p==null||p.p==='')return '<span class="ask">Consultar</span>';
  return `<span class="pr">${money(p.p)}</span>`+(p.antes?`<s>${money(p.antes)}</s>`:'');
}
// Sin foto, o con la foto rota o privada, queda a la vista un recuadro con la inicial (SPEC.md §5).
const inicial=p=>(Array.from(String(p.n||'').trim())[0]||'').toUpperCase();
document.addEventListener('error',e=>{const im=e.target;if(im.tagName!=='IMG')return;
  if(im.closest('.ph'))im.remove();else if(im.closest('#lines'))im.outerHTML='<span class="ph0"></span>'},true);
function card(p){
  const q=cart[p.id]||0;
  return `<article class="pc" data-id="${esc(p.id)}">
    <div class="ph"><span class="ini" aria-hidden="true">${esc(inicial(p))}</span>${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy">`:''}${p.antes&&showPrices?`<em>-${Math.round(100-100*p.p/p.antes)}%</em>`:''}</div>
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
function total(){return totalPedido(cartItems(),showPrices)}
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
  // Sin número no hay a dónde mandar: el carrito sigue andando y se avisa (SPEC.md §5). En la demo se muestra el chat de ejemplo.
  const sinWa=sinWhatsApp();$('sendOrder').hidden=$('cNameFld').hidden=sinWa;$('sinWa').hidden=!sinWa;
  if(!it.length)close();
}
$('lines').onclick=e=>{const b=e.target.closest('button[data-a]');if(b)change(b.closest('li').dataset.id,b.dataset.a==='+'?1:-1)};
$('cartbar').onclick=()=>{lines();open('shCart')};
function orderMsg(){return mensajePedido(cartItems(),{comercio:T.nombre,precios:showPrices,comprador:$('cName').value})}
$('sendOrder').onclick=()=>sendWA(orderMsg());
function sendWA(msg){
  const url=linkWhatsApp(T.wa,msg);
  if(demo){demo.chat(msg);return}
  if(url){gtag('event','enviar_pedido',{productos:cartItems().length});location.href=url}
}

/* ---------- Hojas ---------- */
function open(id){document.querySelectorAll('.sheet').forEach(s=>s.hidden=s.id!==id);$('scrim').hidden=false;document.body.classList.add('lock')}
function close(){document.querySelectorAll('.sheet').forEach(s=>s.hidden=true);$('scrim').hidden=true;document.body.classList.remove('lock')}
$('scrim').onclick=close;document.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

/* ---------- Demo (solo con demo=1) ---------- */
// Lo que la demo puede leer y cambiar del catálogo. Sin demo=1, demo.js ni se descarga (AC-020-1).
const app={get T(){return T},set T(v){T=v},get precios(){return showPrices},set precios(v){showPrices=v},get cart(){return cart},
  ls,toast,open,close,theme,render,grid,cartUI,lines,logoHTML,load};
if(DEMO)demo=(await import('./demo.js')).iniciarDemo(app);

const t=Q.get('t'),ids=[...EJEMPLOS,...(demo?.ids||[])];
load(ids.includes(t)?t:EJEMPLOS[0]).then(()=>demo?.alAbrir());
